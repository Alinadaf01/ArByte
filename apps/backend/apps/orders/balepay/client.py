"""کلاینت حداقلی Bale Bot API (`https://tapi.bale.ai/bot<token>/<method>`).

سقف زمانی و تلاش مجدد با backoff برای خطای شبکه/5xx/429؛ خطای 4xx تکرار
نمی‌شود. آدرس شامل توکن است، پس هیچ پیام خطایی آدرس یا توکن را حمل نمی‌کند.
"""

import logging
import time

import requests

logger = logging.getLogger(__name__)

API_BASE = "https://tapi.bale.ai"
TIMEOUT_SECONDS = 10
RETRY_DELAYS = (0.5, 1.5, 4.0)


class BaleApiError(Exception):
    """پیام امن (بدون توکن)."""


def call(bot_token: str, method: str, payload: dict | None = None, *, retries: bool = True) -> dict:
    if not bot_token:
        raise BaleApiError("توکن ربات بله تنظیم نشده است.")
    url = f"{API_BASE}/bot{bot_token}/{method}"
    attempts = (0.0, *RETRY_DELAYS) if retries else (0.0,)
    last_error = "unknown"
    for delay in attempts:
        if delay:
            time.sleep(delay)
        try:
            response = requests.post(url, json=payload or {}, timeout=TIMEOUT_SECONDS)
        except requests.RequestException as exc:
            last_error = type(exc).__name__
            continue
        if response.status_code == 429 or response.status_code >= 500:
            last_error = f"HTTP {response.status_code}"
            continue
        try:
            body = response.json()
        except ValueError:
            raise BaleApiError(f"{method}: پاسخ نامعتبر (HTTP {response.status_code})") from None
        if not body.get("ok"):
            description = str(body.get("description") or f"HTTP {response.status_code}")[:200]
            raise BaleApiError(f"{method}: {description}")
        return body.get("result") or {}
    logger.warning("bale %s failed after retries: %s", method, last_error)
    raise BaleApiError(f"{method}: سرور بله پاسخ نداد ({last_error}).")
