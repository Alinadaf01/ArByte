"""D-03 §2 — the Arbyte response envelope for /api/v1/, scoped to this app
only (/api/admin/ keeps vybeshop's own DRF shell untouched — see
PublicAPIView.handle_exception below, which is set per-view, not via the
global REST_FRAMEWORK EXCEPTION_HANDLER setting).

Mirrors apps/api/src/common/http/success-response.ts +
apps/api/src/common/filters/all-exceptions.filter.ts field-for-field."""

import logging
import math

from django.http import Http404
from rest_framework.exceptions import APIException, NotAuthenticated, PermissionDenied, Throttled
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .errors import ERROR_MESSAGES, ApiError

logger = logging.getLogger(__name__)

# Mirrors DEFAULT_CODE_BY_STATUS in all-exceptions.filter.ts.
_DEFAULT_CODE_BY_STATUS = {
    400: "VALIDATION_ERROR",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    429: "RATE_LIMITED",
}


def success_response(data, request_id: str) -> dict:
    return {"data": data, "meta": {"requestId": request_id}}


def paginated_response(items: list, request_id: str, *, page: int, per_page: int, total: int) -> dict:
    return {
        "data": items,
        "meta": {
            "requestId": request_id,
            "pagination": {
                "page": page,
                "perPage": per_page,
                "total": total,
                "totalPages": math.ceil(total / per_page) if per_page else 0,
            },
        },
    }


class PublicAPIView(APIView):
    """Base class for every /api/v1/ view. `throttle_scope` applies
    RATE_LIMITS.publicApiPerIp (100/60s/ip, see config.settings
    DEFAULT_THROTTLE_RATES["public_api"]). `handle_exception` is overridden
    per-view (not EXCEPTION_HANDLER globally) so /api/admin/'s own error
    shape is untouched."""

    # D-04 §۱ — گزارش‌شده و رفع‌شده اینجا: تا این‌جا `throttle_scope` بدون
    # `throttle_classes` عملاً هیچ محدودیتی اعمال نمی‌کرد (DRF's
    # DEFAULT_THROTTLE_CLASSES هیچ‌جای REST_FRAMEWORK تنظیم نشده، پیش‌فرضش
    # خالی است) — یعنی publicApiPerIp از D-03 در واقعیت هرگز فعال نبود.
    # ScopedRateThrottle اینجا سراسری شد تا محدودیت OTP (این تسک) هم واقعی
    # کار کند، نه فقط مستند.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_api"

    def handle_exception(self, exc):
        request_id = getattr(self.request, "request_id", "unknown")

        if isinstance(exc, ApiError):
            body = {"code": exc.code, "message": exc.message, "requestId": request_id}
            if exc.field_errors:
                body["fieldErrors"] = exc.field_errors
            return Response(body, status=exc.status)

        if isinstance(exc, Http404):
            return Response(
                {"code": "NOT_FOUND", "message": ERROR_MESSAGES["NOT_FOUND"], "requestId": request_id},
                status=404,
            )
        if isinstance(exc, DRFValidationError):
            field_errors = _flatten_drf_validation_error(exc)
            return Response(
                {
                    "code": "VALIDATION_ERROR",
                    "message": ERROR_MESSAGES["VALIDATION_ERROR"],
                    "fieldErrors": field_errors,
                    "requestId": request_id,
                },
                status=400,
            )
        if isinstance(exc, NotAuthenticated):
            return Response(
                {"code": "UNAUTHORIZED", "message": ERROR_MESSAGES["UNAUTHORIZED"], "requestId": request_id},
                status=401,
            )
        if isinstance(exc, PermissionDenied):
            return Response(
                {"code": "FORBIDDEN", "message": ERROR_MESSAGES["FORBIDDEN"], "requestId": request_id},
                status=403,
            )
        if isinstance(exc, Throttled):
            return Response(
                {"code": "RATE_LIMITED", "message": ERROR_MESSAGES["RATE_LIMITED"], "requestId": request_id},
                status=429,
            )
        if isinstance(exc, APIException):
            status = exc.status_code
            code = _DEFAULT_CODE_BY_STATUS.get(status, "INTERNAL_ERROR")
            return Response(
                {"code": code, "message": str(exc.detail), "requestId": request_id},
                status=status,
            )

        # Unhandled exception — mirrors AllExceptionsFilter's unstructured-error
        # branch (log + generic 500, never leak internals to the client).
        logger.exception("Unhandled public API error")
        return Response(
            {"code": "INTERNAL_ERROR", "message": ERROR_MESSAGES["INTERNAL_ERROR"], "requestId": request_id},
            status=500,
        )


def _flatten_drf_validation_error(exc: DRFValidationError) -> dict[str, str]:
    detail = exc.detail
    if isinstance(detail, dict):
        return {key: " ".join(str(v) for v in value) if isinstance(value, list) else str(value) for key, value in detail.items()}
    if isinstance(detail, list):
        return {"_": " ".join(str(v) for v in detail)}
    return {"_": str(detail)}
