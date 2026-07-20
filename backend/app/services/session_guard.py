"""
Shared helper for endpoints that need to insert into a project's live
Word document (voice notes, manual notes, redaction approval, image
edits) but can't assume that project's .docx is the one currently open
in the single active Word COM instance -- e.g. after a page reload, or
after the recording session was stopped.

Rather than 409 whenever it isn't, auto-open it -- unless a *different*
project is actively being recorded right now, in which case switching
Word out from under it would corrupt that live session.
"""
from fastapi import HTTPException

from app.services.recording_session import session_manager
from app.services.word_automation import word


async def ensure_document_open(project: dict) -> None:
    project_id = project["id"]
    if word.current_project_id == project_id:
        return

    active = session_manager.active_project_id
    if active is not None and active != project_id:
        raise HTTPException(
            409,
            "Another SOP is actively recording right now -- stop that session before working on this one.",
        )

    await word.open_document(project_id, project["word_file_path"])
