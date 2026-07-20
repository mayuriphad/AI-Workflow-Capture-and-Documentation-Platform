import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.ai_layer import analyze_screenshot  # noqa: E402

STORAGE = Path(__file__).resolve().parent.parent / "storage"
SAMPLE_IMAGE = next(STORAGE.glob("screenshots/*.png"), None)

result = analyze_screenshot(str(SAMPLE_IMAGE))
print("instruction:", result.instruction)
print("on_screen_text:", result.on_screen_text[:200])
print("ui_elements:", result.ui_elements)
print("has_sensitive_info:", result.has_sensitive_info)
print("redaction_boxes:", result.redaction_boxes)
print("RESULT:", "PASS" if result.instruction else "FAIL")
