"""
Continuous full-screen capture, filtered down to "meaningful action"
frames with OpenCV so we don't flood the AI-analysis pipeline with every
intermediate animation frame.

Runs on its own dedicated thread: an mss.mss() capture context is
thread-local on Windows (same constraint as Word's COM thread), so it must
be constructed and used entirely inside _loop(), never shared across
threads.

Two-tier diffing:
  - frame-to-frame "motion" check decides whether the screen is still
    actively changing right now (typing, a window animating in, scrolling).
  - once motion has stopped for CAPTURE_SETTLE_SEC, the now-stable frame is
    compared against the last *kept* frame; if different enough, it's saved
    and handed to on_significant_frame(path). This yields one clean
    "after" screenshot per user action instead of a frame per tick.
"""
import logging
import threading
import time
import uuid
from pathlib import Path
from typing import Callable

from app.config import (
    CAPTURE_DIFF_THRESHOLD,
    CAPTURE_INTERVAL_SEC,
    CAPTURE_MOTION_RATIO,
    CAPTURE_SETTLE_SEC,
)

logger = logging.getLogger(__name__)


class ScreenMonitor:
    def __init__(
        self,
        project_id: str,
        captures_dir: Path,
        on_significant_frame: Callable[[str], None],
        interval_sec: float = CAPTURE_INTERVAL_SEC,
        motion_ratio: float = CAPTURE_MOTION_RATIO,
        diff_threshold: float = CAPTURE_DIFF_THRESHOLD,
        settle_sec: float = CAPTURE_SETTLE_SEC,
    ) -> None:
        self.project_id = project_id
        self.captures_dir = captures_dir
        self.on_significant_frame = on_significant_frame
        self.interval_sec = interval_sec
        self.motion_ratio = motion_ratio
        self.diff_threshold = diff_threshold
        self.settle_sec = settle_sec

        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self.captures_dir.mkdir(parents=True, exist_ok=True)

    def start(self) -> None:
        if self._thread is not None:
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._loop, daemon=True, name=f"screen-monitor-{self.project_id}")
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=5)
            self._thread = None

    def is_running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def _save_frame(self, raw) -> str:
        import cv2

        filename = f"{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}.png"
        path = self.captures_dir / filename
        cv2.imwrite(str(path), raw)
        return str(path)

    def _loop(self) -> None:
        import cv2
        import mss
        import numpy as np

        last_kept_gray = None
        prev_gray = None
        last_motion_ts: float | None = None

        try:
            with mss.mss() as sct:
                monitor = sct.monitors[0]  # all monitors combined
                while not self._stop_event.is_set():
                    raw = np.array(sct.grab(monitor))
                    gray = cv2.cvtColor(raw, cv2.COLOR_BGRA2GRAY)
                    now = time.time()

                    if prev_gray is not None:
                        motion = _diff_ratio(prev_gray, gray)
                        if motion > self.motion_ratio:
                            last_motion_ts = now

                    settled = last_motion_ts is None or (now - last_motion_ts) >= self.settle_sec
                    if settled:
                        baseline_diff = 1.0 if last_kept_gray is None else _diff_ratio(last_kept_gray, gray)
                        if baseline_diff > self.diff_threshold:
                            path = self._save_frame(raw)
                            last_kept_gray = gray
                            try:
                                self.on_significant_frame(path)
                            except Exception:
                                logger.exception("on_significant_frame callback failed")

                    prev_gray = gray
                    self._stop_event.wait(self.interval_sec)
        except Exception:
            logger.exception("Screen monitor loop crashed for project %s", self.project_id)


def _diff_ratio(a, b) -> float:
    import cv2

    diff = cv2.absdiff(a, b)
    _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)
    return cv2.countNonZero(thresh) / thresh.size
