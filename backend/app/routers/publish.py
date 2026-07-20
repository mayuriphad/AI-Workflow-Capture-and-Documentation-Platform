import asyncio

from fastapi import APIRouter, HTTPException

from app import db
from app.services.export_service import export_docx
from app.services.publishers.registry import get_publisher, list_targets

router = APIRouter(prefix="/publish", tags=["publish"])


@router.get("/targets")
def get_targets():
    return list_targets()


@router.get("/library/list")
def library():
    """Projects published to the local SOP Library, most recent first."""
    return db.list_published_projects()


@router.post("/{project_id}/{provider}")
async def publish(project_id: str, provider: str):
    project = db.get_project(project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    try:
        publisher = get_publisher(provider)
    except KeyError:
        raise HTTPException(400, f"Unknown provider: {provider}")

    export_path = await export_docx(project)
    result = await asyncio.to_thread(publisher.publish, str(export_path), project["title"])

    db.add_publish_record(
        project_id, provider,
        status="success" if result["success"] else "failed",
        remote_url=result["remote_url"], error=result["error"],
    )
    if not result["success"]:
        raise HTTPException(502, result["error"] or "Publish failed")

    db.update_project_status(project_id, "archived")
    return result


@router.get("/{project_id}/history")
def publish_history(project_id: str):
    if db.get_project(project_id) is None:
        raise HTTPException(404, "Project not found")
    return db.list_publish_history(project_id)
