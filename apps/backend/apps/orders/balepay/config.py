"""تنظیمات بله‌پی از منابع موجود (AUDIT.md §۷/§۱۸ — معماری تنظیمات دوم ساخته نمی‌شود):

- محرمانه‌ها رمزشده در `ApiCredential(service="balepay").credentials`:
  `{"botToken", "providerToken", "webhookSecret"}`؛ `is_active` = فعال/غیرفعال،
  `is_sandbox` = حالت آزمایشی (کیف‌پول تست بله).
- غیرمحرمانه در SiteSettings: نام کاربری ربات و سقف پرداخت آنلاین (ریال).

هیچ‌کدام از توکن‌ها لاگ نمی‌شود و به هیچ API عمومی/مرورگر نمی‌رسد.
"""

import json
from dataclasses import dataclass

from apps.settings.models import ApiCredential, SiteSettings


@dataclass(frozen=True)
class BaleConfig:
    enabled: bool
    sandbox: bool
    bot_username: str
    bot_token: str
    provider_token: str
    webhook_secret: str

    @property
    def ready(self) -> bool:
        return bool(self.enabled and self.bot_username and self.bot_token and self.provider_token)


def load_config() -> BaleConfig:
    credential = ApiCredential.objects.filter(service="balepay").order_by("-is_active", "order", "pk").first()
    data: dict = {}
    if credential and credential.credentials:
        try:
            parsed = json.loads(credential.credentials)
            data = parsed if isinstance(parsed, dict) else {}
        except (TypeError, ValueError):
            data = {}
    return BaleConfig(
        enabled=bool(credential and credential.is_active),
        sandbox=bool(credential and credential.is_sandbox),
        bot_username=(SiteSettings.load().balepay_bot_username or "").lstrip("@").strip(),
        bot_token=str(data.get("botToken") or "").strip(),
        provider_token=str(data.get("providerToken") or "").strip(),
        webhook_secret=str(data.get("webhookSecret") or "").strip(),
    )
