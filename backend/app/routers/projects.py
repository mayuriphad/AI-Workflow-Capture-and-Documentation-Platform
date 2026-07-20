from fastapi import APIRouter, HTTPException

from app import db

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
def list_projects():
    return db.list_projects()


@router.get("/{project_id}")
def get_project(project_id: str):
    project = db.get_project(project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    return project


@router.delete("/{project_id}")
def delete_project(project_id: str):
    db.delete_project(project_id)
    return {"ok": True}
