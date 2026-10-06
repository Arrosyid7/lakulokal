"""DOKU service untuk payment gateway publik."""

import os
import requests

DOKU_CLIENT_ID = os.getenv("DOKU_CLIENT_ID", "")
DOKU_SECRET_KEY = os.getenv("DOKU_SECRET_KEY", "")
DOKU_BASE_URL = os.getenv("DOKU_BASE_URL", "https://api.doku.com")
APP_BASE_URL = os.getenv("APP_BASE_URL", "https://lakulokal.my.id")


def is_doku_ready() -> bool:
    return bool(DOKU_CLIENT_ID and DOKU_SECRET_KEY)


def create_payment(order: dict):
    if not is_doku_ready():
        return None, "DOKU belum dikonfigurasi"

    payload = {
        "order": {
            "invoice_number": order["id"],
            "amount": int(float(order.get("amount", 0) or 0)),
            "currency": order.get("currency", "IDR"),
            "callback_url": f"{APP_BASE_URL}/sukses.html?order_id={order['id']}",
        },
        "metadata": {
            "order_id": order["id"],
            "mode": order.get("mode", "custom"),
        },
    }

    headers = {
        "Content-Type": "application/json",
        "Client-Id": DOKU_CLIENT_ID,
        "Secret-Key": DOKU_SECRET_KEY,
    }

    try:
        response = requests.post(
            f"{DOKU_BASE_URL}/checkout/v1/payment",
            json=payload,
            headers=headers,
            timeout=30,
        )
        if response.status_code not in (200, 201, 202):
            return None, f"DOKU error: {response.status_code} {response.text}"
        data = response.json()
        return {
            "payment_id": data.get("payment_id") or order["id"],
            "payment_url": data.get("payment_url") or data.get("checkout_url"),
        }, None
    except Exception as exc:  # pragma: no cover
        return None, str(exc)
