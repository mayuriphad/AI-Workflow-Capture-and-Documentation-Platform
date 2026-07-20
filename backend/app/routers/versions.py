from fastapi import APIRouter, HTTPException

from app import db
from app.schemas import SnapshotRequest
from app.services import versioning

router = APIRouter(prefix="/versions", tags=["versions"])


@router.get("/{project_id}")
def list_versions(project_id: str):
    if db.get_project(project_id) is None:
        raise HTTPException(404, "Project not found")
    return versioning.list_versions(project_id)


@router.post("/{project_id}/snapshot")
async def create_snapshot(project_id: str, payload: SnapshotRequest):
    if db.get_project(project_id) is None:
        raise HTTPException(404, "Project not found")
    try:
        return await versioning.snapshot(project_id, label=payload.label)
    except ValueError as exc:
        raise HTTPException(400, str(exc))


@router.post("/{project_id}/restore/{version_id}")
async def restore_version(project_id: str, version_id: str):
    try:
        path = await versioning.restore(project_id, version_id)
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    return {"ok": True, "word_file_path": path}
