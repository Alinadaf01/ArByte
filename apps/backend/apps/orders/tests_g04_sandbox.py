"""G-04 — `payment_sandbox_check` همیشه روی sandbox می‌رود و لینک پرداخت را چاپ می‌کند."""

import json
from io import StringIO
from unittest.mock import MagicMock, patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from apps.settings.models import ApiCredential


class PaymentSandboxCheckTests(TestCase):
    def test_uses_sandbox_even_when_credential_is_live(self):
        ApiCredential.objects.create(service="zarinpal", credentials=json.dumps({"merchantId": "x" * 36}), is_active=True, is_sandbox=False)
        response = MagicMock()
        response.json.return_value = {"data": {"code": 100, "authority": "A000TEST"}, "errors": []}
        out = StringIO()
        with patch("apps.orders.providers.zarinpal.requests.post", return_value=response) as post:
            call_command("payment_sandbox_check", "zarinpal", stdout=out)
        self.assertIn("sandbox.zarinpal.com", post.call_args.args[0])
        self.assertIn("sandbox.zarinpal.com/pg/StartPay/A000TEST", out.getvalue())

    def test_without_credential_fails_clearly(self):
        with self.assertRaises(CommandError):
            call_command("payment_sandbox_check", "zarinpal")
