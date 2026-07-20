"""
Simple JSON-backed app settings. There's no multi-user auth in this app --
one global settings object is enough. Read at recording-session start
(capture tuning actually takes effect on the next session, not just
cosmetically stored) and by the Settings page.
"""
import json
from pathlib import Path
from threading import Lock

from app.config import (
    CAPTURE_DIFF_THRESHOLD,
    CAPTURE_INTERVAL_SEC,
    CAPTURE_MOTION_RATIO,
    CAPTURE_SETTLE_SEC,
    STORAGE_ROOT,
)

SETTINGS_PATH = STORAGE_ROOT / "settings.json"

DEFAULTS = {
    "capture_interval_sec": CAPTURE_INTERVAL_SEC,
    "capture_motion_ratio": CAPTURE_MOTION_RATIO,
    "capture_diff_threshold": CAPTURE_DIFF_THRESHOLD,
    "capture_settle_sec": CAPTURE_SETTLE_SEC,
    "default_doc_type": "sop",
    "theme": "light",
}

_lock = Lock()


def _read() -> dict:
    """Caller must already hold `_lock` -- not re-entrant."""
    if not SETTINGS_PATH.exists():
        return dict(DEFAULTS)
    try:
        data = json.loads(SETTINGS_PATH.read_text())
    except (json.JSONDecodeError, OSError):
        return dict(DEFAULTS)
    merged = dict(DEFAULTS)
    merged.update({k: v for k, v in data.items() if k in DEFAULTS})
    return merged


def get_settings() -> dict:
    with _lock:
        return _read()


def update_settings(patch: dict) -> dict:
    with _lock:
        current = _read()
        current.update({k: v for k, v in patch.items() if k in DEFAULTS and v is not None})
        Path(SETTINGS_PATH).write_text(json.dumps(current, indent=2))
        return current
