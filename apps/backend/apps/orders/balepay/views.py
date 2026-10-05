"""AUDIT-2 — `POST /api/bale/webhook/<secret>` (Bale Bot API webhook).

بله امضای درخواست ندارد؛ امنیت با مسیر مخفی (`webhookSecret` رمزشده در
ApiCredential) و مقایسه‌ی زمان-ثابت. همه‌ی اعتبارسنجی پرداخت در service است.
همیشه ۲۰۰ برمی‌گردد (جز secret اشتباه) تا بله update را بی‌پایان تکرار نکند.
"""

import hmac
import json
import logging

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .config import load_config
from .service import handle_update

logger = logging.getLogger(__name__)
MIN_SECRET_LENGTH = 32


@csrf_exempt
@require_POST
def webhook(request, secret: str):
    expected = load_config().webhook_secret
    if len(expected) < MIN_SECRET_LENGTH or not hmac.compare_digest(secret.encode(), expected.encode()):
        return HttpResponse(status=404)
    try:
        update = json.loads(request.body or b"{}")
    except ValueError:
        return JsonResponse({"ok": False}, status=400)
    if isinstance(update, dict):
        try:
            handle_update(update)
        except Exception:  # noqa: BLE001 — لاگ کامل؛ بله نباید بی‌پایان تکرار کند
            logger.exception("bale webhook update failed")
    return JsonResponse({"ok": True})
