"""
AI layer for SOP Recorder, backed by Gemini.

Two calls per captured screenshot, routed to separate models/quota
buckets: a vision pass (GEMINI_VISION_MODEL) that reads on-screen text,
identifies UI components, and flags sensitive info, followed by a
text-only pass (GEMINI_TEXT_MODEL) that writes the one-line SOP
instruction from what the vision pass extracted. Splitting them means the
two calls draw from independent free-tier quotas instead of both
competing for the same one, and lets the text pass use a stronger model
for writing quality without paying vision-call prices for it.

analyze_screenshot() is deliberately the only entry point and returns
plain, provider-agnostic dataclasses -- if a local/open-source
vision-language model ever replaces Gemini, it only needs to reimplement
this one function with the same signature.
"""
import json
from dataclasses import dataclass, field
from pathlib import Path

from google import genai
from google.genai import types
from PIL import Image

from app.config import GEMINI_API_KEY, GEMINI_TEXT_MODEL, GEMINI_VISION_MODEL

_client: genai.Client | None = None

DOC_TYPE_LABELS = {
    "sop": "Standard Operating Procedure (SOP)",
}


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set (see backend/.env)")
        # Explicit timeout: without one, a stalled connection hangs the
        # request indefinitely with no error surfaced to the caller.
        _client = genai.Client(
            api_key=GEMINI_API_KEY, http_options=types.HttpOptions(timeout=30000)
        )
    return _client


def _image_part(image_path: str) -> types.Part:
    suffix = Path(image_path).suffix.lower().lstrip(".") or "png"
    mime = "image/jpeg" if suffix in ("jpg", "jpeg") else f"image/{suffix}"
    return types.Part.from_bytes(data=Path(image_path).read_bytes(), mime_type=mime)


@dataclass
class UIElement:
    type: str  # button | menu | form | table | dialog | field | link
    label: str


@dataclass
class StepAnalysis:
    instruction: str
    on_screen_text: str
    ui_elements: list[UIElement] = field(default_factory=list)
    has_sensitive_info: bool = False
    redaction_boxes: list[dict] = field(default_factory=list)  # pixel-space {left,top,width,height,label}


VISION_INSTRUCTION_TEMPLATE = """You are the vision layer for a screen-recording tool that builds \
a {doc_label} from a user's actions, one screenshot at a time.

For the given screenshot, do all of the following:
1. Read all visible on-screen text.
2. Identify the UI components visible (buttons, menus, forms, tables, dialogs, fields, links) \
with their labels exactly as shown.
3. Detect any sensitive information visible: ID/passport numbers, credit card numbers, API keys \
or passwords, private emails or phone numbers, or any visible face/photo ID. Do not repeat or \
transcribe the sensitive value itself anywhere in your output.

Return ONLY a JSON object (no markdown fences, no other text) with this exact shape:
{{
  "on_screen_text": "<all visible text, concatenated>",
  "ui_elements": [{{"type": "button|menu|form|table|dialog|field|link", "label": "<exact label>"}}],
  "has_sensitive_info": true|false,
  "redaction_boxes": [{{"label": "<short type, e.g. EMAIL, API_KEY, PHONE, CARD_NUMBER, FACE, PII>", \
"box_2d": [ymin, xmin, ymax, xmax]}}]
}}
"box_2d" coordinates are integers normalized to a 0-1000 scale relative to the image's height and \
width respectively. If nothing sensitive is visible, "redaction_boxes" must be an empty array and \
"has_sensitive_info" must be false."""

INSTRUCTION_WRITING_TEMPLATE = """You are the AI layer for a screen-recording tool that builds a \
{doc_label} from a user's actions. A vision model already read the current screenshot; you never \
see the image itself, only what it extracted below.

Identify the action the user just took or the state being shown (e.g. "Click the Save icon in the \
top-left toolbar") and write ONE clear, concise instruction in imperative voice describing it. Be \
specific about exact button/menu/field names from the elements below. If there isn't enough \
information to confidently describe an action, return an empty string rather than guessing.

Visible UI elements:
{ui_elements_list}

On-screen text:
{on_screen_text}

Return ONLY a JSON object (no markdown fences, no other text): \
{{"instruction": "<the instruction, or an empty string>"}}"""


