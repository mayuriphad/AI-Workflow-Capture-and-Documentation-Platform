from fastapi import APIRouter
from pydantic import BaseModel

from app.config import GEMINI_API_KEY, GEMINI_TEXT_MODEL, GEMINI_VISION_MODEL, WHISPER_MODEL_SIZE
from app.services.publishers.registry import list_targets
from app.services.settings_store import get_settings, update_settings

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    capture_interval_sec: float | None = None
    capture_motion_ratio: float | None = None
    capture_diff_threshold: float | None = None
    capture_settle_sec: float | None = None
    default_doc_type: str | None = None
    theme: str | None = None


@router.get("")
def read_settings():
    return get_settings()


@router.put("")
def write_settings(payload: SettingsUpdate):
    return update_settings(payload.model_dump(exclude_unset=True))


@router.get("/diagnostics")
def diagnostics():
    """Read-only status of external dependencies -- what's actually
    configured, not what's theoretically supported. Used by the Settings
    page so 'Publish' and AI analysis failures are explainable instead of
    mysterious."""
    return {
        "gemini_configured": bool(GEMINI_API_KEY),
        "gemini_vision_model": GEMINI_VISION_MODEL,
        "gemini_text_model": GEMINI_TEXT_MODEL,
        "whisper_model": WHISPER_MODEL_SIZE,
        "publish_targets": list_targets(),
    }
