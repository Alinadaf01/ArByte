"""E-02 §۳/۴ — کوپن/روش ارسال روی سبد، فهرست‌های عمومی shipping-methods و
payment-methods، فیلدهای فاکتور، و idempotency-key روی POST /orders."""

from django.test import TestCase, TransactionTestCase
from rest_framework.test import APIClient

from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.content.models import Coupon
from apps.inventory.models import Inventory
from apps.orders.models import Order
from apps.orders.testing import enable_payments
from apps.public_api.jwt_tokens import issue_tokens
from apps.settings.models import ApiCredential, ShippingMethod, SiteSettings
from apps.users.models import Address, User


def _make_variant(sku="OPT-1", quantity=10, price=100_000_000) -> ProductVariant:
    brand = Brand.objects.create(name=f"Brand {sku}", slug=f"{sku.lower()}-brand")
    category = Category.objects.create(slug=f"{sku.lower()}-cat", name="دسته")
    product = Product.objects.create(
        slug=f"{sku.lower()}-product", name="محصول تست", brand=brand, category=category, condition="NEW"
    )
    variant = ProductVariant.objects.create(product=product, sku=sku, is_default=True, final_price=price)
    Inventory.objects.create(variant=variant, quantity=quantity)
    return variant


class CartCouponAndShippingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(phone="09121110060", is_verified=True)
        access, _ = issue_tokens(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.variant = _make_variant()
        self.client.post("/api/v1/cart/items", {"variantId": self.variant.pk, "quantity": 1}, format="json")

    def test_apply_valid_coupon_reflects_in_cart_totals(self):
        Coupon.objects.create(code="SAVE10", type="PERCENT", percent_basis_points=1000)
        response = self.client.post("/api/v1/cart/coupon", {"code": "save10"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        data = response.data["data"]
        self.assertEqual(data["coupon"]["code"], "SAVE10")
        self.assertEqual(data["discountTotal"], 10_000_000)
        self.assertEqual(data["finalTotal"], data["subtotal"] - 10_000_000 + data["shippingCost"])

    def test_apply_invalid_coupon_is_rejected_and_not_stored(self):
        response = self.client.post("/api/v1/cart/coupon", {"code": "NOPE"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "COUPON_INVALID")
        cart = self.client.get("/api/v1/cart").data["data"]
        self.assertIsNone(cart["coupon"])

    def test_remove_coupon(self):
        Coupon.objects.create(code="SAVE10", type="PERCENT", percent_basis_points=1000)
        self.client.post("/api/v1/cart/coupon", {"code": "SAVE10"}, format="json")
        response = self.client.delete("/api/v1/cart/coupon")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["data"]["coupon"])

    def test_apply_coupon_without_code_is_validation_error(self):
        response = self.client.post("/api/v1/cart/coupon", {}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_set_shipping_method_reflects_in_cart(self):
        method = ShippingMethod.objects.create(name="پیک", cost=500_000, is_active=True)
        response = self.client.patch(
            "/api/v1/cart/shipping-method", {"shippingMethodId": method.pk}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        data = response.data["data"]
        self.assertEqual(data["shippingMethod"]["id"], str(method.pk))
        self.assertEqual(data["shippingCost"], 500_000)

    def test_shipping_method_free_above_threshold(self):
        method = ShippingMethod.objects.create(name="پیک", cost=500_000, free_above=50_000_000, is_active=True)
        self.client.patch("/api/v1/cart/shipping-method", {"shippingMethodId": method.pk}, format="json")
        cart = self.client.get("/api/v1/cart").data["data"]
        self.assertEqual(cart["shippingCost"], 0)  # subtotal ۱۰۰ میلیون >= آستانه ۵۰ میلیون

    def test_unknown_shipping_method_is_not_found(self):
        response = self.client.patch("/api/v1/cart/shipping-method", {"shippingMethodId": 999999}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_missing_shipping_method_id_is_validation_error(self):
        response = self.client.patch("/api/v1/cart/shipping-method", {}, format="json")
        self.assertEqual(response.status_code, 400)


class PublicOptionListTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_shipping_methods_lists_only_active_ordered(self):
        # داده‌ی seed دموی settings.0003 هم در دیتابیس تست هست — فقط ترتیب
        # نسبیِ دوتای تازه‌ساخته و غیبتِ غیرفعال را چک می‌کنیم، نه کل فهرست.
        ShippingMethod.objects.create(name="ارزان-تست", cost=100_000, is_active=True, order=100)
        ShippingMethod.objects.create(name="سریع-تست", cost=800_000, is_active=True, order=99)
        ShippingMethod.objects.create(name="غیرفعال-تست", cost=1, is_active=False, order=0)
        response = self.client.get("/api/v1/shipping-methods")
        self.assertEqual(response.status_code, 200)
        names = [m["name"] for m in response.data["data"]]
        self.assertNotIn("غیرفعال-تست", names)
        self.assertLess(names.index("سریع-تست"), names.index("ارزان-تست"))

    def test_payment_methods_empty_when_nothing_configured(self):
        response = self.client.get("/api/v1/payment-methods")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"], [])

    def test_payment_methods_includes_card_to_card_when_configured(self):
        settings_row = SiteSettings.load()
        settings_row.card_to_card_holder_name = "علی نداف"
        settings_row.card_to_card_number = "6037-0000-0000-0000"
        settings_row.card_to_card_sheba = "IR000000000000000000000000"
        settings_row.save()
        response = self.client.get("/api/v1/payment-methods")
        methods = [m["method"] for m in response.data["data"]]
        self.assertIn("MANUAL_CARD_TO_CARD", methods)

    def test_payment_methods_ignores_gateway_without_valid_credentials(self):
        ApiCredential.objects.create(service="balepay", is_active=False, credentials="")
        response = self.client.get("/api/v1/payment-methods")
        methods = [m["method"] for m in response.data["data"]]
        self.assertNotIn("GATEWAY", methods)

    def test_payment_methods_includes_gateway_with_valid_credentials(self):
        ApiCredential.objects.create(
            service="balepay", is_active=True, credentials='{"merchantId": "x"}'
        )
        response = self.client.get("/api/v1/payment-methods")
        gateway = next(m for m in response.data["data"] if m["method"] == "GATEWAY")
        self.assertEqual(gateway["provider"], "BALEPAY")


class OrderInvoiceAndIdempotencyTests(TransactionTestCase):
    def setUp(self):
        enable_payments(limit_rial=10**12)  # AUDIT-2 — مثل تولید پیکربندی، سقف خارج از دامنه‌ی این تست
        self.client = APIClient()
        self.user = User.objects.create_user(phone="09121110061", is_verified=True)
        access, _ = issue_tokens(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.address = Address.objects.create(
            user=self.user, province="تهران", city="تهران", line="خیابان تست",
            postal_code="1234567890", receiver_name="کاربر تست", receiver_phone="09121110061",
        )
        ShippingMethod.objects.create(name="پست", cost=0, is_active=True)

    def _add_to_cart(self, variant, quantity=1):
        self.client.post("/api/v1/cart/items", {"variantId": variant.pk, "quantity": quantity}, format="json")

    def test_corporate_invoice_requires_company_name_and_national_id(self):
        variant = _make_variant(sku="INV-1")
        self._add_to_cart(variant)
        response = self.client.post(
            "/api/v1/orders",
            {"addressId": self.address.pk, "paymentMethod": "GATEWAY", "invoiceType": "CORPORATE"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_corporate_invoice_fields_persisted(self):
        variant = _make_variant(sku="INV-2")
        self._add_to_cart(variant)
        response = self.client.post(
            "/api/v1/orders",
            {
                "addressId": self.address.pk, "paymentMethod": "GATEWAY", "invoiceType": "CORPORATE",
                "companyName": "شرکت آزمایشی", "nationalId": "12345678901", "economicCode": "987654321",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        invoice = response.data["data"]["invoice"]
        self.assertEqual(invoice["type"], "CORPORATE")
        self.assertEqual(invoice["companyName"], "شرکت آزمایشی")
        self.assertEqual(invoice["nationalId"], "12345678901")

    def test_duplicate_idempotency_key_returns_same_order(self):
        variant = _make_variant(sku="IDEMP-1", quantity=5)
        self._add_to_cart(variant)
        body = {"addressId": self.address.pk, "paymentMethod": "GATEWAY"}
        first = self.client.post(
            "/api/v1/orders", body, format="json", HTTP_IDEMPOTENCY_KEY="key-abc"
        )
        self.assertEqual(first.status_code, 201, first.data)

        # سبد از چک‌اوت اول خالی شده — تلاش تکراری هرگز نباید سبدِ خالی را
        # لمس کند، یعنی همان سفارش اول باید بدون خطا برگردد.
        second = self.client.post(
            "/api/v1/orders", body, format="json", HTTP_IDEMPOTENCY_KEY="key-abc"
        )
        self.assertEqual(second.status_code, 201, second.data)
        self.assertEqual(first.data["data"]["orderNumber"], second.data["data"]["orderNumber"])
        self.assertEqual(Order.objects.count(), 1)

    def test_checkout_falls_back_to_carts_stored_shipping_method_and_coupon(self):
        Coupon.objects.create(code="CARTCPN", type="AMOUNT", amount_toman=1_000_000)
        method = ShippingMethod.objects.create(name="اکسپرس", cost=250_000, is_active=True)
        variant = _make_variant(sku="FALLBACK-1")
        self._add_to_cart(variant)
        self.client.post("/api/v1/cart/coupon", {"code": "CARTCPN"}, format="json")
        self.client.patch("/api/v1/cart/shipping-method", {"shippingMethodId": method.pk}, format="json")

        response = self.client.post(
            "/api/v1/orders", {"addressId": self.address.pk, "paymentMethod": "GATEWAY"}, format="json"
        )
        self.assertEqual(response.status_code, 201, response.data)
        data = response.data["data"]
        self.assertEqual(data["shippingCost"], 250_000)
        self.assertEqual(data["discountTotal"], 1_000_000)

    def test_order_snapshots_shipping_method_name_and_variant_name(self):
        """روش ارسال بعد از خالی‌شدن سبد و ویرایش/حذف ShippingMethod روی سفارش
        می‌ماند؛ variant_name_snapshot نام واریانت است نه SKU."""
        method = ShippingMethod.objects.create(name="تحویل حضوری-تست", cost=0, is_active=True, order=0)
        variant = _make_variant(sku="SNAP-1")
        variant.name = "32GB/1TB"
        variant.save(update_fields=["name"])
        self._add_to_cart(variant)
        response = self.client.post(
            "/api/v1/orders",
            {"addressId": self.address.pk, "paymentMethod": "GATEWAY", "shippingMethodId": method.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        method.delete()
        order = Order.objects.get(order_number=response.data["data"]["orderNumber"])
        self.assertEqual(order.shipping_method_name, "تحویل حضوری-تست")
        item = order.items.get()
        self.assertEqual(item.variant_name_snapshot, "32GB/1TB")
        self.assertEqual(item.sku_snapshot, "SNAP-1")
