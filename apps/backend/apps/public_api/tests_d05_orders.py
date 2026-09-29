"""D-05 §۷ — ثبت سفارش، پرداخت (کارت‌به‌کارت + درگاه)، کوپن، پیگیری مهمان،
مرجوعی، لغو خودکار."""

import threading

from django.core.cache import cache
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.content.models import Coupon
from apps.inventory.models import Inventory
from apps.orders import order_status
from apps.orders.models import CouponUsage, Order, Payment, PaymentReceipt
from apps.public_api.jwt_tokens import issue_tokens
from apps.settings.models import ShippingMethod, SiteSettings
from apps.users.models import Address, User


def _make_variant(sku="ORD-1", quantity=10, price=10_000_000) -> ProductVariant:
    brand = Brand.objects.create(name=f"Brand {sku}", slug=f"{sku.lower()}-brand")
    category = Category.objects.create(slug=f"{sku.lower()}-cat", name="دسته")
    # E-03 §۳ — requires_serial پیش‌فرض مدل True است؛ این fixture برای
    # تست‌های خارج از دامنه‌ی سریال (پرداخت/کوپن/مرجوعی) است، پس صریح False.
    product = Product.objects.create(
        slug=f"{sku.lower()}-product", name="محصول سفارش", brand=brand, category=category, condition="NEW",
        requires_serial=False,
    )
    variant = ProductVariant.objects.create(product=product, sku=sku, is_default=True, final_price=price)
    Inventory.objects.create(variant=variant, quantity=quantity)
    return variant


def _make_shipping_method(cost=0) -> ShippingMethod:
    return ShippingMethod.objects.create(name="پست", cost=cost, is_active=True)


