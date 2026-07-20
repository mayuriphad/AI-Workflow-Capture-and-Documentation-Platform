"""
Central configuration for the SOP Recorder backend.

All storage paths live under STORAGE_ROOT so the "dedicated folder" the
spec asks for (screenshots auto-saved during capture) has one clear home.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

STORAGE_ROOT = Path(__file__).resolve().parent.parent / "storage"
SCREENSHOTS_DIR = STORAGE_ROOT / "screenshots"  # raw + redacted captures, served at /screenshots
AUDIO_DIR = STORAGE_ROOT / "audio"  # persisted voice-note clips, so "export voice to audio" has something real to bundle
EXPORTS_DIR = STORAGE_ROOT / "exports"
PROJECTS_DIR = STORAGE_ROOT / "projects"  # the live .docx each project's Word session has open
VERSIONS_DIR = STORAGE_ROOT / "versions"  # timestamped snapshots of each project's .docx
PUBLISHED_DIR = STORAGE_ROOT / "published"  # local "SOP Library" -- always-available publish target
DB_PATH = STORAGE_ROOT / "sop.db"

for _dir in (SCREENSHOTS_DIR, AUDIO_DIR, EXPORTS_DIR, PROJECTS_DIR, VERSIONS_DIR, PUBLISHED_DIR):
    _dir.mkdir(parents=True, exist_ok=True)

# faster-whisper model size. "base" is a good speed/accuracy default for
# dictated SOP instructions; bump to "small"/"medium" if accuracy matters
# more than latency on your hardware.
WHISPER_MODEL_SIZE = "base"
WHISPER_DEVICE = "cpu"
WHISPER_COMPUTE_TYPE = "int8"

# AI layer (Gemini): two calls per captured screenshot, deliberately routed to
# separate models/quota buckets --
#   1. vision pass (GEMINI_VISION_MODEL): read on-screen text, identify UI
#      elements, flag sensitive info + redaction boxes. Cheap/high-quota
#      model is fine here.
#   2. text pass (GEMINI_TEXT_MODEL): write the actual SOP instruction from
#      the vision pass's extracted text/elements (no image, so it draws from
#      the text-only quota instead of competing with vision calls). Also
#      used for voice-note key-point extraction.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_VISION_MODEL = os.environ.get("GEMINI_VISION_MODEL", "gemini-flash-lite-latest")
GEMINI_TEXT_MODEL = os.environ.get("GEMINI_TEXT_MODEL", "gemini-3-flash-preview")

# Screen monitoring (OpenCV frame-diffing). Two thresholds: MOTION_RATIO
# (tiny, frame-to-frame) decides "is the screen still actively changing right
# now", DIFF_THRESHOLD (bigger, vs. the last *kept* frame) decides "is this
# stabilized frame different enough from what we already captured to be
# worth keeping".
CAPTURE_INTERVAL_SEC = float(os.environ.get("CAPTURE_INTERVAL_SEC", "0.5"))
CAPTURE_MOTION_RATIO = float(os.environ.get("CAPTURE_MOTION_RATIO", "0.002"))
CAPTURE_DIFF_THRESHOLD = float(os.environ.get("CAPTURE_DIFF_THRESHOLD", "0.02"))
CAPTURE_SETTLE_SEC = float(os.environ.get("CAPTURE_SETTLE_SEC", "0.6"))

# Publishing (all optional -- unset ones fall back to "not configured")
SHAREPOINT_TENANT_ID = os.environ.get("SHAREPOINT_TENANT_ID")
SHAREPOINT_CLIENT_ID = os.environ.get("SHAREPOINT_CLIENT_ID")
SHAREPOINT_SITE_ID = os.environ.get("SHAREPOINT_SITE_ID")
SHAREPOINT_DRIVE_ID = os.environ.get("SHAREPOINT_DRIVE_ID")

CONFLUENCE_BASE_URL = os.environ.get("CONFLUENCE_BASE_URL")
CONFLUENCE_EMAIL = os.environ.get("CONFLUENCE_EMAIL")
CONFLUENCE_API_TOKEN = os.environ.get("CONFLUENCE_API_TOKEN")
CONFLUENCE_SPACE_KEY = os.environ.get("CONFLUENCE_SPACE_KEY")

SERVICENOW_INSTANCE = os.environ.get("SERVICENOW_INSTANCE")
SERVICENOW_TOKEN = os.environ.get("SERVICENOW_TOKEN")

SALESFORCE_INSTANCE_URL = os.environ.get("SALESFORCE_INSTANCE_URL")
SALESFORCE_ACCESS_TOKEN = os.environ.get("SALESFORCE_ACCESS_TOKEN")
