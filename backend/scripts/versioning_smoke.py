import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import db  # noqa: E402
from app.config import DB_PATH, PROJECTS_DIR, VERSIONS_DIR  # noqa: E402
from app.services import versioning  # noqa: E402
from app.services.word_automation import word  # noqa: E402

STORAGE = Path(__file__).resolve().parent.parent / "storage"
SAMPLE_IMAGE = next(STORAGE.glob("screenshots/*.png"), None)


async def main() -> None:
    db.init_db()
    project_id = "smoke-version-project"
    file_path = str(PROJECTS_DIR / f"{project_id}.docx")
    db.create_project("Versioning Smoke", file_path, project_id=project_id)

    word.start()
    try:
        await word.create_document(project_id, "Versioning Smoke", file_path)
        await word.append_step("Step one instruction", str(SAMPLE_IMAGE), 1, "step_1")

        v1 = await versioning.snapshot(project_id, label="after-step-1")
        print("v1:", v1["version_number"], Path(v1["file_path"]).exists())

        await word.append_step("Step two instruction", None, 2, "step_2")
        v2 = await versioning.snapshot(project_id, label="after-step-2")
        print("v2:", v2["version_number"], Path(v2["file_path"]).exists())

        versions = versioning.list_versions(project_id)
        print("versions listed:", [v["version_number"] for v in versions])

        restored_path = await versioning.restore(project_id, v1["id"])
        print("restored to v1, path exists:", Path(restored_path).exists())

        # after restore, the live doc should only contain step 1's content
        from docx import Document as DocxDocument

        doc = DocxDocument(restored_path)
        full_text = "\n".join(p.text for p in doc.paragraphs)
        has_step2 = "Step two instruction" in full_text
        has_step1 = "Step one instruction" in full_text
        print("post-restore has step1:", has_step1, "has step2 (should be False):", has_step2)

        versions_after = versioning.list_versions(project_id)
        print("versions after restore (expect 3, incl. pre-restore snapshot):", len(versions_after))

        ok = has_step1 and not has_step2 and len(versions_after) == 3
        print("RESULT:", "PASS" if ok else "FAIL")
    finally:
        await word.close(save=False)
        word.stop()
        db.delete_project(project_id)
        import shutil

        shutil.rmtree(VERSIONS_DIR / project_id, ignore_errors=True)
        Path(file_path).unlink(missing_ok=True)


if __name__ == "__main__":
    asyncio.run(main())
