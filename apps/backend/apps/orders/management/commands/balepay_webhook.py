"""AUDIT-2 — ثبت/بررسی وب‌هوک ربات بله.

    manage.py balepay_webhook set      # secret تازه (اگر نیست) + setWebhook
    manage.py balepay_webhook info     # getWebhookInfo (بدون نمایش توکن)
    manage.py balepay_webhook delete
    manage.py balepay_webhook test     # getMe

secret رمزشده در همان ApiCredential(service="balepay") ذخیره می‌شود.
"""

import json
import secrets

from django.core.management.base import BaseCommand, CommandError

from apps.orders.balepay import client
from apps.orders.balepay.config import load_config
from apps.orders.balepay.service import test_connection, webhook_url
from apps.settings.models import ApiCredential


class Command(BaseCommand):
    help = "ثبت/بررسی وب‌هوک ربات بله‌پی"

    def add_arguments(self, parser):
        parser.add_argument("action", choices=["set", "info", "delete", "test"])

    def handle(self, *args, action, **options):
        if action == "test":
            self.stdout.write(json.dumps(test_connection(), ensure_ascii=False))
            return
        config = load_config()
        if not config.bot_token:
            raise CommandError("ApiCredential(service=balepay) با botToken ثبت نشده است.")
        try:
            if action == "info":
                info = client.call(config.bot_token, "getWebhookInfo")
                url = str(info.get("url") or "")
                info["url"] = url.rsplit("/", 1)[0] + "/<secret>" if url else ""
                self.stdout.write(json.dumps(info, ensure_ascii=False))
            elif action == "delete":
                client.call(config.bot_token, "deleteWebhook")
                self.stdout.write("deleted")
            else:
                secret = config.webhook_secret or self._new_secret()
                client.call(config.bot_token, "setWebhook", {"url": webhook_url(secret)})
                self.stdout.write(f"webhook set: {webhook_url('<secret>')}")
        except client.BaleApiError as exc:
            raise CommandError(str(exc)) from None

    def _new_secret(self) -> str:
        credential = ApiCredential.objects.filter(service="balepay").order_by("-is_active", "order", "pk").first()
        data = json.loads(credential.credentials or "{}")
        data["webhookSecret"] = secrets.token_urlsafe(32)
        credential.credentials = json.dumps(data)
        credential.save(update_fields=["credentials"])
        return data["webhookSecret"]