def _extract_vision_data(image_path: str, doc_type: str = "sop") -> dict:
    response = _get_client().models.generate_content(
        model=GEMINI_VISION_MODEL,
        contents=[_image_part(image_path)],
        config=types.GenerateContentConfig(
            system_instruction=VISION_INSTRUCTION_TEMPLATE.format(
                doc_label=DOC_TYPE_LABELS.get(doc_type, "procedure document")
            ),
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )
    try:
        return json.loads(response.text or "{}")
    except json.JSONDecodeError:
        return {}


def _write_instruction(on_screen_text: str, ui_elements: list["UIElement"], doc_type: str = "sop") -> str:
    """Second, text-only Gemini call (GEMINI_TEXT_MODEL): writes the SOP
    instruction purely from what the vision pass already extracted, so this
    draws from a separate model/quota bucket instead of competing with the
    vision call's own."""
    if not on_screen_text and not ui_elements:
        return ""

    ui_elements_list = (
        "\n".join(f"- ({el.type}) {el.label}" for el in ui_elements if el.label) or "(none detected)"
    )
    response = _get_client().models.generate_content(
        model=GEMINI_TEXT_MODEL,
        contents=["Write the instruction for this screenshot."],
        config=types.GenerateContentConfig(
            system_instruction=INSTRUCTION_WRITING_TEMPLATE.format(
                doc_label=DOC_TYPE_LABELS.get(doc_type, "procedure document"),
                ui_elements_list=ui_elements_list,
                on_screen_text=on_screen_text or "(none detected)",
            ),
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )
    try:
        data = json.loads(response.text or "{}")
    except json.JSONDecodeError:
        return ""
    return (data.get("instruction") or "").strip()


def analyze_screenshot(image_path: str, doc_type: str = "sop") -> StepAnalysis:
    with Image.open(image_path) as img:
        width, height = img.size

    vision_data = _extract_vision_data(image_path, doc_type)

    ui_elements = [
        UIElement(type=el.get("type", "field"), label=el.get("label", ""))
        for el in vision_data.get("ui_elements", [])
        if isinstance(el, dict)
    ]
    on_screen_text = (vision_data.get("on_screen_text") or "").strip()
    redaction_boxes = _normalize_boxes(vision_data.get("redaction_boxes", []), width, height)
    instruction = _write_instruction(on_screen_text, ui_elements, doc_type)

    return StepAnalysis(
        instruction=instruction,
        on_screen_text=on_screen_text,
        ui_elements=ui_elements,
        has_sensitive_info=bool(vision_data.get("has_sensitive_info")) or bool(redaction_boxes),
        redaction_boxes=redaction_boxes,
    )


def _normalize_boxes(items: list, width: int, height: int) -> list[dict]:
    boxes = []
    for item in items:
        if not isinstance(item, dict):
            continue
        try:
            ymin, xmin, ymax, xmax = item["box_2d"]
        except (KeyError, TypeError, ValueError):
            continue
        left = round(xmin / 1000 * width)
        top = round(ymin / 1000 * height)
        right = round(xmax / 1000 * width)
        bottom = round(ymax / 1000 * height)
        boxes.append(
            {
                "left": left,
                "top": top,
                "width": max(right - left, 1),
                "height": max(bottom - top, 1),
                "label": item.get("label", "PII"),
            }
        )
    return boxes


KEY_POINTS_INSTRUCTION_TEMPLATE = """You are extracting structured key points from a user's spoken voice \
note while they build a {doc_label}. You're given the current ordered list of existing steps and a \
transcript of what the user just said out loud.

Break the transcript into short, distinct, factual key points (one sentence each -- e.g. "The license \
must be renewed before the 90-day trial ends."). Do not invent anything not said; if the transcript is \
really just one point, return one key point.

For each key point, decide which existing step (by its number in the list below) it most relates to and \
should be attached under -- the step whose content it clarifies, corrects, or adds detail to. If a key \
point is general and doesn't relate to any specific existing step, set step_index to null (it will be \
appended at the end of the document instead).

Existing steps:
{steps_list}

Return ONLY a JSON object (no markdown fences, no other text):
{{"key_points": [{{"text": "<key point text>", "step_index": <integer index from the list above, or null>}}]}}
If there are no existing steps, every key_point's step_index must be null."""


def extract_key_points(
    transcript: str, existing_steps: list[dict], doc_type: str = "sop"
) -> list[dict]:
    """existing_steps: [{"id": ..., "instruction": ...}, ...] in document order.
    Returns [{"text": ..., "target_step_id": <id or None>}, ...]."""
    if not transcript.strip():
        return []

    doc_label = DOC_TYPE_LABELS.get(doc_type, "procedure document")
    steps_list = "\n".join(f"{i}. {s['instruction']}" for i, s in enumerate(existing_steps)) or "(none yet)"

    response = _get_client().models.generate_content(
        model=GEMINI_TEXT_MODEL,
        contents=[transcript],
        config=types.GenerateContentConfig(
            system_instruction=KEY_POINTS_INSTRUCTION_TEMPLATE.format(doc_label=doc_label, steps_list=steps_list),
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )
    try:
        data = json.loads(response.text or "{}")
    except json.JSONDecodeError:
        data = {}

    points = []
    for item in data.get("key_points", []):
        if not isinstance(item, dict):
            continue
        text = (item.get("text") or "").strip()
        if not text:
            continue
        idx = item.get("step_index")
        target_step_id = None
        if isinstance(idx, int) and 0 <= idx < len(existing_steps):
            target_step_id = existing_steps[idx]["id"]
        points.append({"text": text, "target_step_id": target_step_id})

    if not points and transcript.strip():
        # Gemini returned nothing usable -- fall back to inserting the raw
        # transcript as one general note rather than silently dropping it.
        points.append({"text": transcript.strip(), "target_step_id": None})

    return points
