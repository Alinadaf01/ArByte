"""D-04 §۱ — صدور/تأیید OTP. otpRequestPerIp (packages/contracts/src/common/
rate-limits.ts) روی خودِ view با ScopedRateThrottle اعمال می‌شود؛
otpRequestPerMobile اینجا دستی چک می‌شود چون DRF's ScopedRateThrottle فقط
روی IP/کاربر کلید می‌سازد، نه یک فیلد دلخواه در بدنه‌ی درخواست."""

import logging
import random

from decouple import config
from django.conf import settings
from django.utils import timezone

from apps.notifications.services import NotificationService
from apps.users.models import OTPCode, User

from .errors import ApiError

logger = logging.getLogger(__name__)

# rate-limits.ts's otpRequestPerMobile — پیش‌فرض ۳ درخواست در ۱۰ دقیقه، به
# ازای شماره؛ طبق D-04 §۱ («از env قابل تنظیم») هر دو از env قابل override‌اند.
OTP_REQUEST_PER_MOBILE_LIMIT = config("OTP_REQUEST_PER_MOBILE_LIMIT", default=3, cast=int)
OTP_REQUEST_PER_MOBILE_WINDOW_MINUTES = config("OTP_REQUEST_PER_MOBILE_WINDOW_MINUTES", default=10, cast=int)


def _generate_code() -> str:
    # E-02 §۵ — کد ثابت dev برای e2e، فقط وقتی OTP_DEV_MODE روشن است (همان
    # گارد settings.py's OTP_DEV_MODE — هرگز با DEBUG=False قابل‌دسترس).
    if settings.OTP_DEV_MODE and settings.OTP_DEV_FIXED_CODE:
        return settings.OTP_DEV_FIXED_CODE
    length = settings.OTP_LENGTH
    return f"{random.randint(0, 10**length - 1):0{length}d}"


def request_otp(mobile: str) -> int:
    """Returns expiresInSeconds. Raises ApiError('RATE_LIMITED') if the
    per-mobile cap is hit."""
    window_start = timezone.now() - timezone.timedelta(minutes=OTP_REQUEST_PER_MOBILE_WINDOW_MINUTES)
    recent_count = OTPCode.objects.filter(phone=mobile, created_at__gte=window_start).count()
    if recent_count >= OTP_REQUEST_PER_MOBILE_LIMIT:
        raise ApiError("RATE_LIMITED", status=429)

    code = _generate_code()
    otp = OTPCode.issue(mobile, code)

    if settings.OTP_DEV_MODE:
        # کاوه‌نگار واقعی صدا زده نمی‌شود — فقط لاگ سرور، هرگز پاسخ HTTP.
        # print() هم دارد چون بدون یک LOGGING سراسری، پیام‌های سطح INFO
        # هیچ‌جای کنسول runserver دیده نمی‌شوند (پیکربندی پیش‌فرض جنگو).
        logger.info("OTP_DEV_MODE — %s -> %s", mobile, code)
        print(f"OTP_DEV_MODE — {mobile} -> {code}", flush=True)
    else:
        NotificationService.send_sms(mobile, "otp_login", {"code": code})

    return int((otp.expires_at - timezone.now()).total_seconds())


def verify_otp(mobile: str, code: str) -> User:
    """Returns the User — creating one on first-time login (OTP doubles as
    signup, no separate registration step exists in the contract). Raises
    ApiError('OTP_INVALID' | 'OTP_EXPIRED' | 'OTP_MAX_ATTEMPTS')."""
    otp = OTPCode.objects.filter(phone=mobile, used_at__isnull=True).order_by("-created_at").first()
    if not otp:
        raise ApiError("OTP_INVALID", status=400)
    if otp.attempts >= otp.MAX_ATTEMPTS:
        raise ApiError("OTP_MAX_ATTEMPTS", status=400)
    if otp.is_expired():
        raise ApiError("OTP_EXPIRED", status=400)
    if not otp.verify(code):
        raise ApiError("OTP_INVALID", status=400)

    user = User.objects.filter(phone=mobile).first()
    if not user:
        user = User.objects.create_user(phone=mobile, is_verified=True)
    elif not user.is_verified:
        user.is_verified = True
        user.save(update_fields=["is_verified"])
    return user
