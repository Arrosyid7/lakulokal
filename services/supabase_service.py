"""Supabase service untuk database utama aplikasi."""

import os

try:
    from supabase import create_client
except Exception:  # pragma: no cover
    create_client = None

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY and create_client else None


def is_supabase_ready() -> bool:
    return bool(supabase)


def save_order(order_id: str, payload: dict):
    if not supabase:
        return None
    try:
        return supabase.table("orders").upsert({
            "id": order_id,
            **payload,
        }).execute()
    except Exception as exc:  # pragma: no cover
        print(f"[supabase] save_order failed: {exc}")
        return None
