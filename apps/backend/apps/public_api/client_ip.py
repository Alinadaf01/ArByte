"""G-02/G-03 — آی‌پی واقعی کاربر پشت BFF (Vercel) و nginx.

- BFF فروشگاه هر درخواست را از سرور خودش می‌فرستد؛ بدون این، همه‌ی کاربران
  یک آی‌پی (Vercel) داشتند و نرخ‌های per-IP (OTP، فرم تماس) و «بازدیدکننده‌ی
  یکتا» بی‌معنی بود. BFF آی‌پی را در `X-Client-IP` می‌گذارد و با
  `X-BFF-Secret` (= BFF_SHARED_SECRET) امضا می‌کند؛ بدون secret درست نادیده.
- nginx روی سرور `X-Real-IP` را بازنویسی می‌کند (کاربر نمی‌تواند جعل کند)؛
  فقط با TRUST_X_REAL_IP=True خوانده می‌شود.
"""

import ipaddress

from django.conf import settings
from django.utils.crypto import constant_time_compare
from rest_framework.throttling import ScopedRateThrottle


def _valid(ip: str) -> str | None:
    try:
        return str(ipaddress.ip_address(ip.strip()))
    except ValueError:
        return None


def client_ip(request) -> str:
    meta = getattr(request, "META", {})
    secret = getattr(settings, "BFF_SHARED_SECRET", "")
    if secret and constant_time_compare(meta.get("HTTP_X_BFF_SECRET", ""), secret):
        ip = _valid(meta.get("HTTP_X_CLIENT_IP", ""))
        if ip:
            return ip
    if getattr(settings, "TRUST_X_REAL_IP", False):
        ip = _valid(meta.get("HTTP_X_REAL_IP", ""))
        if ip:
            return ip
    return meta.get("REMOTE_ADDR", "") or "unknown"


class ClientIpScopedRateThrottle(ScopedRateThrottle):
    """ScopedRateThrottle با کلید آی‌پی واقعی کاربر (برای مهمان‌ها)."""

    def get_ident(self, request):
        return client_ip(request)
