from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app import db
from app.services.export_service import EXPORTERS

router = APIRouter(prefix="/export", tags=["export"])

MEDIA_TYPES = {
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pdf": "application/pdf",
    "html": "text/html",
    "md": "text/markdown",
}


@router.get("/{project_id}/{fmt}")
async def export_project(project_id: str, fmt: str):
    if fmt not in EXPORTERS:
        raise HTTPException(400, f"format must be one of {list(EXPORTERS)}")
    project = db.get_project(project_id)
    if project is None:
        raise HTTPException(404, "Project not found")

    out_path = await EXPORTERS[fmt](project)
    return FileResponse(out_path, media_type=MEDIA_TYPES[fmt], filename=out_path.name)
