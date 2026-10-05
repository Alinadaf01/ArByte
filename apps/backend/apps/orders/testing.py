"""AUDIT-2 — کمک‌تست مشترک: روش‌های پرداخت را مثل تولید پیکربندی می‌کند.

قبلاً تست‌ها بدون هیچ درگاه پیکربندی‌شده‌ای «GATEWAY» می‌ساختند؛ حالا سرور
روش غیرفعال را رد می‌کند، پس تست‌ها باید مثل تولید آن را فعال کنند.
"""

import json

from apps.settings.models import ApiCredential, SiteSettings

TEST_BOT_TOKEN = "123456:test-bot-token"  # noqa: S105 — مقدار تست
TEST_PROVIDER_TOKEN = "test-provider-wallet-token"  # noqa: S105
TEST_WEBHOOK_SECRET = "w" * 40  # noqa: S105


def enable_payments(*, limit_rial: int = 150_000_000, bank: bool = True, online: bool = True) -> None:
    settings_obj = SiteSettings.load()
    settings_obj.online_payment_limit_rial = limit_rial
    settings_obj.balepay_bot_username = "arbytebot"
    if bank:
        settings_obj.card_to_card_holder_name = "آربایت"
        settings_obj.card_to_card_number = "6037991111111111"
        settings_obj.card_to_card_sheba = "IR000000000000000000000001"
        settings_obj.card_to_card_active = True
    settings_obj.save()
    if online:
        ApiCredential.objects.update_or_create(
            service="balepay",
            defaults={
                "is_active": True,
                "credentials": json.dumps(
                    {
                        "botToken": TEST_BOT_TOKEN,
                        "providerToken": TEST_PROVIDER_TOKEN,
                        "webhookSecret": TEST_WEBHOOK_SECRET,
                    }
                ),
            },
        )
