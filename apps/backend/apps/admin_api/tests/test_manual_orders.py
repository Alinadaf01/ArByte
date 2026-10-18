from django.urls import reverse
from rest_framework.test import APITestCase

from apps.orders.models import Order, OrderItemUnit
from apps.orders.testing import enable_payments
from apps.users.models import User

from .base import AdminApiTestMixin


class AdminManualOrderCreateTests(AdminApiTestMixin, APITestCase):
    """سفارش دستی (واتس‌اپ/تلفن) — مشتری با موبایل پیدا/ساخته می‌شود، قلم‌ها
    با قیمت/موجودی زنده اعتبارسنجی می‌شوند، و با mark_paid سفارش مستقیم
    PAID می‌شود بدون این‌که از مسیر چک‌اوت/ایمپرسونیت مشتری رد شود."""

    def setUp(self):
        enable_payments()
        self.client.force_authenticate(user=self.make_staff())
        self.product = self.make_product(stock=3, price=91_900_000)
        self.variant = self.product.variants.first()

    def _create(self, **overrides):
        payload = {
            "mobile": "09999674492",
            "recipient_name": "مشتری تلفنی",
            "shipping_province": "تهران",
            "shipping_city": "تهران",
            "shipping_address_line": "خیابان آزادی",
            "items": [{"variant_id": self.variant.pk, "quantity": 1}],
            "payment_plan": "BANK_TRANSFER",
        }
        payload.update(overrides)
        return self.client.post(reverse("admin-order-manual-create"), payload, format="json")

    def test_creates_order_and_new_customer(self):
        response = self._create()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "AWAITING_PAYMENT")
        self.assertEqual(response.data["final_total"], 91_900_000)
        customer = User.objects.get(phone="09999674492")
        self.assertTrue(customer.is_verified)
        self.assertEqual(Order.objects.filter(user=customer).count(), 1)

    def test_reuses_existing_customer_by_mobile(self):
        existing = self.make_customer(phone="09999674492")
        response = self._create()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Order.objects.get(order_number=response.data["order_number"]).user_id, existing.pk)
        self.assertEqual(User.objects.filter(phone="09999674492").count(), 1)

    def test_mark_paid_transitions_straight_to_paid(self):
        response = self._create(mark_paid=True)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "PAID")

    def test_insufficient_stock_rejected(self):
        response = self._create(items=[{"variant_id": self.variant.pk, "quantity": 99}])
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["shortages"][0]["variantId"], str(self.variant.pk))
        self.assertEqual(Order.objects.count(), 0)

    def test_invalid_mobile_rejected(self):
        response = self._create(mobile="123")
        self.assertEqual(response.status_code, 400)

    def test_variant_search(self):
        response = self.client.get(reverse("admin-order-variant-search"), {"search": self.product.name[:4]})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(row["sku"] == self.variant.sku for row in response.data))


class WarrantyCardOverrideTests(AdminApiTestMixin, APITestCase):
    """ثبت سریال با مهلت تست/گارانتی اختصاصی (مستقل از پیش‌فرض محصول)."""

    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.customer = self.make_customer()
        self.product = self.make_product(stock=1, requires_serial=True)
        self.product.warranty_months = 18
        self.product.save(update_fields=["warranty_months"])
        self.variant = self.product.variants.first()
        self.order = Order.objects.create(
            user=self.customer, shipping_recipient_name="مشتری", shipping_mobile="09120000000",
            shipping_province="تهران", shipping_city="تهران", shipping_address_line="...",
            subtotal=100000, final_total=100000, status="PAID",
        )
        from apps.orders.models import OrderItem

        self.item = OrderItem.objects.create(
            order=self.order, variant=self.variant, product_name_snapshot=self.product.name,
            sku_snapshot=self.variant.sku, unit_price=100000, quantity=1, final_price=100000,
        )

    def test_custom_warranty_and_test_period_saved_and_used_on_card(self):
        from apps.orders.fulfilment import ensure_units

        ensure_units(self.order)
        unit = OrderItemUnit.objects.get(order_item=self.item)
        response = self.client.post(
            reverse("admin-order-serials", args=[self.order.pk]),
            {"units": [{"id": unit.pk, "serial_number": "SN-OVR-1", "warranty_months": 3, "test_period_days": 7}]},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        unit.refresh_from_db()
        self.assertEqual(unit.warranty_months_override, 3)
        self.assertEqual(unit.test_period_days_override, 7)

        from apps.documents.warranty_card import build_warranty_card

        card = build_warranty_card(unit)
        self.assertEqual(card["warranty_months"], 3)
        self.assertEqual(card["test_period_days"], 7)

    def test_without_override_falls_back_to_product_and_site_defaults(self):
        from apps.orders.fulfilment import ensure_units

        ensure_units(self.order)
        unit = OrderItemUnit.objects.get(order_item=self.item)
        from apps.documents.warranty_card import build_warranty_card
        from apps.settings.models import SiteSettings

        card = build_warranty_card(unit)
        self.assertEqual(card["warranty_months"], 18)
        self.assertEqual(card["test_period_days"], SiteSettings.load().test_period_days)
