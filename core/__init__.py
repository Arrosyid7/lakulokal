"""Core processing package.

Semua logic pemrosesan utama dipusatkan di sini agar web form dan admin
menggunakan engine yang sama tanpa duplikasi.
"""

from .clipper_core_adapter import run_clip_task

__all__ = ["run_clip_task"]
