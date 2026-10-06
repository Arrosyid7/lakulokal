"""Adapter dari core processing ke aplikasi web.

Tujuan: memastikan satu engine pemrosesan dipakai oleh semua entry point web.
"""

import os
from typing import Any, List

try:
    from clipper_core import process_custom_order, process_auto_order
except ImportError as exc:  # pragma: no cover
    process_custom_order = None
    process_auto_order = None
    _IMPORT_ERROR = exc
else:
    _IMPORT_ERROR = None


def run_clip_task(url: str, mode: str, output_dir: str, **kwargs) -> List[str]:
    """Run processing using the same engine for all UI entry points."""
    if _IMPORT_ERROR is not None:
        raise RuntimeError(f"Core processing unavailable: {_IMPORT_ERROR}")

    if mode == "custom":
        segments = kwargs.get("segments", [{"start": "00:00", "end": "00:30"}])
        if process_custom_order is None:
            raise RuntimeError("process_custom_order tidak tersedia")
        return process_custom_order(url, segments, output_dir)

    groq_key = kwargs.get("groq_key") or os.getenv("GROQ_API_KEY", "")
    max_clips = int(kwargs.get("max_clips", 5) or 5)
    if process_auto_order is None:
        raise RuntimeError("process_auto_order tidak tersedia")
    return process_auto_order(url, max_clips, output_dir, groq_key)
