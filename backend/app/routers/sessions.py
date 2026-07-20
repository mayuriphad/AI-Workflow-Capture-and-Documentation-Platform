import asyncio
import io
import tempfile
import time
import uuid
import zipfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app import db
from app.config import AUDIO_DIR, PROJECTS_DIR
from app.schemas import ManualNoteRequest, ProjectCreate
from app.services import ai_layer
from app.services.recording_session import session_manager
from app.services.session_guard import ensure_document_open
from app.services.transcription import transcribe_audio
from app.services.word_automation import word

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _persist_audio(project_id: str, tmp_path: str, suffix: str) -> str:
    """Moves a transcribed voice clip out of the tempfile it was recorded to
    and into permanent per-project storage, so there's a real file behind
    "export voice to audio" instead of the temp clip that used to be
    deleted right after transcription."""
    dest_dir = AUDIO_DIR / project_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}{suffix}"
    Path(tmp_path).replace(dest)
    return str(dest)


@router.post("/start")
async def start_session(payload: ProjectCreate):
    project_id = str(uuid.uuid4())
    file_path = str(PROJECTS_DIR / f"{project_id}.docx")
    db.create_project(payload.title, file_path, payload.doc_type, project_id=project_id)

    await word.create_document(project_id, payload.title, file_path)
    session_id = await session_manager.start(project_id, payload.doc_type)
    return {"project_id": project_id, "session_id": session_id}


@router.post("/{project_id}/stop")
async def stop_session(project_id: str):
    project = db.get_project(project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    await session_manager.stop()
    db.update_project_status(project_id, "stopped")
    return {"ok": True}


@router.post("/{project_id}/resume")
async def resume_session(project_id: str):
    project = db.get_project(project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    await word.open_document(project_id, project["word_file_path"])
    session_id = await session_manager.start(project_id, project["doc_type"])
    db.update_project_status(project_id, "active")
    return {"project_id": project_id, "session_id": session_id}


@router.get("/{project_id}/status")
def session_status(project_id: str):
    project = db.get_project(project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    return session_manager.status(project_id)


@router.post("/{project_id}/voice-note")
async def voice_note(project_id: str, file: UploadFile = File(...)):
    project = db.get_project(project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    await ensure_document_open(project)

    suffix = Path(file.filename or "clip.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        text = await asyncio.to_thread(transcribe_audio, tmp_path)
    except Exception:
        Path(tmp_path).unlink(missing_ok=True)
        raise
    audio_path = _persist_audio(project_id, tmp_path, suffix)

    last_step = db.get_last_inserted_step(project_id)
    bookmark = last_step["word_bookmark"] if last_step else None
    await word.append_voice_note(bookmark, text)
    step_id = db.add_step(
        project_id, "voice_note", instruction=text, audio_path=audio_path,
        review_status="auto_inserted", word_bookmark=bookmark,
    )
    return {"step_id": step_id, "text": text}


@router.post("/{project_id}/voice-note/key-points")
async def voice_note_key_points(project_id: str, file: UploadFile = File(...)):
    """Transcribes a longer voice memo, asks Gemini to break it into
    structured key points, and inserts each one under whichever existing
    step Gemini judges it relates to (or appends it as a general note if
    none match) -- rather than dropping the whole clip in as one raw note."""
    project = db.get_project(project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    await ensure_document_open(project)

    suffix = Path(file.filename or "clip.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        transcript = await asyncio.to_thread(transcribe_audio, tmp_path)
    except Exception:
        Path(tmp_path).unlink(missing_ok=True)
        raise
    audio_path = _persist_audio(project_id, tmp_path, suffix)

    existing_steps = [
        {"id": s["id"], "instruction": s["instruction"]}
        for s in project["steps"]
        if s["kind"] == "screenshot_step" and s["review_status"] in ("auto_inserted", "approved") and s["instruction"]
    ]
    try:
        key_points = await asyncio.to_thread(
            ai_layer.extract_key_points, transcript, existing_steps, project["doc_type"]
        )
    except Exception as exc:
        raise HTTPException(503, f"AI key-point extraction is temporarily unavailable: {exc}")

    step_by_id = {s["id"]: s for s in project["steps"]}
    last_step = db.get_last_inserted_step(project_id)
    fallback_bookmark = last_step["word_bookmark"] if last_step else None

    inserted = []
    for point in key_points:
        target_id = point["target_step_id"]
        target_step = step_by_id.get(target_id) if target_id else None
        bookmark = target_step["word_bookmark"] if target_step else fallback_bookmark

        await word.append_voice_note(bookmark, point["text"])
        step_id = db.add_step(
            project_id, "voice_note", instruction=point["text"], audio_path=audio_path,
            review_status="auto_inserted", word_bookmark=bookmark,
        )
        inserted.append({"step_id": step_id, "text": point["text"], "attached_to_step_id": target_id})

    return {"transcript": transcript, "key_points": inserted}


@router.get("/{project_id}/voice-notes/export")
async def export_voice_notes(project_id: str):
    """Bundles every persisted voice-note clip for this project into a zip
    download -- the real audio behind the toolbar's "Export Voice to Audio"
    button, distinct from the transcript text already in the SOP."""
    project = db.get_project(project_id)
    if project is None:
        raise HTTPException(404, "Project not found")

    paths = db.list_audio_paths(project_id)
    if not paths:
        raise HTTPException(404, "No voice recordings have been captured for this project yet")

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for i, path in enumerate(paths, start=1):
            p = Path(path)
            if p.exists():
                zf.write(p, arcname=f"{i:02d}_{p.name}")
    buffer.seek(0)

    filename = f"{project['title'].replace(' ', '_')}_voice_notes.zip"
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{project_id}/manual-note")
async def manual_note(project_id: str, payload: ManualNoteRequest):
    project = db.get_project(project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    await ensure_document_open(project)

    bookmark = None
    if payload.target_step_id:
        step = db.get_step(payload.target_step_id)
        bookmark = step["word_bookmark"] if step else None
    else:
        last_step = db.get_last_inserted_step(project_id)
        bookmark = last_step["word_bookmark"] if last_step else None

    await word.append_manual_note(payload.text, bookmark)
    step_id = db.add_step(
        project_id, "manual_note", instruction=payload.text, review_status="auto_inserted", word_bookmark=bookmark
    )
    return {"step_id": step_id}
