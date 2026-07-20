"""
Drives the live Microsoft Word document via pywin32 COM.

COM objects are not thread-safe across arbitrary threads -- every call here
must happen on the one thread that called pythoncom.CoInitialize(). This
module owns a single dedicated worker thread draining a queue of
(callable, Future) pairs; every public method is `async def` and bridges to
that thread with `future = Future(); queue.put((fn, future)); return await
asyncio.wrap_future(future)`. FastAPI's event loop never touches a COM
object directly and is never blocked waiting for one.

Validated against a standalone spike (scripts/word_com_spike.py) before this
was written: a Word bookmark is silently consumed by content inserted at its
collapsed point, so every append here recreates the bookmark afterward.
"""
import asyncio
import logging
import os
import queue
import shutil
import tempfile
import threading
import uuid
from concurrent.futures import Future
from pathlib import Path
from typing import Callable

logger = logging.getLogger(__name__)

WD_FORMAT_XML_DOCUMENT = 12  # .docx
WD_FORMAT_FILTERED_HTML = 8
WD_EXPORT_FORMAT_PDF = 17
WD_ALERTS_NONE = 0
WD_STORY = 6            # Unit for EndKey -- jump to end of document
WD_COLLAPSE_END = 0
WD_CHARACTER = 1        # Unit for MoveEnd/MoveStart -- one character

_SHUTDOWN = object()


class WordNotRunningError(RuntimeError):
    pass


