"""
Phase-2 spike: validate range bookmarks (not just collapsed point
bookmarks) for the image-management feature -- delete a step's whole
content cleanly, and replace just its image in place without losing the
bookmark or corrupting neighboring steps.

Not part of the app. Run: .venv\\Scripts\\python.exe scripts\\word_range_bookmark_spike.py
"""
import sys
import time
from pathlib import Path

import win32com.client as win32

WD_ALERTS_NONE = 0
WD_FORMAT_XML_DOCUMENT = 12
WD_STORY = 6

STORAGE = Path(__file__).resolve().parent.parent / "storage"
SAMPLE_IMAGE = next(STORAGE.glob("screenshots/*.png"), None)
OUT_PATH = STORAGE / "range_bookmark_spike_test.docx"


def insert_step(app, doc, heading: str, instruction: str, image_path, bookmark_name: str, at_end: bool = True):
    sel = app.Selection
    if at_end:
        sel.EndKey(Unit=WD_STORY)
    start = sel.Start
    sel.Style = doc.Styles("Heading 2")
    sel.TypeText(heading)
    sel.TypeParagraph()
    sel.Style = doc.Styles("Normal")
    sel.TypeText(instruction)
    sel.TypeParagraph()
    if image_path:
        sel.InlineShapes.AddPicture(str(image_path), LinkToFile=False, SaveWithDocument=True)
        sel.TypeParagraph()
    end = sel.Start
    rng = doc.Range(start, end)
    doc.Bookmarks.Add(bookmark_name, rng)
    return rng


def main() -> None:
    if SAMPLE_IMAGE is None:
        print("FAIL: no sample screenshot found")
        sys.exit(1)
    if OUT_PATH.exists():
        OUT_PATH.unlink()

    app = win32.gencache.EnsureDispatch("Word.Application")
    app.Visible = True
    app.DisplayAlerts = WD_ALERTS_NONE

    doc = app.Documents.Add()
    insert_step(app, doc, "Step 1: Click Save", "Instruction one.", SAMPLE_IMAGE, "step_1")
    insert_step(app, doc, "Step 2: Confirm dialog", "Instruction two.", SAMPLE_IMAGE, "step_2")
    insert_step(app, doc, "Step 3: Close window", "Instruction three.", SAMPLE_IMAGE, "step_3")
    doc.SaveAs2(str(OUT_PATH), FileFormat=WD_FORMAT_XML_DOCUMENT)

    # --- Test 1: replace step_2's image in place ---
    rng2 = doc.Bookmarks("step_2").Range
    shape_count_before = rng2.InlineShapes.Count
    if shape_count_before != 1:
        print(f"FAIL: expected 1 inline shape in step_2 range, found {shape_count_before}")
        sys.exit(1)
    shape_range = rng2.InlineShapes(1).Range
    shape_range.InlineShapes(1).Delete()
    shape_range.InlineShapes.AddPicture(str(SAMPLE_IMAGE), LinkToFile=False, SaveWithDocument=True)
    print(f"step_2 exists after image replace: {doc.Bookmarks.Exists('step_2')}")
    rng2_after = doc.Bookmarks("step_2").Range
    print(f"step_2 range still has heading text: {'Step 2' in rng2_after.Text}")
    print(f"step_2 range still has 1 image: {rng2_after.InlineShapes.Count == 1}")
    print(f"step_1 unaffected: {doc.Bookmarks.Exists('step_1')} text_ok={'Step 1' in doc.Bookmarks('step_1').Range.Text}")
    print(f"step_3 unaffected: {doc.Bookmarks.Exists('step_3')} text_ok={'Step 3' in doc.Bookmarks('step_3').Range.Text}")

    # --- Test 2: delete step_2 entirely ---
    rng2_del = doc.Bookmarks("step_2").Range
    rng2_del.Delete()
    if doc.Bookmarks.Exists("step_2"):
        doc.Bookmarks("step_2").Delete()
    full_text = doc.Range().Text
    print(f"step_2 gone from doc text: {'Step 2' not in full_text}")
    print(f"step_1 still present: {'Step 1' in full_text}")
    print(f"step_3 still present: {'Step 3' in full_text}")
    print(f"step_1 bookmark still resolves: {doc.Bookmarks.Exists('step_1')}")
    print(f"step_3 bookmark still resolves: {doc.Bookmarks.Exists('step_3')}")

    # --- Test 3: insert a new step right after step_1 (now-adjacent to nothing/step_3) ---
    rng1 = doc.Bookmarks("step_1").Range
    rng1.Collapse(0)  # wdCollapseEnd
    app.Selection.SetRange(rng1.Start, rng1.Start)
    insert_step(app, doc, "Step 1.5: Inserted later", "Instruction inserted.", SAMPLE_IMAGE, "step_1_5", at_end=False)
    full_text2 = doc.Range().Text
    order_ok = full_text2.index("Step 1:") < full_text2.index("Step 1.5") < full_text2.index("Step 3")
    print(f"inserted step lands between step_1 and step_3: {order_ok}")
    print(f"step_3 still resolves after mid-doc insert: {doc.Bookmarks.Exists('step_3')}")

    doc.Save()
    ok = (
        not doc.Bookmarks.Exists("step_2")
        and "Step 2" not in doc.Range().Text
        and doc.Bookmarks.Exists("step_1")
        and doc.Bookmarks.Exists("step_1_5")
        and doc.Bookmarks.Exists("step_3")
        and order_ok
    )
    print("RESULT:", "PASS" if ok else "FAIL")

    doc.Close(SaveChanges=False)
    app.Quit(SaveChanges=False)


if __name__ == "__main__":
    main()
