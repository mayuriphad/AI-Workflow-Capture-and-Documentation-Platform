from fastapi import APIRouter

from app import db

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
def summary():
    return db.analytics_summary()