class OrderTestBase(TransactionTestCase):
    """TransactionTestCase — نه TestCase — چون تست همزمانی به تراکنش‌های
    واقعی جدا در دو ترد نیاز دارد (select_for_update باید واقعاً قفل کند)."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(phone="09121110050", is_verified=True)
        access, _ = issue_tokens(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.address = Address.objects.create(
            user=self.user, province="تهران", city="تهران", line="خیابان تست",
            postal_code="1234567890", receiver_name="کاربر تست", receiver_phone="09121110050",
        )
        _make_shipping_method()

    def _add_to_cart(self, variant, quantity=1):
        response = self.client.post("/api/v1/cart/items", {"variantId": variant.pk, "quantity": quantity}, format="json")
        self.assertEqual(response.status_code, 201, response.data)

    def _checkout(self, **extra):
        body = {"addressId": self.address.pk, "paymentMethod": "GATEWAY"}
        body.update(extra)
        return self.client.post("/api/v1/orders", body, format="json")


class CheckoutTests(OrderTestBase):
    def test_happy_path_reserves_stock_and_clears_cart(self):
        variant = _make_variant(sku="HAPPY-1", quantity=5)
        self._add_to_cart(variant, 2)

        response = self._checkout()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["data"]["status"], "AWAITING_PAYMENT")
        self.assertEqual(response.data["data"]["finalTotal"], 20_000_000)

        inventory = Inventory.objects.get(variant=variant)
        self.assertEqual(inventory.reserved_quantity, 2)

        cart = self.client.get("/api/v1/cart").data["data"]
        self.assertEqual(cart["items"], [])

    def test_empty_cart_is_rejected(self):
        response = self._checkout()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "CART_EMPTY")

    def test_price_changed_since_added_to_cart_blocks_order(self):
        variant = _make_variant(sku="PRICE-1", quantity=5)
        self._add_to_cart(variant, 1)
        variant.final_price = 99_000_000
        variant.save(update_fields=["final_price"])

        response = self._checkout()
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "PRICE_CHANGED")
        self.assertFalse(Order.objects.exists())

    def test_insufficient_stock_blocks_order(self):
        variant = _make_variant(sku="STOCK-1", quantity=1)
        self._add_to_cart(variant, 1)
        # موجودی بعد از افزودن به سبد کم شد (مثلاً سفارش دیگری آن را گرفت).
        Inventory.objects.filter(variant=variant).update(quantity=0)

        response = self._checkout()
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "INSUFFICIENT_STOCK")

    def test_concurrent_checkout_on_last_unit_only_one_succeeds(self):
        variant = _make_variant(sku="RACE-1", quantity=1)

        user_b = User.objects.create_user(phone="09121110051", is_verified=True)
        access_b, _ = issue_tokens(user_b)
        address_b = Address.objects.create(
            user=user_b, province="تهران", city="تهران", line="...", postal_code="1234567890",
            receiver_name="ب", receiver_phone="09121110051",
        )

        client_a = self.client
        self._add_to_cart(variant, 1)

        client_b = APIClient()
        client_b.credentials(HTTP_AUTHORIZATION=f"Bearer {access_b}")
        client_b.post("/api/v1/cart/items", {"variantId": variant.pk, "quantity": 1}, format="json")

        results = {}

        def _checkout(name, client, address_id):
            resp = client.post(
                "/api/v1/orders", {"addressId": address_id, "paymentMethod": "GATEWAY"}, format="json"
            )
            results[name] = resp.status_code

        t1 = threading.Thread(target=_checkout, args=("a", client_a, self.address.pk))
        t2 = threading.Thread(target=_checkout, args=("b", client_b, address_b.pk))
        t1.start()
        t1.join()
        t2.start()
        t2.join()

        statuses = sorted(results.values())
        self.assertEqual(statuses, [201, 409])  # فقط یکی موفق شد
        self.assertEqual(Order.objects.count(), 1)


class OrderListDetailTests(OrderTestBase):
    def test_detail_visible_only_to_owner(self):
        variant = _make_variant(sku="OWNER-1", quantity=5)
        self._add_to_cart(variant)
        order_number = self._checkout().data["data"]["orderNumber"]

        other = User.objects.create_user(phone="09121110052", is_verified=True)
        other_access, _ = issue_tokens(other)
        other_client = APIClient()
        other_client.credentials(HTTP_AUTHORIZATION=f"Bearer {other_access}")

        own_response = self.client.get(f"/api/v1/orders/{order_number}")
        self.assertEqual(own_response.status_code, 200)
        # E-03 §۴ — units فقط در جزئیات (مالک سفارش) پر می‌شود؛ بدون سریال
        # ثبت‌شده هنوز، آرایه‌ی خالی است ولی کلید هست (نه undefined).
        self.assertIn("units", own_response.data["data"]["items"][0])
        self.assertEqual(own_response.data["data"]["items"][0]["units"], [])

        other_response = other_client.get(f"/api/v1/orders/{order_number}")
        self.assertEqual(other_response.status_code, 404)  # نه ۴۰۳


class ReceiptTests(OrderTestBase):
    def setUp(self):
        super().setUp()
        settings_obj = SiteSettings.load()
        settings_obj.card_to_card_holder_name = "تست"
        settings_obj.card_to_card_number = "1111"
        settings_obj.card_to_card_sheba = "IR1"
        settings_obj.save()

        variant = _make_variant(sku="RECEIPT-1", quantity=5)
        self._add_to_cart(variant)
        resp = self._checkout(paymentMethod="MANUAL_CARD_TO_CARD")
        self.order_number = resp.data["data"]["orderNumber"]

    def _upload(self, *, content=b"fake", content_type="image/jpeg", amount=10_000_000):
        from django.core.files.uploadedfile import SimpleUploadedFile

        file_obj = SimpleUploadedFile("receipt.jpg", content, content_type=content_type)
        return self.client.post(
            f"/api/v1/orders/{self.order_number}/receipt", {"file": file_obj, "amount": amount}, format="multipart"
        )

    def test_upload_moves_order_to_payment_review(self):
        response = self._upload()
        self.assertEqual(response.status_code, 201, response.data)

        order = Order.objects.get(order_number=self.order_number)
        self.assertEqual(order.status, "PAYMENT_REVIEW")
        self.assertEqual(order.payment_status, "RECEIPT_UPLOADED")

    def test_upload_too_large_is_rejected(self):
        big = b"x" * (6 * 1024 * 1024)
        response = self._upload(content=big)
        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.data["code"], "UPLOAD_TOO_LARGE")

    def test_upload_invalid_type_is_rejected(self):
        response = self._upload(content_type="text/plain")
        self.assertEqual(response.status_code, 415)
        self.assertEqual(response.data["code"], "UPLOAD_INVALID_TYPE")

    def test_approve_moves_order_to_paid(self):
        from apps.orders import services as order_services

        self._upload()
        receipt = PaymentReceipt.objects.get(payment__order__order_number=self.order_number)
        order_services.approve_receipt(receipt=receipt, admin_user=self.user)

        order = Order.objects.get(order_number=self.order_number)
        self.assertEqual(order.status, "PAID")
        self.assertEqual(order.payment_status, "CONFIRMED")

    def test_reject_returns_order_to_awaiting_payment(self):
        from apps.orders import services as order_services

        self._upload()
        receipt = PaymentReceipt.objects.get(payment__order__order_number=self.order_number)
        order_services.reject_receipt(receipt=receipt, admin_user=self.user, reason="مبلغ نمی‌خورد")

        order = Order.objects.get(order_number=self.order_number)
        self.assertEqual(order.status, "AWAITING_PAYMENT")
        self.assertEqual(order.payment_status, "UNPAID")
        receipt.refresh_from_db()
        self.assertEqual(receipt.status, "REJECTED")
        self.assertEqual(receipt.rejection_reason, "مبلغ نمی‌خورد")

    def test_approve_twice_is_rejected(self):
        from apps.orders import services as order_services
        from apps.orders.services import CheckoutError

        self._upload()
        receipt = PaymentReceipt.objects.get(payment__order__order_number=self.order_number)
        order_services.approve_receipt(receipt=receipt, admin_user=self.user)
        receipt.refresh_from_db()

        with self.assertRaises(CheckoutError) as ctx:
            order_services.approve_receipt(receipt=receipt, admin_user=self.user)
        self.assertEqual(ctx.exception.code, "PAYMENT_ALREADY_CONFIRMED")


class PaymentCallbackTests(OrderTestBase):
    def setUp(self):
        super().setUp()
        variant = _make_variant(sku="CB-1", quantity=5)
        self._add_to_cart(variant)
        resp = self._checkout(paymentMethod="GATEWAY")
        self.order = Order.objects.get(order_number=resp.data["data"]["orderNumber"])
        self.payment = Payment.objects.create(
            order=self.order, method="GATEWAY", provider="BALEPAY", gateway="BALEPAY",
            amount=self.order.final_total, provider_ref="ref-123", status="UNDER_REVIEW",
        )
        # initiate_payment واقعی همین‌جا سفارش را PAYMENT_REVIEW می‌کند —
        # اینجا Payment دستی ساخته شد، پس گذار هم دستی انجام می‌شود.
        order_status.transition_to(self.order, "PAYMENT_REVIEW")

    def test_duplicate_callback_confirms_only_once(self):
        from unittest.mock import patch

        from apps.orders.providers.base import PaymentVerifyResult

        with patch("apps.orders.providers.balepay.BalePayProvider.verify") as mock_verify, patch(
            "apps.orders.providers.balepay.BalePayProvider.__init__", return_value=None
        ):
            mock_verify.return_value = PaymentVerifyResult(success=True, ref_id="ref-123", raw_response={})

            body = {"providerRef": "ref-123", "amount": self.order.final_total, "status": "SUCCESS"}
            r1 = self.client.post("/api/v1/payments/callback/balepay", body, format="json")
            r2 = self.client.post("/api/v1/payments/callback/balepay", body, format="json")

        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r2.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PAID")
        # فقط یک‌بار به PAID رسیده — دومی هیچ ردیف تاریخچه‌ی تازه نساخته.
        paid_transitions = self.order.status_history.filter(to_status="PAID").count()
        self.assertEqual(paid_transitions, 1)
        self.assertEqual(mock_verify.call_count, 1)  # دومی حتی provider را صدا نزد

    def test_amount_mismatch_is_rejected(self):
        body = {"providerRef": "ref-123", "amount": self.order.final_total + 1, "status": "SUCCESS"}
        response = self.client.post("/api/v1/payments/callback/balepay", body, format="json")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "GATEWAY_AMOUNT_MISMATCH")


class PaymentReturnViewTests(OrderTestBase):
    def test_return_view_never_confirms_payment(self):
        variant = _make_variant(sku="RET-1", quantity=5)
        self._add_to_cart(variant)
        resp = self._checkout(paymentMethod="GATEWAY")
        order = Order.objects.get(order_number=resp.data["data"]["orderNumber"])
        Payment.objects.create(
            order=order, method="GATEWAY", provider="BALEPAY", gateway="BALEPAY",
            amount=order.final_total, provider_ref="ref-return-1", status="UNDER_REVIEW",
        )

        response = self.client.get("/api/v1/payments/return/balepay", {"providerRef": "ref-return-1"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["data"]["pendingVerification"])
        order.refresh_from_db()
        self.assertEqual(order.status, "AWAITING_PAYMENT")  # هنوز تأیید نشده


class CouponTests(OrderTestBase):
    def _checkout_with_coupon(self, code):
        variant = _make_variant(sku=f"CPN-{code}", quantity=5, price=100_000_000)
        self._add_to_cart(variant)
        return self._checkout(couponCode=code)

    def test_invalid_code_is_rejected(self):
        response = self._checkout_with_coupon("NOPE")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "COUPON_INVALID")

    def test_expired_code_is_rejected(self):
        Coupon.objects.create(
            code="OLD10", type="PERCENT", percent_basis_points=1000,
            end_date=timezone.now() - timezone.timedelta(days=1),
        )
        response = self._checkout_with_coupon("OLD10")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "COUPON_INVALID")

    def test_min_order_not_met_is_rejected(self):
        Coupon.objects.create(code="BIG", type="AMOUNT", amount_toman=1_000_000, minimum_order_amount=500_000_000)
        response = self._checkout_with_coupon("BIG")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "COUPON_MIN_ORDER_NOT_MET")

    def test_percent_discount_applied_and_capped(self):
        Coupon.objects.create(code="SAVE10", type="PERCENT", percent_basis_points=1000, maximum_discount_amount=5_000_000)
        response = self._checkout_with_coupon("SAVE10")
        self.assertEqual(response.status_code, 201, response.data)
        # ۱۰٪ از ۱۰۰ میلیون = ۱۰ میلیون، اما سقف ۵ میلیون است.
        self.assertEqual(response.data["data"]["discountTotal"], 5_000_000)
        self.assertTrue(CouponUsage.objects.filter(coupon__code="SAVE10", order__user=self.user).exists())

    def test_per_user_limit_blocks_second_use(self):
        coupon = Coupon.objects.create(code="ONCE", type="AMOUNT", amount_toman=1_000_000, per_user_limit=1)
        other_order = Order.objects.create(
            user=self.user, shipping_recipient_name="", shipping_mobile="", shipping_province="",
            shipping_city="", shipping_address_line="", subtotal=10_000_000, final_total=9_000_000,
        )
        CouponUsage.objects.create(coupon=coupon, user=self.user, order=other_order, discount_amount=1_000_000)

        response = self._checkout_with_coupon("ONCE")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "COUPON_USAGE_LIMIT_REACHED")


class OrderTrackTests(OrderTestBase):
    def setUp(self):
        super().setUp()
        variant = _make_variant(sku="TRACK-1", quantity=5)
        self._add_to_cart(variant)
        self.order_number = self._checkout().data["data"]["orderNumber"]

    def test_correct_mobile_returns_order(self):
        response = self.client.post(
            "/api/v1/orders/track", {"orderNumber": self.order_number, "mobile": "09121110050"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["orderNumber"], self.order_number)

    def test_guest_response_hides_full_address(self):
        """E-05 §۲ — حریم خصوصی: فقط شهر، نه نشانی کامل/فاکتور/روش‌پرداخت."""
        response = self.client.post(
            "/api/v1/orders/track", {"orderNumber": self.order_number, "mobile": "09121110050"}, format="json"
        )
        data = response.data["data"]
        self.assertIn("shippingCity", data)
        self.assertNotIn("shippingAddress", data)
        self.assertNotIn("invoice", data)
        self.assertNotIn("payment", data)
        self.assertTrue(all("units" not in item for item in data["items"]))

    def test_unknown_order_and_wrong_mobile_give_identical_error_shape(self):
        unknown = self.client.post(
            "/api/v1/orders/track", {"orderNumber": "ARB-00000000", "mobile": "09121110050"}, format="json"
        )
        wrong_mobile = self.client.post(
            "/api/v1/orders/track", {"orderNumber": self.order_number, "mobile": "09129999999"}, format="json"
        )
        self.assertEqual(unknown.status_code, wrong_mobile.status_code, 404)
        self.assertEqual(unknown.data["code"], wrong_mobile.data["code"])
        self.assertEqual(unknown.data["message"], wrong_mobile.data["message"])


class ReturnRequestTests(OrderTestBase):
    def setUp(self):
        super().setUp()
        self.variant = _make_variant(sku="RETREQ-1", quantity=5)
        self._add_to_cart(self.variant)
        resp = self._checkout()
        self.order = Order.objects.get(order_number=resp.data["data"]["orderNumber"])
        self.order_item_id = self.order.items.first().id

    def _request_return(self):
        return self.client.post(
            f"/api/v1/orders/{self.order.order_number}/return",
            {"reason": "خرابی دستگاه", "items": [{"orderItemId": self.order_item_id, "quantity": 1}]},
            format="json",
        )

    def test_not_delivered_is_rejected(self):
        response = self._request_return()
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "RETURN_NOT_ELIGIBLE")

    def test_outside_window_is_rejected(self):
        order_status.transition_to(self.order, "PAYMENT_REVIEW")
        order_status.transition_to(self.order, "PAID")
        order_status.transition_to(self.order, "PROCESSING")
        order_status.transition_to(self.order, "READY_TO_SHIP")
        from apps.orders.models import Shipment

        Shipment.objects.create(order=self.order, provider="پست", tracking_number="T-1")
        order_status.transition_to(self.order, "SHIPPED")
        order_status.transition_to(self.order, "DELIVERED")
        self.order.delivered_at = timezone.now() - timezone.timedelta(days=10)
        self.order.save(update_fields=["delivered_at"])

        response = self._request_return()
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "RETURN_WINDOW_EXPIRED")

    def test_happy_path_within_window(self):
        order_status.transition_to(self.order, "PAYMENT_REVIEW")
        order_status.transition_to(self.order, "PAID")
        order_status.transition_to(self.order, "PROCESSING")
        order_status.transition_to(self.order, "READY_TO_SHIP")
        from apps.orders.models import Shipment

        Shipment.objects.create(order=self.order, provider="پست", tracking_number="T-1")
        order_status.transition_to(self.order, "SHIPPED")
        order_status.transition_to(self.order, "DELIVERED")

        response = self._request_return()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["data"]["status"], "REQUESTED")


class AutoCancelTaskTests(OrderTestBase):
    def test_stale_awaiting_payment_is_cancelled_and_stock_released(self):
        from apps.orders.tasks import cancel_stale_unpaid_orders

        variant = _make_variant(sku="STALE-1", quantity=5)
        self._add_to_cart(variant)
        order_number = self._checkout().data["data"]["orderNumber"]
        order = Order.objects.get(order_number=order_number)
        order.created_at = timezone.now() - timezone.timedelta(hours=25)
        order.save(update_fields=["created_at"])

        cancelled = cancel_stale_unpaid_orders()
        self.assertEqual(cancelled, 1)

        order.refresh_from_db()
        self.assertEqual(order.status, "CANCELLED")
        self.assertEqual(order.cancel_reason, "PAYMENT_TIMEOUT")
        inventory = Inventory.objects.get(variant=variant)
        self.assertEqual(inventory.reserved_quantity, 0)

    def test_payment_review_is_never_auto_cancelled(self):
        from apps.orders.tasks import cancel_stale_unpaid_orders

        variant = _make_variant(sku="STALE-2", quantity=5)
        self._add_to_cart(variant)
        order_number = self._checkout().data["data"]["orderNumber"]
        order = Order.objects.get(order_number=order_number)
        order_status.transition_to(order, "PAYMENT_REVIEW")
        order.created_at = timezone.now() - timezone.timedelta(hours=25)
        order.save(update_fields=["created_at"])

        cancelled = cancel_stale_unpaid_orders()
        self.assertEqual(cancelled, 0)
        order.refresh_from_db()
        self.assertEqual(order.status, "PAYMENT_REVIEW")
