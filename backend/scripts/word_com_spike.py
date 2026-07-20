"""
Standalone spike (Phase 0): validate the riskiest primitive before building
word_automation.py around it -- does a Word bookmark survive content being
inserted at its collapsed point, so a later voice-note insert can still find
"the end of step N"?

Not part of the app. Run directly: .venv\\Scripts\\python.exe scripts\\word_com_spike.py
"""
import sys
import time
from pathlib import Path

import win32com.client as win32

WD_ALERTS_NONE = 0
WD_FORMAT_XML_DOCUMENT = 12  # .docx

STORAGE = Path(__file__).resolve().parent.parent / "storage"
SAMPLE_IMAGE = next(STORAGE.glob("screenshots/*.png"), None)
OUT_PATH = STORAGE / "word_spike_test.docx"


def main() -> None:
    if SAMPLE_IMAGE is None:
        print("FAIL: no sample screenshot found under storage/screenshots/")
        sys.exit(1)

    print(f"Using sample image: {SAMPLE_IMAGE}")
    if OUT_PATH.exists():
        OUT_PATH.unlink()

    app = win32.gencache.EnsureDispatch("Word.Application")
    app.Visible = True
    app.DisplayAlerts = WD_ALERTS_NONE

    doc = app.Documents.Add()
    sel = app.Selection

    # --- Step 1: heading + paragraph + picture, then bookmark the end ---
    sel.Style = doc.Styles("Heading 1")
    sel.TypeText("Step 1: Click the Save button")
    sel.TypeParagraph()
    sel.Style = doc.Styles("Normal")
    sel.TypeText("Instruction: click the Save icon in the top-left toolbar.")
    sel.TypeParagraph()
    sel.InlineShapes.AddPicture(str(SAMPLE_IMAGE), LinkToFile=False, SaveWithDocument=True)
    sel.TypeParagraph()

    end_of_step1 = doc.Range(sel.Start, sel.Start)  # collapsed range at current point
    doc.Bookmarks.Add("step_1", end_of_step1)
    print(f"Bookmark 'step_1' added. Exists={doc.Bookmarks.Exists('step_1')}")

    # --- Step 2: a second step, its own bookmark ---
    sel.Style = doc.Styles("Heading 1")
    sel.TypeText("Step 2: Confirm the dialog")
    sel.TypeParagraph()
    sel.Style = doc.Styles("Normal")
    sel.TypeText("Instruction: click OK on the confirmation dialog.")
    sel.TypeParagraph()

    end_of_step2 = doc.Range(sel.Start, sel.Start)
    doc.Bookmarks.Add("step_2", end_of_step2)
    print(f"Bookmark 'step_2' added. Exists={doc.Bookmarks.Exists('step_2')}")

    doc.SaveAs2(str(OUT_PATH), FileFormat=WD_FORMAT_XML_DOCUMENT)
    print(f"Saved: {OUT_PATH}")

    # --- Simulate "later": a voice note arrives, targeting step_1's bookmark ---
    time.sleep(1)
    exists_before = doc.Bookmarks.Exists("step_1")
    print(f"Before voice-note insert, 'step_1' exists={exists_before}")
    if not exists_before:
        print("FAIL: bookmark did not survive to the next operation")
        app.Quit(SaveChanges=False)
        sys.exit(1)

    bm_range = doc.Bookmarks("step_1").Range
    bm_range.Collapse(0)  # wdCollapseEnd
    bm_range.InsertParagraphAfter()
    bm_range.Collapse(0)
    bm_range.Text = "Note: user mentioned this button is easy to miss."
    # bookmark was consumed by the insert -- must recreate it at the new end
    new_end = doc.Range(bm_range.End, bm_range.End)
    doc.Bookmarks.Add("step_1", new_end)
    print(f"Recreated 'step_1' after voice-note insert. Exists={doc.Bookmarks.Exists('step_1')}")

    # --- Second voice note on the same step, proving recreation actually works ---
    bm_range2 = doc.Bookmarks("step_1").Range
    bm_range2.Collapse(0)
    bm_range2.InsertParagraphAfter()
    bm_range2.Collapse(0)
    bm_range2.Text = "Note: second voice note on the same step."
    doc.Bookmarks.Add("step_1", doc.Range(bm_range2.End, bm_range2.End))
    print(f"Second voice-note insert ok. 'step_1' exists={doc.Bookmarks.Exists('step_1')}")
    print(f"'step_2' still exists={doc.Bookmarks.Exists('step_2')} (must be unaffected by step_1 edits)")

    doc.Save()
    print(f"Final paragraph count: {doc.Paragraphs.Count}")
    full_text = doc.Range().Text
    print("--- Final document text ---")
    print(full_text)

    ok = (
        doc.Bookmarks.Exists("step_1")
        and doc.Bookmarks.Exists("step_2")
        and "second voice note" in full_text
        and "easy to miss" in full_text
    )
    print("RESULT:", "PASS" if ok else "FAIL")

    doc.Close(SaveChanges=False)
    app.Quit(SaveChanges=False)


if __name__ == "__main__":
    main()
