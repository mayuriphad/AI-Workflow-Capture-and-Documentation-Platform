"""
Version history: plain filesystem snapshots of a project's .docx, indexed
in SQLite. Not diffed/merged against Word's own format -- a straight file
copy per snapshot is the pragmatic MVP choice and avoids needing Word's
track-changes API to reconstruct history.
"""
import shutil
from pathlib import Path

from app import db
from app.config import VERSIONS_DIR
from app.services.word_automation import word


async def snapshot(project_id: str, label: str = "auto") -> dict:
    project = db.get_project(project_id)
    if project is None:
        raise ValueError(f"Unknown project {project_id}")

    if word.current_project_id == project_id:
        await word.save()

    project_versions_dir = VERSIONS_DIR / project_id
    project_versions_dir.mkdir(parents=True, exist_ok=True)
    next_number = len(db.list_versions(project_id)) + 1
    dest = project_versions_dir / f"v{next_number}.docx"
    shutil.copy2(project["word_file_path"], dest)

    return db.add_version(project_id, str(dest), label=label)


def list_versions(project_id: str) -> list[dict]:
    return db.list_versions(project_id)


async def restore(project_id: str, version_id: str) -> str:
    version = db.get_version(version_id)
    if version is None or version["project_id"] != project_id:
        raise ValueError("Version not found for this project")
    project = db.get_project(project_id)
    if project is None:
        raise ValueError(f"Unknown project {project_id}")

    # Snapshot current state first so restoring is itself reversible.
    await snapshot(project_id, label="pre-restore")

    was_open = word.current_project_id == project_id
    if was_open:
        await word.close(save=False)

    shutil.copy2(version["file_path"], project["word_file_path"])

    if was_open:
        await word.open_document(project_id, project["word_file_path"])

    return project["word_file_path"]
