"""
Operates on steps that are already (or about to be) inserted into the live
Word document -- delete, replace image, redact/annotate an inserted image,
or manually add a new image step at a chosen position. Distinct from
routers/review.py, which only handles the pending-redaction queue for
frames that haven't been inserted yet.
"""
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app import db
from app.config import SCREENSHOTS_DIR
from app.schemas import ImageEditRequest, StepTextUpdate
from app.services.redaction import apply_redactions
from app.services.session_guard import ensure_document_open
from app.services.word_automation import word

router = APIRouter(prefix="/steps", tags=["steps"])


def _project_screenshots_dir(project_id: str) -> Path:
    d = SCREENSHOTS_DIR / project_id
    d.mkdir(parents=True, exist_ok=True)
    return d


@router.delete("/{step_id}")
async def delete_step(step_id: str):
    step = db.get_step(step_id)
    if step is None:
        raise HTTPException(404, "Step not found")
    if step["review_status"] not in ("auto_inserted", "approved"):
        raise HTTPException(
            409, "Only inserted steps can be deleted this way -- use /review/{step_id}/reject for pending ones"
        )
    project = db.get_project(step["project_id"])
    if project is None:
        raise HTTPException(404, "Project not found")
    await ensure_document_open(project)

    if step["word_bookmark"]:
        await word.delete_step(step["word_bookmark"])
    for path in (step["screenshot_raw_path"], step["screenshot_final_path"]):
        if path:
            Path(path).unlink(missing_ok=True)
    db.resolve_step(step_id, "rejected")
    return {"ok": True}


@router.patch("/{step_id}")
async def update_step_text(step_id: str, payload: StepTextUpdate):
    step = db.get_step(step_id)
    if step is None:
        raise HTTPException(404, "Step not found")
    if not step["word_bookmark"]:
        raise HTTPException(409, "This step isn't inserted into the document yet")
    project = db.get_project(step["project_id"])
    if project is None:
        raise HTTPException(404, "Project not found")
    await ensure_document_open(project)

    await word.replace_step_text(step["word_bookmark"], payload.instruction)
    db.resolve_step(step_id, step["review_status"], instruction=payload.instruction)
    return {"ok": True, "instruction": payload.instruction}


@router.post("/{step_id}/replace-image")
async def replace_image(step_id: str, file: UploadFile = File(...)):
    step = db.get_step(step_id)
    if step is None:
        raise HTTPException(404, "Step not found")
    if not step["word_bookmark"]:
        raise HTTPException(409, "This step isn't inserted into the document yet")
    project = db.get_project(step["project_id"])
    if project is None:
        raise HTTPException(404, "Project not found")
    await ensure_document_open(project)

    ext = (file.filename or "image.png").split(".")[-1] or "png"
    dest = _project_screenshots_dir(step["project_id"]) / f"{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}.{ext}"
    dest.write_bytes(await file.read())

    await word.replace_step_image(step["word_bookmark"], str(dest))
    db.resolve_step(step_id, step["review_status"], screenshot_final_path=str(dest))
    return {"ok": True, "screenshot_final_path": dest.relative_to(SCREENSHOTS_DIR).as_posix()}


@router.post("/{step_id}/edit-image")
async def edit_image(step_id: str, payload: ImageEditRequest):
    """Redact, blur, or annotate the image already inserted for this step,
    then swap the edited version into the live document in place."""
    step = db.get_step(step_id)
    if step is None:
        raise HTTPException(404, "Step not found")
    current_path = step["screenshot_final_path"] or step["screenshot_raw_path"]
    if not current_path:
        raise HTTPException(409, "This step has no image")
    if not step["word_bookmark"]:
        raise HTTPException(409, "This step isn't inserted into the document yet")
    project = db.get_project(step["project_id"])
    if project is None:
        raise HTTPException(404, "Project not found")
    await ensure_document_open(project)

    dest = _project_screenshots_dir(step["project_id"]) / f"edited_{int(time.time() * 1000)}_{Path(current_path).name}"
    apply_redactions(current_path, [b.model_dump() for b in payload.boxes], str(dest), mode=payload.mode)

    await word.replace_step_image(step["word_bookmark"], str(dest))
    db.resolve_step(step_id, step["review_status"], screenshot_final_path=str(dest))
    return {"ok": True, "screenshot_final_path": dest.relative_to(SCREENSHOTS_DIR).as_posix()}


@router.post("/add")
async def add_image_step(
    project_id: str = Form(...),
    instruction: str = Form(...),
    after_step_id: str | None = Form(None),
    file: UploadFile = File(...),
):
    """Manually insert a new image step, positioned right after
    `after_step_id` (or at the end of the document if omitted)."""
    project = db.get_project(project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    await ensure_document_open(project)

    after_bookmark = None
    if after_step_id:
        after_step = db.get_step(after_step_id)
        if after_step:
            after_bookmark = after_step["word_bookmark"]

    ext = (file.filename or "image.png").split(".")[-1] or "png"
    dest = _project_screenshots_dir(project_id) / f"{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}.{ext}"
    dest.write_bytes(await file.read())

    step_number = db.count_inserted_steps(project_id) + 1
    bookmark = f"step_{uuid.uuid4().hex[:8]}"
    await word.insert_step_after(after_bookmark, instruction, str(dest), step_number, bookmark)
    step_id = db.add_step(
        project_id,
        "screenshot_step",
        instruction=instruction,
        screenshot_raw_path=str(dest),
        screenshot_final_path=str(dest),
        review_status="auto_inserted",
        word_bookmark=bookmark,
    )
    return {"step_id": step_id, "screenshot_final_path": dest.relative_to(SCREENSHOTS_DIR).as_posix()}
