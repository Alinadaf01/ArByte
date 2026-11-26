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

    def test_discount_lines_reduce_final_total_and_are_labeled(self):
        response = self._create(
            discount_lines=[
                {"label": "تخفیف بابت کیف اشانتیون", "amount": 1_900_000},
                {"label": "تخفیف نقدی", "amount": 1_000_000},
            ]
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["discount_total"], 2_900_000)
        self.assertEqual(response.data["final_total"], 91_900_000 - 2_900_000)
        labels = {line["label"]: line["amount"] for line in response.data["discount_lines"]}
        self.assertEqual(labels["تخفیف بابت کیف اشانتیون"], 1_900_000)
        self.assertEqual(labels["تخفیف نقدی"], 1_000_000)

    def test_discount_lines_cannot_exceed_subtotal(self):
        response = self._create(discount_lines=[{"label": "تخفیف نقدی", "amount": 999_999_999}])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_discount_line_missing_label_rejected(self):
        response = self._create(discount_lines=[{"label": "", "amount": 1000}])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_unit_price_override_used_instead_of_catalog_price(self):
        """درخواست مدیر — همین واحد فیزیکی وضعیت بهتری دارد (باتری/هارد
        سالم‌تر) و دستی گران‌تر از قیمت کاتالوگ فروخته می‌شود."""
        response = self._create(
            items=[{"variant_id": self.variant.pk, "quantity": 1, "unit_price": 130_000_000}]
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["final_total"], 130_000_000)
        item = Order.objects.get(order_number=response.data["order_number"]).items.first()
        self.assertEqual(item.unit_price, 130_000_000)

    def test_unit_price_override_must_be_positive(self):
        response = self._create(items=[{"variant_id": self.variant.pk, "quantity": 1, "unit_price": 0}])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_condition_fields_saved_on_order_item(self):
        response = self._create(
            items=[
                {
                    "variant_id": self.variant.pk,
                    "quantity": 1,
                    "grade": "A+",
                    "battery_health_percent": 92,
                    "battery_cycle_count": 140,
                    "storage_health_percent": 97,
                }
            ]
        )
        self.assertEqual(response.status_code, 201, response.data)
        item = Order.objects.get(order_number=response.data["order_number"]).items.first()
        self.assertEqual(item.grade, "A+")
        self.assertEqual(item.battery_health_percent, 92)
        self.assertEqual(item.battery_cycle_count, 140)
        self.assertEqual(item.storage_health_percent, 97)
        self.assertEqual(response.data["items"][0]["grade"], "A+")
        self.assertEqual(response.data["items"][0]["battery_health_percent"], 92)


