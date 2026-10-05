"""AUDIT-3 — بخش «بله پی» پنل: تنظیمات، تست اتصال، فعالیت پرداخت‌ها."""

import json
from datetime import timedelta
from unittest import mock

from django.contrib.auth.models import Group
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.analytics.models import AdminActivityLog
from apps.orders.models import BalePaySession, Order, Payment
from apps.orders.testing import TEST_BOT_TOKEN, TEST_PROVIDER_TOKEN, enable_payments
from apps.settings.models import ApiCredential, SiteSettings
from apps.users.models import User

from .base import AdminApiTestMixin


class BalePayAdminTests(AdminApiTestMixin, TestCase):
    def setUp(self):
        enable_payments()
        self.admin = self.make_staff()
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_settings_never_return_secrets(self):
        data = self.client.get("/api/admin/balepay/settings/").data
        dumped = json.dumps(data, default=str)
        for secret in (TEST_BOT_TOKEN, TEST_PROVIDER_TOKEN):
            self.assertNotIn(secret, dumped)
        self.assertEqual(data["botToken"], "••••" + TEST_BOT_TOKEN[-4:])
        self.assertEqual((data["onlineLimitRial"], data["onlineLimitToman"]), (150_000_000, 15_000_000))
        self.assertTrue(data["ready"])

    def test_update_keeps_tokens_when_blank_and_logs_without_values(self):
        response = self.client.put(
            "/api/admin/balepay/settings/",
            {
                "botUsername": "@newbot",
                "botToken": "",
                "providerToken": "NEW-WALLET-TOKEN",
                "onlineLimitRial": 120_000_000,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        stored = json.loads(ApiCredential.objects.get(service="balepay").credentials)
        self.assertEqual(stored["botToken"], TEST_BOT_TOKEN)
        self.assertEqual(stored["providerToken"], "NEW-WALLET-TOKEN")
        self.assertEqual(SiteSettings.load().balepay_bot_username, "newbot")
        self.assertEqual(SiteSettings.load().online_payment_limit_rial, 120_000_000)
        log = AdminActivityLog.objects.get(action="balepay_settings")
        self.assertNotIn("NEW-WALLET-TOKEN", json.dumps(log.changes))

    def test_validation_and_permissions(self):
        bad = self.client.put("/api/admin/balepay/settings/", {"onlineLimitRial": -5}, format="json")
        self.assertEqual(bad.status_code, 400)
        limited = User.objects.create_user(phone="09121239991", is_staff=True, is_verified=True)
        limited.groups.add(Group.objects.get(name="مدیر سفارشات"))
        other = APIClient()
        other.force_authenticate(limited)
        self.assertEqual(other.get("/api/admin/balepay/settings/").status_code, 403)
        self.assertEqual(other.get("/api/admin/balepay/sessions/").status_code, 200)  # فعالیت = بخش سفارش‌ها

    def test_connection_test_is_logged_and_safe(self):
        with mock.patch("apps.orders.balepay.client.call", return_value={"username": "arbytebot"}):
            data = self.client.post("/api/admin/balepay/test/").data
        self.assertTrue(data["ok"])
        self.assertNotIn(TEST_BOT_TOKEN, json.dumps(data))
        self.assertTrue(AdminActivityLog.objects.filter(action="balepay_test").exists())

    def test_activity_list_and_filters(self):
        customer = self.make_customer()
        order = Order.objects.create(
            user=customer,
            shipping_recipient_name="x",
            shipping_mobile="0912",
            shipping_province="ت",
            shipping_city="ت",
            shipping_address_line="x",
            subtotal=10_000_000,
            final_total=10_000_000,
        )
        payment = Payment.objects.create(order=order, method="GATEWAY", provider="BALEPAY", amount=10_000_000)
        exp = timezone.now() + timedelta(hours=1)
        BalePaySession.objects.create(
            payment=payment,
            amount_rial=100_000_000,
            expires_at=exp,
            status="PAID",
            provider_payment_charge_id="8557291793",
            chat_id=123,
        )
        BalePaySession.objects.create(payment=payment, amount_rial=100_000_000, expires_at=exp, status="FAILED")
        rows = self.client.get("/api/admin/balepay/sessions/").data["results"]
        self.assertEqual(len(rows), 2)
        self.assertNotIn("token", rows[0])
        self.assertNotIn("chat_id", rows[0])
        paid = self.client.get("/api/admin/balepay/sessions/", {"status": "PAID"}).data["results"]
        self.assertEqual([r["provider_payment_charge_id"] for r in paid], ["8557291793"])
        self.assertEqual(paid[0]["amount"], 10_000_000)
        by_order = self.client.get("/api/admin/balepay/sessions/", {"order": order.order_number[-4:]}).data
        self.assertEqual(by_order["count"], 2)
        self.assertEqual(self.client.get("/api/admin/balepay/sessions/", {"amount_min": 20_000_000}).data["count"], 0)
