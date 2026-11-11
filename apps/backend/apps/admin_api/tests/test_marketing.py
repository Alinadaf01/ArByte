from unittest.mock import patch

from django.urls import reverse
from rest_framework.test import APITestCase

from apps.orders.models import Cart, CartItem

from .base import AdminApiTestMixin


class AdminMarketingTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.product = self.make_product(stock=5)
        self.variant = self.product.variants.first()

    def test_audience_excludes_users_with_orders(self):
        no_order_user = self.make_customer(phone="09120000011")
        has_order_user = self.make_customer(phone="09120000012")
        from apps.orders.models import Order

        Order.objects.create(
            user=has_order_user, shipping_recipient_name="x", shipping_mobile="09120000012",
            shipping_province="تهران", shipping_city="تهران", shipping_address_line="...",
            subtotal=1000, final_total=1000,
        )
        response = self.client.get(reverse("admin-marketing-audience"))
        phones = {row["phone"] for row in response.data["results"]}
        self.assertIn(no_order_user.phone, phones)
        self.assertNotIn(has_order_user.phone, phones)

    def test_audience_shows_cart_item_count(self):
        user = self.make_customer(phone="09120000013")
        cart = Cart.objects.create(user=user)
        CartItem.objects.create(cart=cart, variant=self.variant, quantity=2, unit_price_snapshot=100000)
        response = self.client.get(reverse("admin-marketing-audience"))
        row = next(r for r in response.data["results"] if r["phone"] == user.phone)
        self.assertEqual(row["cart_item_count"], 1)

    def test_user_cart_contents(self):
        user = self.make_customer(phone="09120000014")
        cart = Cart.objects.create(user=user)
        CartItem.objects.create(cart=cart, variant=self.variant, quantity=3, unit_price_snapshot=100000)
        response = self.client.get(reverse("admin-marketing-user-cart", args=[user.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["quantity"], 3)
        self.assertEqual(response.data["items"][0]["sku"], self.variant.sku)

    def test_user_cart_empty_when_no_cart(self):
        user = self.make_customer(phone="09120000015")
        response = self.client.get(reverse("admin-marketing-user-cart", args=[user.pk]))
        self.assertEqual(response.data["items"], [])

    def test_campaign_send_creates_sms_logs(self):
        from apps.notifications.models import SmsLog

        u1 = self.make_customer(phone="09120000016")
        u2 = self.make_customer(phone="09120000017")
        with patch("apps.notifications.kavenegar_client.get_kavenegar_client") as client:
            client.return_value.sms_send.return_value = [{"messageid": 1}]
            response = self.client.post(
                reverse("admin-marketing-campaign-send"),
                {"user_ids": [u1.pk, u2.pk], "message": "تخفیف ویژه برای شما!"},
                format="json",
            )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["matched"], 2)
        logs = SmsLog.objects.filter(phone__in=[u1.phone, u2.phone])
        self.assertEqual(logs.count(), 2)
        self.assertTrue(all("تخفیف ویژه" in log.body for log in logs))

    def test_campaign_requires_message_and_users(self):
        self.assertEqual(
            self.client.post(reverse("admin-marketing-campaign-send"), {"user_ids": [], "message": "x"}, format="json").status_code,
            400,
        )
        self.assertEqual(
            self.client.post(reverse("admin-marketing-campaign-send"), {"user_ids": [1], "message": ""}, format="json").status_code,
            400,
        )