class AdminOrderEditTests(AdminApiTestMixin, APITestCase):
    """درخواست مدیر — سفارش پرداخت‌شده قابل اصلاح باشد: آدرس اشتباه‌ثبت‌شده،
    یا جایگزینی محصول با محصول دیگر (موجودی/فاکتور/جمع هم درست شود)."""

    def setUp(self):
        enable_payments()
        self.staff = self.make_staff()
        self.client.force_authenticate(user=self.staff)
        self.product = self.make_product(stock=3, price=91_900_000)
        self.variant = self.product.variants.first()
        self.other_product = self.make_product(
            sku="TEST-002", slug="test-product-2", name="Test Product 2", price=150_000_000, stock=2
        )
        self.other_variant = self.other_product.variants.first()
        response = self.client.post(
            reverse("admin-order-manual-create"),
            {
                "mobile": "09999674492",
                "recipient_name": "مشتری تلفنی",
                "shipping_province": "تهران",
                "shipping_city": "تهران",
                "shipping_address_line": "خیابان اشتباه",
                "items": [{"variant_id": self.variant.pk, "quantity": 1}],
                "payment_plan": "BANK_TRANSFER",
                "mark_paid": True,
            },
            format="json",
        )
        assert response.status_code == 201, response.data
        self.order = Order.objects.get(order_number=response.data["order_number"])

    def _advance_to_shipped(self):
        from apps.orders import fulfilment, order_status

        order_status.transition_to(self.order, "PROCESSING", user=self.staff)
        order_status.transition_to(self.order, "READY_TO_SHIP", user=self.staff)
        fulfilment.ship_order(
            self.order.pk, provider="تیپاکس", tracking_number="TRK-1", tracking_url=None, user=self.staff
        )
        self.order.refresh_from_db()

    def _patch_address(self, **overrides):
        payload = {
            "mobile": "09121234567",
            "recipient_name": "مشتری درست",
            "shipping_province": "تهران",
            "shipping_city": "تهران",
            "shipping_address_line": "خیابان درست، پلاک ۱",
        }
        payload.update(overrides)
        return self.client.patch(
            reverse("admin-order-update-address", args=[self.order.pk]), payload, format="json"
        )

    def test_update_address_on_paid_order(self):
        response = self._patch_address()
        self.assertEqual(response.status_code, 200, response.data)
        self.order.refresh_from_db()
        self.assertEqual(self.order.shipping_address_line, "خیابان درست، پلاک ۱")
        self.assertEqual(self.order.shipping_recipient_name, "مشتری درست")

    def test_update_address_rejected_after_shipped(self):
        self._advance_to_shipped()
        self.assertEqual(self.order.status, "SHIPPED")
        response = self._patch_address()
        self.assertEqual(response.status_code, 400)

    def test_update_address_invalid_mobile_rejected(self):
        response = self._patch_address(mobile="123")
        self.assertEqual(response.status_code, 400)

    def _replace_item(self, **overrides):
        item = self.order.items.first()
        payload = {"variant_id": self.other_variant.pk, "quantity": 1}
        payload.update(overrides)
        return self.client.post(
            reverse("admin-order-replace-item", args=[self.order.pk, item.pk]), payload, format="json"
        )

    def test_replace_item_swaps_product_and_recomputes_total(self):
        response = self._replace_item()
        self.assertEqual(response.status_code, 200, response.data)
        self.order.refresh_from_db()
        item = self.order.items.first()
        self.assertEqual(item.variant_id, self.other_variant.pk)
        self.assertEqual(item.sku_snapshot, self.other_variant.sku)
        self.assertEqual(item.unit_price, 150_000_000)
        self.assertEqual(self.order.subtotal, 150_000_000)
        self.assertEqual(self.order.final_total, 150_000_000)

    def test_replace_item_releases_old_and_reserves_new_stock(self):
        from apps.catalog.models import ProductVariant
        from apps.public_api.cart_service import available_quantity_for

        old_available_before = available_quantity_for(self.variant)
        new_available_before = available_quantity_for(self.other_variant)
        response = self._replace_item()
        self.assertEqual(response.status_code, 200, response.data)
        # هر دو واریانت دوباره از DB خوانده می‌شوند — Inventory در همین پایتون
        # آبجکت از قبل cache شده بود (reverse OneToOne)، refresh واقعی نمی‌دهد.
        old_variant = ProductVariant.objects.select_related("inventory").get(pk=self.variant.pk)
        new_variant = ProductVariant.objects.select_related("inventory").get(pk=self.other_variant.pk)
        self.assertEqual(available_quantity_for(old_variant), old_available_before + 1)
        self.assertEqual(available_quantity_for(new_variant), new_available_before - 1)

    def test_replace_item_with_custom_price_and_condition(self):
        response = self._replace_item(unit_price=140_000_000, grade="B", battery_health_percent=80)
        self.assertEqual(response.status_code, 200, response.data)
        self.order.refresh_from_db()
        item = self.order.items.first()
        self.assertEqual(item.unit_price, 140_000_000)
        self.assertEqual(item.grade, "B")
        self.assertEqual(item.battery_health_percent, 80)
        self.assertEqual(self.order.final_total, 140_000_000)

    def test_replace_item_insufficient_stock_rejected(self):
        response = self._replace_item(quantity=99)
        self.assertEqual(response.status_code, 409)
        self.order.refresh_from_db()
        item = self.order.items.first()
        self.assertEqual(item.variant_id, self.variant.pk)

    def test_replace_item_rejected_after_shipped(self):
        self._advance_to_shipped()
        response = self._replace_item()
        self.assertEqual(response.status_code, 400)


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
