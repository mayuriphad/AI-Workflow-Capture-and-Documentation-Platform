import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.ai_layer import extract_key_points  # noqa: E402

existing_steps = [
    {"id": "s1", "instruction": "Open the Domain Settings page from the admin dashboard."},
    {"id": "s2", "instruction": "Click 'Edit nameservers' to change the DNS provider."},
    {"id": "s3", "instruction": "Click Save to apply the new nameserver configuration."},
]

transcript = (
    "So a couple of things worth noting. First, the nameserver change can take up to 48 hours "
    "to propagate, so don't panic if it's not instant. Also, make sure you're logged in as an "
    "admin, not a regular user, or the Domain Settings page won't even show up. One more thing "
    "in general -- always take a screenshot of the old nameservers before changing them, in case "
    "you need to roll back."
)

points = extract_key_points(transcript, existing_steps, doc_type="sop")
for p in points:
    print(f"[{p['target_step_id']}] {p['text']}")

ok = len(points) >= 2 and any(p["target_step_id"] for p in points)
print("RESULT:", "PASS" if ok else "FAIL")
