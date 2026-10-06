"""Wrapper untuk AI pipeline yang dipakai oleh web app dan internal tools."""

import os


def get_groq_key() -> str:
    return os.getenv("GROQ_API_KEY", "")


def is_groq_ready() -> bool:
    return bool(get_groq_key())
