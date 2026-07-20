"""
Voice-to-text using faster-whisper (open-source, runs locally/offline).

The model is loaded once, lazily, and reused across requests -- loading it
per-request would add multi-second latency to every dictation snippet.
"""
from functools import lru_cache

from app.config import WHISPER_COMPUTE_TYPE, WHISPER_DEVICE, WHISPER_MODEL_SIZE


@lru_cache(maxsize=1)
def _model():
    from faster_whisper import WhisperModel

    return WhisperModel(
        WHISPER_MODEL_SIZE, device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE_TYPE
    )


def transcribe_audio(audio_path: str) -> str:
    """Transcribe a recorded dictation clip and return clean text.

    Whisper already handles noise reasonably well internally, so no separate
    denoising step is needed (this mirrors what worked in your earlier audio
    pipeline for the Python tooling project).
    """
    segments, _info = _model().transcribe(audio_path, vad_filter=True)
    text = " ".join(segment.text.strip() for segment in segments)
    return text.strip()
