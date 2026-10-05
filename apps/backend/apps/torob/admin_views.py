"""AUDIT-6 — پنل «ترب»: وضعیت اتصال، آخرین دریافت‌ها، خطاها و «Validate feed».

کلید عمومی فقط با اثرانگشت نشان داده می‌شود؛ خود کلید و هیچ توکنی به
مرورگر برنمی‌گردد. ویرایش کلید/فعال‌سازی از همان «کلیدهای API» تنظیمات.
"""

from datetime import timedelta

from django.conf import settings
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin_api.activity import log_admin_action
from apps.admin_api.permissions import require_section

from . import feed
from .auth import TorobAuthError, active_credential, configured_key
from .models import TorobFetchLog


def endpoint_url() -> str:
    return f"{settings.BACKEND_BASE_URL.rstrip('/')}/api/torob/v3/products"


class AdminTorobStatusView(APIView):
    permission_classes = [require_section("settings", action="view")]

    def get(self, request):
        credential = active_credential()
        key_error = ""
        fingerprint = None
        try:
            key = configured_key(credential) if credential else None
            fingerprint = key.fingerprint if key else None
        except TorobAuthError as exc:
            key_error = str(exc)

        since = timezone.now() - timedelta(hours=24)
        recent = TorobFetchLog.objects.filter(created_at__gte=since)
        stats = recent.aggregate(
            requests=Count("id"),
            errors=Count("id", filter=~Q(status_code=200)),
            invalidItems=Sum("invalid_count"),
        )
        last_ok = TorobFetchLog.objects.filter(status_code=200).first()
        last_errors = TorobFetchLog.objects.exclude(error="").values("created_at", "mode", "status_code", "error")[:10]
        return Response(
            {
                "enabled": credential is not None,
                "keyConfigured": fingerprint is not None,
                "keyFingerprint": fingerprint,
                "keyError": key_error,
                "endpointUrl": endpoint_url(),
                "itemCount": feed.page_query(feed.SORT_PRODUCT_ID).count(),
                "lastFetchAt": last_ok.created_at if last_ok else None,
                "lastFetchItems": last_ok.item_count if last_ok else 0,
                "last24h": {
                    "requests": stats["requests"] or 0,
                    "errors": stats["errors"] or 0,
                    "invalidItems": stats["invalidItems"] or 0,
                },
                "recentErrors": [
                    {
                        "at": row["created_at"],
                        "mode": row["mode"],
                        "status": row["status_code"],
                        "error": row["error"],
                    }
                    for row in last_errors
                ],
            }
        )


class AdminTorobValidateView(APIView):
    """فقط اعتبارسنجی؛ هیچ چیزی به ترب فرستاده نمی‌شود."""

    permission_classes = [require_section("settings", action="view")]

    def post(self, request):
        result = feed.validate_everything()
        log_admin_action(
            user=request.user,
            action="torob_validate",
            model_name="TorobFeed",
            object_id="v3",
            changes={"checked": result["checked"], "invalid": result["invalid"]},
        )
        return Response(result)
