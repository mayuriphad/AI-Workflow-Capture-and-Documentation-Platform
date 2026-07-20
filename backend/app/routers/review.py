import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app import db
from app.config import SCREENSHOTS_DIR
from app.schemas import ResolveStepRequest
from app.services.redaction import apply_redactions
from app.services.session_guard import ensure_document_open
from app.services.word_automation import word

router = APIRouter(prefix="/review", tags=["review"])


@router.get("/pending")
def list_pending(project_id: str | None = None):
    return db.list_pending_steps(project_id)


@router.get("/{step_id}/suggestions")
def suggestions(step_id: str):
    step = db.get_step(step_id)
    if step is None or not step["screenshot_raw_path"]:
        raise HTTPException(404, "Step not found")
    raw_path = Path(step["screenshot_raw_path"])
    return {
        "step_id": step_id,
        "screenshot": raw_path.relative_to(SCREENSHOTS_DIR).as_posix(),
        "suggestions": step["redaction_boxes"],
    }


@router.post("/{step_id}/approve")
async def approve(step_id: str, payload: ResolveStepRequest):
    step = db.get_step(step_id)
    if step is None:
        raise HTTPException(404, "Step not found")
    if step["review_status"] != "pending_review":
        raise HTTPException(409, f"Step is not pending review (status={step['review_status']})")
    project = db.get_project(step["project_id"])
    if project is None:
        raise HTTPException(404, "Project not found")
    await ensure_document_open(project)

    raw_path = step["screenshot_raw_path"]
    final_path = raw_path
    if payload.boxes:
        final_path = str(Path(raw_path).with_name(f"redacted_{Path(raw_path).name}"))
        apply_redactions(raw_path, [b.model_dump() for b in payload.boxes], final_path, mode=payload.mode)

    step_number = db.count_inserted_steps(step["project_id"]) + 1
    bookmark = f"step_{uuid.uuid4().hex[:8]}"
    await word.append_step(step["instruction"], final_path, step_number, bookmark)
    db.resolve_step(step_id, "approved", screenshot_final_path=final_path, word_bookmark=bookmark)
    return {"ok": True, "screenshot_final_path": Path(final_path).relative_to(SCREENSHOTS_DIR).as_posix()}


@router.post("/{step_id}/reject")
def reject(step_id: str):
    step = db.get_step(step_id)
    if step is None:
        raise HTTPException(404, "Step not found")
    if step["review_status"] != "pending_review":
        raise HTTPException(409, f"Step is not pending review (status={step['review_status']})")
    if step["screenshot_raw_path"]:
        Path(step["screenshot_raw_path"]).unlink(missing_ok=True)
    db.resolve_step(step_id, "rejected")
    return {"ok": True}
