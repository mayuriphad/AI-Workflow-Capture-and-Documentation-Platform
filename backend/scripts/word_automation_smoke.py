"""
Smoke test for app.services.word_automation -- exercises the real async
bridge (thread + queue + asyncio.wrap_future), not just raw COM calls.
Not part of the app. Run: .venv\\Scripts\\python.exe scripts\\word_automation_smoke.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.word_automation import WordAutomation  # noqa: E402

STORAGE = Path(__file__).resolve().parent.parent / "storage"
SAMPLE_IMAGE = next(STORAGE.glob("screenshots/*.png"), None)
DOCX_PATH = STORAGE / "word_automation_smoke.docx"
PDF_PATH = STORAGE / "word_automation_smoke.pdf"
HTML_PATH = STORAGE / "word_automation_smoke.html"


async def main() -> None:
    word = WordAutomation()
    word.start()
    try:
        await word.create_document("proj-smoke", "Smoke Test SOP", str(DOCX_PATH))
        print("create_document OK, is_alive =", word.is_alive())

        await word.append_step("Click the Save button", str(SAMPLE_IMAGE), 1, "step_1")
        print("append_step 1 OK")

        await word.append_step("Confirm the dialog", None, 2, "step_2")
        print("append_step 2 OK")

        await word.append_voice_note("step_1", "this button is easy to miss")
        print("append_voice_note OK")

        await word.save_copy_as("pdf", str(PDF_PATH))
        print("save_copy_as pdf OK, exists =", PDF_PATH.exists())

        await word.save_copy_as("html", str(HTML_PATH))
        print("save_copy_as html OK, exists =", HTML_PATH.exists())

        # concurrent calls should serialize through the queue without corrupting state
        results = await asyncio.gather(
            word.append_voice_note("step_2", "concurrent note A"),
            word.append_voice_note("step_2", "concurrent note B"),
        )
        print("concurrent appends OK:", results)

        await word.close(save=True)
        print("close OK, is_alive =", word.is_alive())
        print("RESULT: PASS")
    finally:
        word.stop()


if __name__ == "__main__":
    asyncio.run(main())
