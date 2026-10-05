"""AUDIT-6 — `POST /api/torob/v3/products` (Torob API v3).

پاسخ JSON خام مستند (نه پاکت DRF فروشگاه)؛ خطای ورودی 400 و خطای
احراز 401، هر دو با `{"error": "..."}`. هر درخواست در TorobFetchLog
ثبت می‌شود (بدون توکن/بدنه).
"""

import json
import logging
import random
import time
from datetime import timedelta

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from . import feed
from .auth import TorobAuthError, verify_request
from .models import TorobFetchLog

logger = logging.getLogger(__name__)
LOG_RETENTION = timedelta(days=30)


def _json(data: dict, status: int = 200) -> JsonResponse:
    response = JsonResponse(data, status=status, json_dumps_params={"ensure_ascii": False})
    response["Cache-Control"] = "no-store"
    return response


def _log(started: float, *, mode: str, status: int, parsed: dict | None = None, items=0, invalid=0, error=""):
    TorobFetchLog.objects.create(
        mode=mode,
        sort=(parsed or {}).get("sort", ""),
        page=(parsed or {}).get("page"),
        status_code=status,
        item_count=items,
        invalid_count=invalid,
        error=error[:500],
        duration_ms=int((time.monotonic() - started) * 1000),
    )
    if random.random() < 0.02:  # noqa: S311 — پاک‌سازی گاه‌به‌گاه، نه امنیتی
        TorobFetchLog.objects.filter(created_at__lt=timezone.now() - LOG_RETENTION).delete()


@csrf_exempt
@require_POST
def products(request):
    started = time.monotonic()
    try:
        verify_request(request)
    except TorobAuthError as exc:
        _log(started, mode="invalid", status=401, error=str(exc))
        return _json({"error": str(exc)}, status=401)

    try:
        body = json.loads(request.body or b"null")
        parsed = feed.parse_request(body)
    except (ValueError, feed.FeedRequestError) as exc:
        message = str(exc) if isinstance(exc, feed.FeedRequestError) else "request body must be valid JSON"
        _log(started, mode="invalid", status=400, error=message)
        return _json({"error": message}, status=400)

    data, invalid = feed.run(parsed)
    if invalid:
        # آیتم نامعتبر کنار گذاشته می‌شود و کل پاسخ را نمی‌شکند.
        logger.warning("torob: %d invalid items skipped: %s", len(invalid), invalid[:5])
    _log(
        started,
        mode=parsed["mode"],
        status=200,
        parsed=parsed,
        items=len(data["products"]),
        invalid=len(invalid),
        error="; ".join(f"{u}: {', '.join(p)}" for u, p in invalid[:3]),
    )
    return _json(data)
