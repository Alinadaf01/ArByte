"""D-04 §۱ — صدور توکن، هم‌الگو با apps/admin_api/auth.py's
RefreshToken.for_user() (نه TokenObtainPairSerializer سفارشی)."""

from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User


def to_auth_user(user: User) -> dict:
    return {
        "id": str(user.pk),
        "mobile": user.phone,
        "firstName": user.first_name or None,
        "lastName": user.last_name or None,
    }


def issue_tokens(user: User) -> tuple[str, str]:
    """Normal OTP-login session — real access + refresh token pair."""
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token), str(refresh)


def issue_impersonation_access_token(*, target_user: User, issued_by_label: str, started_at) -> str:
    """الحاقیه §۶ — سشن جعل‌هویت فقط یک access token محدود می‌گیرد، بدون
    refresh (ImpersonateExchangeResponseSchema هیچ refreshToken ندارد) —
    با انقضای همان access token (۳۰ دقیقه، SIMPLE_JWT)، سشن تمام می‌شود.
    claim های `imp`/`imp_by`/`imp_started_at` را IsNotImpersonating
    (apps/users/permissions.py) و GET /auth/me هر دو می‌خوانند."""
    refresh = RefreshToken.for_user(target_user)
    access = refresh.access_token
    access["imp"] = True
    access["imp_by"] = issued_by_label
    access["imp_started_at"] = started_at.isoformat()
    return str(access)
