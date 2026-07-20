"""Smoke test for app.services.screen_monitor -- runs for ~6s, expects at
least the capture loop to run without crashing (frame count depends on
whatever's actually changing on screen at the time, so we don't assert an
exact count)."""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.screen_monitor import ScreenMonitor  # noqa: E402

STORAGE = Path(__file__).resolve().parent.parent / "storage"
CAPTURES = STORAGE / "captures_smoke_test"

captured = []


def main() -> None:
    monitor = ScreenMonitor("smoke", CAPTURES, on_significant_frame=captured.append)
    monitor.start()
    print("monitor running:", monitor.is_running())
    time.sleep(6)
    monitor.stop()
    print("monitor running after stop:", monitor.is_running())
    print("frames captured:", len(captured))
    for p in captured:
        print(" -", p, Path(p).exists())
    print("RESULT:", "PASS" if not monitor.is_running() else "FAIL")


if __name__ == "__main__":
    main()
