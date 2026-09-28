"""D-04 §۱ — شش مسیر packages/contracts/src/auth/index.ts:
otp/request، otp/verify، refresh، logout، me، impersonate/exchange."""

from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from apps.orders.services import merge_guest_cart_into_user
from apps.users.models import ImpersonationTicket

from . import otp
from .envelope import PublicAPIView, success_response
from .errors import ApiError
from .jwt_tokens import issue_impersonation_access_token, issue_tokens, to_auth_user
from .validation import parse_mobile, parse_non_empty_string, parse_otp_code


class OtpRequestView(PublicAPIView):
    permission_classes = [AllowAny]
    throttle_scope = "otp_request"

    def post(self, request):
        mobile = parse_mobile(request.data.get("mobile"))
        expires_in_seconds = otp.request_otp(mobile)
        return Response(success_response({"expiresInSeconds": expires_in_seconds}, request.request_id))


class OtpVerifyView(PublicAPIView):
    permission_classes = [AllowAny]
    throttle_scope = "otp_verify"

    def post(self, request):
        mobile = parse_mobile(request.data.get("mobile"))
        code = parse_otp_code(request.data.get("code"))
        user = otp.verify_otp(mobile, code)

        # D-04 §۱ — «otp/verify پارامتر اختیاری cartSessionKey بگیرد و سبد
        # مهمان را در سبد کاربر ادغام کند». CamelCaseJSONParser بدنه‌ی
        # ورودی را قبل از رسیدن به اینجا snake_case کرده (config/settings.py).
        cart_session_key = request.data.get("cart_session_key")
        if cart_session_key:
            merge_guest_cart_into_user(cart_session_key, user)

        access_token, refresh_token = issue_tokens(user)
        data = {"accessToken": access_token, "refreshToken": refresh_token, "user": to_auth_user(user)}
        return Response(success_response(data, request.request_id))


class RefreshView(PublicAPIView):
    """SimpleJWT's own TokenRefreshSerializer (هم‌الگو با TokenRefreshView
    در apps/admin_api/urls.py) — ROTATE_REFRESH_TOKENS +
    BLACKLIST_AFTER_ROTATION (config/settings.py) یعنی این serializer خودش
    توکن قبلی را blacklist و jti/exp/iat تازه صادر می‌کند."""

    permission_classes = [AllowAny]

    def post(self, request):
        # CamelCaseJSONParser بدنه را snake_case کرده — refreshToken -> refresh_token.
        raw_refresh_token = request.data.get("refresh_token")
        if not raw_refresh_token:
            raise ApiError("VALIDATION_ERROR", status=400, field_errors={"refreshToken": "الزامی است."})

        serializer = TokenRefreshSerializer(data={"refresh": raw_refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, InvalidToken):
            raise ApiError("UNAUTHORIZED", status=401, message="refresh token معتبر نیست یا منقضی شده است.") from None

        validated = serializer.validated_data
        data = {"accessToken": validated["access"], "refreshToken": validated["refresh"]}
        return Response(success_response(data, request.request_id))


class LogoutView(PublicAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # بدون بدنه (LogoutResponseSchema)، پس مشخص نیست کدام refresh token
        # را باید blacklist کرد — همه‌ی توکن‌های هنوز-معتبر این کاربر
        # blacklist می‌شوند (هم‌الگو با AdminForceLogoutView در admin_api).
        for token in OutstandingToken.objects.filter(user=request.user):
            BlacklistedToken.objects.get_or_create(token=token)
        return Response(success_response({}, request.request_id))


class MeView(PublicAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = to_auth_user(request.user)
        token = request.auth
        if token and token.get("imp"):
            data["impersonation"] = {
                "by": token.get("imp_by", ""),
                "startedAt": token.get("imp_started_at", ""),
            }
        return Response(success_response(data, request.request_id))


class ImpersonateExchangeView(PublicAPIView):
    """الحاقیه §۶ — بلیت‌محور نه مجوزمحور؛ صدور بلیت سمت ادمین از قبل ساخته
    شده (AdminImpersonateView، apps/admin_api/account_admin.py). این تنها
    طرف مصرف (public) بود که تا این تسک وجود نداشت."""

    permission_classes = [AllowAny]

    def post(self, request):
        raw_ticket = parse_non_empty_string(request.data.get("ticket"), "ticket")
        try:
            ticket = ImpersonationTicket.objects.select_related("target_user", "issued_by").get(token=raw_ticket)
        except ImpersonationTicket.DoesNotExist:
            raise ApiError("IMPERSONATION_TICKET_INVALID", status=400) from None

        if ticket.used_at:
            raise ApiError("IMPERSONATION_TICKET_USED", status=400)
        if timezone.now() >= ticket.expires_at:
            raise ApiError("IMPERSONATION_TICKET_EXPIRED", status=400)

        ticket.used_at = timezone.now()
        ticket.save(update_fields=["used_at"])

        started_at = ticket.used_at
        issued_by_label = (ticket.issued_by.get_full_name() or ticket.issued_by.phone) if ticket.issued_by else "ادمین"
        access_token = issue_impersonation_access_token(
            target_user=ticket.target_user, issued_by_label=issued_by_label, started_at=started_at
        )
        data = {
            "accessToken": access_token,
            "user": to_auth_user(ticket.target_user),
            "impersonation": {"by": issued_by_label, "startedAt": started_at.isoformat()},
        }
        return Response(success_response(data, request.request_id))