class WordAutomation:
    def __init__(self) -> None:
        self._queue: "queue.Queue" = queue.Queue()
        self._thread: threading.Thread | None = None
        self._app = None
        self._doc = None
        self._alive = False
        self.current_project_id: str | None = None
        self.current_file_path: str | None = None

    # ------------------------------------------------------------- thread

    def start(self) -> None:
        if self._thread is not None:
            return
        self._thread = threading.Thread(target=self._run, daemon=True, name="word-com")
        self._thread.start()

    def stop(self) -> None:
        if self._thread is None:
            return
        self._queue.put(_SHUTDOWN)
        self._thread.join(timeout=15)
        self._thread = None

    def _run(self) -> None:
        import pythoncom
        import win32com.client as win32

        pythoncom.CoInitialize()
        try:
            self._app = win32.gencache.EnsureDispatch("Word.Application")
            self._app.Visible = True
            self._app.DisplayAlerts = WD_ALERTS_NONE
            self._alive = True
        except Exception:
            logger.exception("Failed to launch Word")
            self._alive = False

        while True:
            item = self._queue.get()
            if item is _SHUTDOWN:
                break
            fn, future = item
            if future.cancelled():
                continue
            try:
                result = fn()
                future.set_result(result)
            except Exception as exc:  # noqa: BLE001 -- surfaced to the caller via the future
                logger.exception("Word COM operation failed")
                self._alive = False
                future.set_exception(exc)

        try:
            if self._doc is not None:
                self._doc.Close(SaveChanges=False)
            if self._app is not None:
                self._app.Quit(SaveChanges=False)
        except Exception:
            logger.exception("Error shutting down Word")
        finally:
            self._alive = False
            pythoncom.CoUninitialize()

    def _submit(self, fn: Callable[[], object]) -> Future:
        future: Future = Future()
        self._queue.put((fn, future))
        return future

    async def _run_async(self, fn: Callable[[], object]):
        if self._thread is None:
            raise WordNotRunningError("Word automation worker thread is not running")
        future = self._submit(fn)
        return await asyncio.wrap_future(future)

    # -------------------------------------------------------------- state

    def is_alive(self) -> bool:
        return self._alive

    @staticmethod
    def _set_bookmark(doc, name: str, range_) -> None:
        # Bookmarks.Add() on an existing name redefines its range in place --
        # this is exactly the "recreate after insert" step the spike validated.
        doc.Bookmarks.Add(name, range_)

    # ---------------------------------------------------------- documents

    async def create_document(self, project_id: str, title: str, file_path: str) -> None:
        def _do():
            doc = self._app.Documents.Add()
            sel = self._app.Selection
            sel.Style = doc.Styles("Title")
            sel.TypeText(title)
            sel.TypeParagraph()
            sel.Style = doc.Styles("Normal")
            doc.SaveAs2(file_path, FileFormat=WD_FORMAT_XML_DOCUMENT)
            self._doc = doc
            self.current_project_id = project_id
            self.current_file_path = file_path
            self._alive = True

        await self._run_async(_do)

    async def open_document(self, project_id: str, file_path: str) -> None:
        def _do():
            if self._doc is not None:
                try:
                    self._doc.Close(SaveChanges=False)
                except Exception:
                    logger.exception("Error closing previous document before reopen")
            doc = self._app.Documents.Open(file_path, AddToRecentFiles=False)
            self._doc = doc
            self.current_project_id = project_id
            self.current_file_path = file_path
            self._alive = True

        await self._run_async(_do)

    @staticmethod
    def _write_step_at_selection(
        doc, sel, instruction: str, screenshot_path: str | None, step_number: int, bookmark_name: str
    ) -> None:
        """Types heading+instruction+image at wherever `sel` is currently
        positioned (caller decides that) and wraps the whole thing in a
        *range* bookmark (not a collapsed point) -- validated in
        scripts/word_range_bookmark_spike.py to survive delete/replace-image
        operations on this or neighboring steps without corruption."""
        start = sel.Start
        sel.Style = doc.Styles("Heading 2")
        sel.TypeText(f"Step {step_number}")
        sel.TypeParagraph()
        sel.Style = doc.Styles("Normal")
        sel.TypeText(instruction)
        sel.TypeParagraph()
        if screenshot_path:
            sel.InlineShapes.AddPicture(screenshot_path, LinkToFile=False, SaveWithDocument=True)
            sel.TypeParagraph()
        end = sel.Start
        WordAutomation._set_bookmark(doc, bookmark_name, doc.Range(start, end))

    async def append_step(
        self, instruction: str, screenshot_path: str | None, step_number: int, bookmark_name: str
    ) -> None:
        def _do():
            doc = self._doc
            sel = self._app.Selection
            sel.EndKey(Unit=WD_STORY)
            self._write_step_at_selection(doc, sel, instruction, screenshot_path, step_number, bookmark_name)
            doc.Save()

        await self._run_async(_do)

    async def insert_step_after(
        self,
        after_bookmark: str | None,
        instruction: str,
        screenshot_path: str | None,
        step_number: int,
        bookmark_name: str,
    ) -> None:
        """Insert a full new step immediately after another step's bookmark
        (used for manually adding an image at a chosen position, and for
        AI-placed voice key points) -- falls back to appending at the end
        of the document if `after_bookmark` is None or no longer resolves."""

        def _do():
            doc = self._doc
            sel = self._app.Selection
            if after_bookmark and doc.Bookmarks.Exists(after_bookmark):
                anchor = doc.Bookmarks(after_bookmark).Range
                anchor.Collapse(WD_COLLAPSE_END)
                sel.SetRange(anchor.Start, anchor.Start)
            else:
                sel.EndKey(Unit=WD_STORY)
            self._write_step_at_selection(doc, sel, instruction, screenshot_path, step_number, bookmark_name)
            doc.Save()

        await self._run_async(_do)

    async def delete_step(self, bookmark_name: str) -> None:
        """Removes a step's entire content (heading, instruction, image)
        from the live document. Neighboring steps' bookmarks are
        automatically adjusted by Word and are unaffected."""

        def _do():
            doc = self._doc
            if not doc.Bookmarks.Exists(bookmark_name):
                return
            rng = doc.Bookmarks(bookmark_name).Range
            rng.Delete()
            if doc.Bookmarks.Exists(bookmark_name):
                doc.Bookmarks(bookmark_name).Delete()
            doc.Save()

        await self._run_async(_do)

    async def replace_step_image(self, bookmark_name: str, new_image_path: str) -> None:
        """Swaps out the image inside an already-inserted step's range,
        in place, without disturbing its heading/instruction text or its
        bookmark boundaries."""

        def _do():
            doc = self._doc
            if not doc.Bookmarks.Exists(bookmark_name):
                raise ValueError(f"Step bookmark '{bookmark_name}' not found")
            rng = doc.Bookmarks(bookmark_name).Range
            if rng.InlineShapes.Count == 0:
                raise ValueError(f"Step '{bookmark_name}' has no image to replace")
            shape_range = rng.InlineShapes(1).Range
            shape_range.InlineShapes(1).Delete()
            shape_range.InlineShapes.AddPicture(new_image_path, LinkToFile=False, SaveWithDocument=True)
            doc.Save()

        await self._run_async(_do)

    async def replace_step_text(self, bookmark_name: str, new_text: str) -> None:
        """Swaps out the instruction text inside an already-inserted step's
        range, in place, without disturbing its heading, image, or bookmark
        boundaries -- mirrors replace_step_image.

        Two bookmark shapes exist depending on how the step was written:
        - a full step from _write_step_at_selection has >=2 paragraphs
          (1=heading, 2=instruction, optionally more for the image); target
          paragraph 2.
        - a voice/manual note from append_voice_note has exactly one bare
          paragraph ("Note: ..."); replace that whole paragraph, keeping the
          "Note: " prefix so it still reads the same as freshly-appended ones.
        """

        def _do():
            doc = self._doc
            if not doc.Bookmarks.Exists(bookmark_name):
                raise ValueError(f"Step bookmark '{bookmark_name}' not found")
            rng = doc.Bookmarks(bookmark_name).Range
            if rng.Paragraphs.Count >= 2:
                target_range = rng.Paragraphs(2).Range
                replacement = new_text
            else:
                target_range = rng.Paragraphs(1).Range
                replacement = f"Note: {new_text}"
            target_range.MoveEnd(WD_CHARACTER, -1)  # exclude paragraph mark
            target_range.Text = replacement
            doc.Save()

        await self._run_async(_do)

    async def append_voice_note(self, bookmark_name: str | None, text: str) -> None:
        def _do():
            doc = self._doc
            if bookmark_name and doc.Bookmarks.Exists(bookmark_name):
                target = doc.Bookmarks(bookmark_name).Range
                target.Collapse(WD_COLLAPSE_END)
            else:
                target = doc.Range(doc.Content.End - 1, doc.Content.End - 1)
            target.InsertParagraphAfter()
            target.Collapse(WD_COLLAPSE_END)
            target.Text = f"Note: {text}"
            new_end = doc.Range(target.End, target.End)
            if bookmark_name:
                self._set_bookmark(doc, bookmark_name, new_end)
            doc.Save()

        await self._run_async(_do)

    async def append_manual_note(self, text: str, bookmark_name: str | None = None) -> None:
        await self.append_voice_note(bookmark_name, text)

    async def save(self) -> None:
        await self._run_async(lambda: self._doc.Save())

    async def save_copy_as(self, fmt: str, output_path: str, source_file_path: str | None = None) -> None:
        """Export a copy of a document without touching its own file
        association -- opens a throwaway copy in the same Word Application
        instance, exports from that, then discards it.

        Defaults to the currently-open live document (source_file_path=None),
        but any project's .docx can be exported this way regardless of
        whether it's the one currently open in the single active session --
        this only needs the Word Application to be running, not that specific
        document to be the active one."""

        def _do():
            source = source_file_path or self.current_file_path
            if source == self.current_file_path and self._doc is not None:
                self._doc.Save()
            tmp_path = os.path.join(tempfile.gettempdir(), f"sop_export_{uuid.uuid4().hex}.docx")
            shutil.copy2(source, tmp_path)
            tmp_doc = self._app.Documents.Open(tmp_path, AddToRecentFiles=False)
            try:
                if fmt == "pdf":
                    tmp_doc.ExportAsFixedFormat(OutputFileName=output_path, ExportFormat=WD_EXPORT_FORMAT_PDF)
                elif fmt == "html":
                    tmp_doc.SaveAs2(output_path, FileFormat=WD_FORMAT_FILTERED_HTML)
                else:
                    raise ValueError(f"Unsupported export format for Word: {fmt}")
            finally:
                tmp_doc.Close(SaveChanges=False)
                Path(tmp_path).unlink(missing_ok=True)

        await self._run_async(_do)

    async def close(self, save: bool = True) -> None:
        def _do():
            if self._doc is not None:
                self._doc.Close(SaveChanges=save)
                self._doc = None
            self.current_project_id = None
            self.current_file_path = None

        await self._run_async(_do)


# Single dedicated instance -- one active recording session at a time,
# matching the desktop-control-panel scope for v1.
word = WordAutomation()
