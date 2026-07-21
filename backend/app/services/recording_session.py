"""
Orchestrates one active recording session: owns the ScreenMonitor, receives
its significant-frame callbacks (which fire on the monitor's own thread),
and hands each frame to Gemini analysis + Word insertion on the FastAPI
event loop.

Single active session at a time, matching the desktop-control-panel scope
for v1 (one Word COM instance, one screen monitor thread -- see the plan's
"single active recording session" decision).
"""
import asyncio
import logging
import uuid

from app import db
from app.config import SCREENSHOTS_DIR
from app.services import ai_layer
from app.services.screen_monitor import ScreenMonitor
from app.services.settings_store import get_settings
from app.services.word_automation import word

logger = logging.getLogger(__name__)


class RecordingSessionManager:
    def __init__(self) -> None:
        self._monitor: ScreenMonitor | None = None
        self._project_id: str | None = None
        self._session_id: str | None = None
        self._doc_type: str = "sop"
        self._queue: asyncio.Queue | None = None
        self._consumer_task: asyncio.Task | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._last_error: str | None = None
        self._processing = False

    async def start(self, project_id: str, doc_type: str = "sop") -> str:
        if self._monitor is not None:
            await self.stop()

        self._loop = asyncio.get_running_loop()
        self._project_id = project_id
        self._doc_type = doc_type
        self._queue = asyncio.Queue()
        self._last_error = None
        self._session_id = db.start_session(project_id)

        settings = get_settings()
        captures_dir = SCREENSHOTS_DIR / project_id
        self._monitor = ScreenMonitor(
            project_id,
            captures_dir,
            self._on_frame,
            interval_sec=settings["capture_interval_sec"],
            motion_ratio=settings["capture_motion_ratio"],
            diff_threshold=settings["capture_diff_threshold"],
            settle_sec=settings["capture_settle_sec"],
        )
        self._monitor.start()
        self._consumer_task = asyncio.create_task(self._consume())
        return self._session_id

    async def stop(self) -> None:
        if self._monitor is not None:
            self._monitor.stop()
            self._monitor = None
        if self._consumer_task is not None:
            self._consumer_task.cancel()
            self._consumer_task = None
        if self._session_id is not None:
            db.stop_session(self._session_id)
            self._session_id = None
        if self._project_id is not None:
            # Also covers the case where start() displaced us to begin a
            # different project's session -- without this, the displaced
            # project's status row stays stuck at 'active' since only the
            # explicit /stop route used to clear it.
            db.update_project_status(self._project_id, "stopped")
        self._project_id = None
        self._queue = None

    @property
    def active_project_id(self) -> str | None:
        return self._project_id

    def status(self, project_id: str) -> dict:
        is_active = self._project_id == project_id
        return {
            "recording": self._monitor is not None and is_active,
            "monitor_running": self._monitor.is_running() if self._monitor else False,
            "word_alive": word.is_alive(),
            "word_project_id": word.current_project_id,
            "pending_count": len(db.list_pending_steps(project_id)),
            "last_error": self._last_error if is_active else None,
            "processing": self._processing if is_active else False,
        }

    def _on_frame(self, path: str) -> None:
        # Called from the ScreenMonitor's own thread -- must not touch
        # asyncio primitives directly, only hand off via call_soon_threadsafe.
        if self._loop is not None and self._queue is not None:
            self._loop.call_soon_threadsafe(self._queue.put_nowait, path)

    async def _consume(self) -> None:
        while True:
            path = await self._queue.get()
            self._processing = True
            try:
                await self._handle_frame(path)
                self._last_error = None
            except Exception as exc:
                logger.exception("Failed to process captured frame %s", path)
                # Surfaced via /sessions/{id}/status rather than silently
                # dropping the frame -- a quota/API error otherwise looks
                # identical to "nothing happened" from the UI's perspective.
                self._last_error = f"AI analysis failed: {exc}"
            finally:
                self._processing = False

    async def _handle_frame(self, path: str) -> None:
        project_id = self._project_id
        session_id = self._session_id
        analysis = await asyncio.to_thread(ai_layer.analyze_screenshot, path, self._doc_type)

        if not analysis.instruction:
            # Nothing worth recording (e.g. blank/unreadable frame) -- drop it.
            return

        if analysis.has_sensitive_info:
            db.add_step(
                project_id=project_id,
                kind="screenshot_step",
                session_id=session_id,
                instruction=analysis.instruction,
                screenshot_raw_path=path,
                sensitive_flag=True,
                redaction_boxes=analysis.redaction_boxes,
                review_status="pending_review",
            )
            return

        step_number = db.count_inserted_steps(project_id) + 1
        bookmark = f"step_{uuid.uuid4().hex[:8]}"
        await word.append_step(analysis.instruction, path, step_number, bookmark)
        db.add_step(
            project_id=project_id,
            kind="screenshot_step",
            session_id=session_id,
            instruction=analysis.instruction,
            screenshot_raw_path=path,
            screenshot_final_path=path,
            review_status="auto_inserted",
            word_bookmark=bookmark,
        )


session_manager = RecordingSessionManager()
