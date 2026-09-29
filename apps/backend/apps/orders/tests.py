import json
from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.inventory.models import Inventory
from apps.orders import order_status
from apps.orders.models import Order, OrderItem, Payment, Shipment
from apps.orders.order_status import InvalidOrderTransition
from apps.orders.providers import PaymentProviderError, get_provider
from apps.settings.models import ApiCredential
from apps.users.models import User

# CartApiTests / CheckoutApiTests / ImpersonatedCheckoutRestrictionTests /
# OrderHistoryApiTests / PaymentFlowApiTests / OrderInvoicePdfTests (public
# cart/checkout/order/payment-callback/invoice endpoints) removed in D-01;
# rebuilt against the ArByte contract in D-04 (cart) and
# apps/public_api/tests_d05_*.py (order/payment/coupon/tracking/return).
# This file covers the domain-level state machine + payment-provider
# abstraction directly (D-05 §۱/§۳ — the same split D-01 already used).


class OrderStatusServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(phone="09121234567", password="test-pass")
        brand = Brand.objects.create(name="Test Brand", slug="test-brand")
        category = Category.objects.create(slug="desktop-stands", name="Desktop Stands")
        self.product = Product.objects.create(
            # E-03 §۳ — این کلاس گذارهای FSM را تست می‌کند، نه سریال؛
            # requires_serial=False تا READY_TO_SHIP بدون OrderItemUnit
            # جلوی حرکت نگیرد (پیش‌فرض مدل الان True است).
            slug="test-product", name="Test Product", brand=brand, category=category, condition="NEW",
            requires_serial=False,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product, sku="TEST-001", is_default=True, final_price=390000
        )
        self.inventory = Inventory.objects.create(variant=self.variant)
        Inventory.objects.stock_in(self.variant, 10, reference="PO-1")
        Inventory.objects.reserve(self.variant, 2, reference="ARB-TEST")
        self.order = Order.objects.create(
            user=self.user,
            shipping_recipient_name="علی رضایی",
            shipping_mobile="09121234567",
            shipping_province="تهران",
            shipping_city="تهران",
            shipping_address_line="خیابان ولیعصر",
            subtotal=780000,
            final_total=780000,
        )
        OrderItem.objects.create(
            order=self.order,
            variant=self.variant,
            product_name_snapshot=self.product.name,
            sku_snapshot=self.variant.sku,
            unit_price=self.variant.final_price,
            quantity=2,
            final_price=780000,
        )

    def test_order_item_subtotal_calculation(self):
        item = self.order.items.first()
        self.assertEqual(item.subtotal, 780000)

    def test_happy_path_full_nine_states(self):
        order_status.transition_to(self.order, "AWAITING_PAYMENT")
        order_status.transition_to(self.order, "PAYMENT_REVIEW")
        order_status.transition_to(self.order, "PAID")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PAID")
        self.assertIsNotNone(self.order.paid_at)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.reserved_quantity, 2)  # هنوز رزرو، هنوز STOCK_OUT نشده

        order_status.transition_to(self.order, "PROCESSING")
        order_status.transition_to(self.order, "READY_TO_SHIP")

        Shipment.objects.create(order=self.order, provider="پست", tracking_number="TRACK-123")
        order_status.transition_to(self.order, "SHIPPED")
        self.order.refresh_from_db()
        self.inventory.refresh_from_db()
        self.assertEqual(self.order.status, "SHIPPED")
        self.assertIsNotNone(self.order.shipped_at)
        self.assertEqual(self.inventory.quantity, 8)  # حالا واقعاً STOCK_OUT شد
        self.assertEqual(self.inventory.reserved_quantity, 0)  # رزرو آزاد شد

        order_status.transition_to(self.order, "DELIVERED")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "DELIVERED")
        self.assertIsNotNone(self.order.delivered_at)

        transitions = list(self.order.status_history.values_list("from_status", "to_status"))
        self.assertEqual(
            transitions,
            [
                ("PENDING", "AWAITING_PAYMENT"),
                ("AWAITING_PAYMENT", "PAYMENT_REVIEW"),
                ("PAYMENT_REVIEW", "PAID"),
                ("PAID", "PROCESSING"),
                ("PROCESSING", "READY_TO_SHIP"),
                ("READY_TO_SHIP", "SHIPPED"),
                ("SHIPPED", "DELIVERED"),
            ],
        )

    def test_invalid_transition_rejected(self):
        with self.assertRaises(InvalidOrderTransition):
            order_status.transition_to(self.order, "DELIVERED")  # نمی‌شود از PENDING مستقیم پرید
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PENDING")

    def test_payment_review_to_awaiting_payment_is_valid(self):
        """رسید رد شد — برگشت به AWAITING_PAYMENT، نه لغو."""
        order_status.transition_to(self.order, "AWAITING_PAYMENT")
        order_status.transition_to(self.order, "PAYMENT_REVIEW")
        order_status.transition_to(self.order, "AWAITING_PAYMENT", note="رسید رد شد")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "AWAITING_PAYMENT")

    def test_cancel_from_pending_releases_reservation(self):
        order_status.transition_to(self.order, "CANCELLED", note="منصرف شدم")
        self.order.refresh_from_db()
        self.inventory.refresh_from_db()
        self.assertEqual(self.order.status, "CANCELLED")
        self.assertEqual(self.order.cancel_reason, "منصرف شدم")
        self.assertEqual(self.inventory.reserved_quantity, 0)
        self.assertEqual(self.inventory.quantity, 10)  # STOCK_OUT هرگز اتفاق نیفتاد

    def test_cancel_from_processing_releases_reservation(self):
        order_status.transition_to(self.order, "AWAITING_PAYMENT")
        order_status.transition_to(self.order, "PAYMENT_REVIEW")
        order_status.transition_to(self.order, "PAID")
        order_status.transition_to(self.order, "PROCESSING")
        order_status.transition_to(self.order, "CANCELLED")
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.reserved_quantity, 0)
        self.assertEqual(self.inventory.quantity, 10)

    def test_cancel_after_shipped_is_invalid(self):
        order_status.transition_to(self.order, "AWAITING_PAYMENT")
        order_status.transition_to(self.order, "PAYMENT_REVIEW")
        order_status.transition_to(self.order, "PAID")
        order_status.transition_to(self.order, "PROCESSING")
        order_status.transition_to(self.order, "READY_TO_SHIP")
        Shipment.objects.create(order=self.order, provider="پست", tracking_number="TRACK-1")
        order_status.transition_to(self.order, "SHIPPED")
        with self.assertRaises(InvalidOrderTransition):
            order_status.transition_to(self.order, "CANCELLED")

    def test_sync_payment_status_never_touches_order_status(self):
        order_status.sync_payment_status(self.order, "RECEIPT_UPLOADED")
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, "RECEIPT_UPLOADED")
        self.assertEqual(self.order.status, "PENDING")  # مستقل — تصمیم ب

    def test_every_transition_sms_template_is_seeded_and_active(self):
        """بدون این seed (notifications/migrations/0005)، هر پیامک واقعی
        بی‌صدا SmsLog(status="failed") می‌شود — این تست همان چیزی است که
        enum-label test's الگو برای enum مقایسه می‌کند، اینجا برای پیامک.
        E-03 §۲: هر دو الگوی گذار حالا Lookup-محورند (kavenegar_template_name
        پر، body خالی) — دیگر placeholder متنی چک نمی‌شود."""
        from apps.notifications.models import SmsTemplate

        for template_key in order_status._SMS_TEMPLATE_BY_TRANSITION.values():
            template = SmsTemplate.objects.filter(key=template_key, is_active=True).first()
            self.assertIsNotNone(template, f'قالب پیامک "{template_key}" seed نشده یا غیرفعال است.')
            self.assertTrue(template.kavenegar_template_name, f'قالب "{template_key}" نام Lookup ندارد.')
            self.assertIn("token", template.kavenegar_token_map)

    def test_seven_old_transition_templates_deactivated_or_repurposed(self):
        """هفت قالب D-05 — شش‌تا غیرفعال، order_shipped بازاستفاده شد
        (docs/QUESTIONS.md Q-29 مجاور، migration 0005 کامنت)."""
        from apps.notifications.models import SmsTemplate

        deactivated = [
            "order_payment_review", "order_paid", "order_processing",
            "order_ready_to_ship", "order_delivered", "order_cancelled",
        ]
        for key in deactivated:
            template = SmsTemplate.objects.filter(key=key).first()
            self.assertIsNotNone(template)
            self.assertFalse(template.is_active, f'قالب قدیمی "{key}" باید غیرفعال باشد.')

    def test_admin_notify_sms_fires_once_despite_payment_review_reentry(self):
        """رسید رد شد و کاربر دوباره رسید فرستاد -> PAYMENT_REVIEW دوبار طی
        می‌شود، ولی پیامک مدیر فقط یک بار باید برود (E-03 §۲ admin_notified_at)."""
        from apps.settings.models import SiteSettings

        site_settings = SiteSettings.load()
        site_settings.owner_notification_phone = "09120000001,09120000002"
        site_settings.save(update_fields=["owner_notification_phone"])

        with patch("apps.notifications.services.NotificationService.send_sms") as mock_send:
            with self.captureOnCommitCallbacks(execute=True):
                order_status.transition_to(self.order, "AWAITING_PAYMENT")
                order_status.transition_to(self.order, "PAYMENT_REVIEW")
            with self.captureOnCommitCallbacks(execute=True):
                order_status.transition_to(self.order, "AWAITING_PAYMENT", note="رسید رد شد")
                order_status.transition_to(self.order, "PAYMENT_REVIEW")

        admin_calls = [c for c in mock_send.call_args_list if c.args[1] == "order_new_admin"]
        self.assertEqual(len(admin_calls), 2)  # دو شماره‌ی مدیر، فقط یک دور اطلاع‌رسانی
        self.order.refresh_from_db()
        self.assertIsNotNone(self.order.admin_notified_at)

    def test_order_confirmed_sms_sent_on_paid(self):
        with patch("apps.notifications.services.NotificationService.send_sms") as mock_send:
            with self.captureOnCommitCallbacks(execute=True):
                order_status.transition_to(self.order, "AWAITING_PAYMENT")
                order_status.transition_to(self.order, "PAYMENT_REVIEW")
                order_status.transition_to(self.order, "PAID")

        customer_calls = [c for c in mock_send.call_args_list if c.args[1] == "order_confirmed"]
        self.assertEqual(len(customer_calls), 1)
        phone, key, context = customer_calls[0].args
        self.assertEqual(phone, self.order.shipping_mobile)
        self.assertEqual(context["orderNumber"], self.order.order_number)
        self.assertEqual(context["firstName"], "علی")  # first_name_fa("علی رضایی")


class OrderItemUnitSerialGuardTests(TestCase):
    """E-03 §۳ — سریال/گارانتی."""

    def setUp(self):
        self.user = User.objects.create_user(phone="09121234599", password="test-pass")
        brand = Brand.objects.create(name="Test Brand 2", slug="test-brand-2")
        category = Category.objects.create(slug="laptops-serial-test", name="Laptops Serial Test")
        self.product = Product.objects.create(
            slug="serial-test-product", name="Serial Test Product", brand=brand, category=category,
            condition="NEW", requires_serial=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product, sku="SERIAL-001", is_default=True, final_price=390000
        )
        Inventory.objects.create(variant=self.variant)
        Inventory.objects.stock_in(self.variant, 10, reference="PO-2")
        Inventory.objects.reserve(self.variant, 2, reference="ARB-SERIAL-TEST")
        self.order = Order.objects.create(
            user=self.user,
            shipping_recipient_name="مریم احمدی",
            shipping_mobile="09121234599",
            shipping_province="تهران",
            shipping_city="تهران",
            shipping_address_line="خیابان انقلاب",
            subtotal=780000,
            final_total=780000,
        )
        self.item = OrderItem.objects.create(
            order=self.order,
            variant=self.variant,
            product_name_snapshot=self.product.name,
            sku_snapshot=self.variant.sku,
            unit_price=self.variant.final_price,
            quantity=2,
            final_price=780000,
        )
        order_status.transition_to(self.order, "AWAITING_PAYMENT")
        order_status.transition_to(self.order, "PAYMENT_REVIEW")
        order_status.transition_to(self.order, "PAID")
        order_status.transition_to(self.order, "PROCESSING")

    def test_ready_to_ship_blocked_without_serials(self):
        from apps.orders.order_status import MissingSerialNumbers

        with self.assertRaises(MissingSerialNumbers) as ctx:
            order_status.transition_to(self.order, "READY_TO_SHIP")
        self.assertEqual(ctx.exception.order_item_ids, [self.item.id])

    def test_ready_to_ship_blocked_when_partially_serialed(self):
        from apps.orders.models import OrderItemUnit
        from apps.orders.order_status import MissingSerialNumbers

        OrderItemUnit.objects.create(order_item=self.item, serial_number="SN-0001")
        with self.assertRaises(MissingSerialNumbers):
            order_status.transition_to(self.order, "READY_TO_SHIP")

    def test_ready_to_ship_succeeds_once_fully_serialed(self):
        from apps.orders.models import OrderItemUnit

        OrderItemUnit.objects.create(order_item=self.item, serial_number="SN-0001")
        OrderItemUnit.objects.create(order_item=self.item, serial_number="SN-0002")
        order_status.transition_to(self.order, "READY_TO_SHIP")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "READY_TO_SHIP")

    def test_non_serial_product_never_blocks(self):
        self.product.requires_serial = False
        self.product.save(update_fields=["requires_serial"])
        order_status.transition_to(self.order, "READY_TO_SHIP")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "READY_TO_SHIP")

    def test_certificate_id_generated_unique_and_prefixed(self):
        from apps.orders.models import OrderItemUnit

        unit = OrderItemUnit.objects.create(order_item=self.item, serial_number="SN-0003")
        self.assertTrue(unit.certificate_id.startswith("ARB-W-"))
        self.assertEqual(len(unit.certificate_id), len("ARB-W-") + 10)
        other = OrderItemUnit.objects.create(order_item=self.item, serial_number="SN-0004")
        self.assertNotEqual(unit.certificate_id, other.certificate_id)


def _zarinpal_request_response(authority="A-TEST-AUTHORITY"):
    mock = MagicMock()
    mock.json.return_value = {"data": {"code": 100, "authority": authority, "fee_type": "Merchant", "fee": 0}, "errors": []}
    return mock


def _zarinpal_verify_response(code=100, ref_id=987654):
    mock = MagicMock()
    mock.json.return_value = {"data": {"code": code, "ref_id": ref_id}, "errors": []}
    return mock


class PaymentProviderTests(TestCase):
    """Unit-level: the provider classes themselves, network mocked out. These
    four gateways stay in code but unreachable via real checkout (D-05 §۳ —
    ApiCredential rows inactive); still tested directly to prove the D-05
    field-rename sweep (order.order_number, order.final_total,
    payment.provider_ref) didn't silently break them."""

    def setUp(self):
        self.user = User.objects.create_user(phone="09121110019", is_verified=True)

    def test_get_provider_raises_for_unknown_code(self):
        with self.assertRaises(PaymentProviderError):
            get_provider("NOT-A-GATEWAY")

    def test_provider_raises_when_no_credential_configured(self):
        with self.assertRaises(PaymentProviderError):
            get_provider("ZARINPAL")

    def test_balepay_skeleton_raises_without_credentials(self):
        with self.assertRaises(PaymentProviderError):
            get_provider("BALEPAY")

    def test_provider_raises_when_credential_is_invalid_json(self):
        ApiCredential.objects.create(service="zarinpal", is_active=True, credentials="")
        with self.assertRaises(PaymentProviderError):
            get_provider("ZARINPAL")

    @patch("apps.orders.providers.zarinpal.requests.post")
    def test_zarinpal_request_builds_startpay_redirect_url(self, mock_post):
        ApiCredential.objects.create(
            service="zarinpal", is_active=True, is_sandbox=True, credentials=json.dumps({"merchantId": "m-1"})
        )
        mock_post.return_value = _zarinpal_request_response(authority="A-123")
        provider = get_provider("ZARINPAL")
        order = Order.objects.create(
            user=self.user, shipping_recipient_name="", shipping_mobile="", shipping_province="",
            shipping_city="", shipping_address_line="", subtotal=100000, final_total=100000,
        )

        result = provider.request(order, "http://backend/callback")
        self.assertEqual(result.authority, "A-123")
        self.assertIn("sandbox.zarinpal.com/pg/StartPay/A-123", result.redirect_url)
        sent_payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(sent_payload["amount"], 1000000)  # Rial, not Toman — x10

    @patch("apps.orders.providers.zarinpal.requests.post")
    def test_zarinpal_request_raises_on_gateway_rejection(self, mock_post):
        ApiCredential.objects.create(
            service="zarinpal", is_active=True, credentials=json.dumps({"merchantId": "m-1"})
        )
        mock = MagicMock()
        mock.json.return_value = {"data": {}, "errors": {"code": -9, "message": "merchant_id نامعتبر است."}}
        mock_post.return_value = mock
        provider = get_provider("ZARINPAL")
        order = Order.objects.create(
            user=self.user, shipping_recipient_name="", shipping_mobile="", shipping_province="",
            shipping_city="", shipping_address_line="", subtotal=100000, final_total=100000,
        )

        with self.assertRaises(PaymentProviderError):
            provider.request(order, "http://backend/callback")

    @patch("apps.orders.providers.zarinpal.requests.post")
    def test_zarinpal_verify_uses_payment_amount_not_callback_data(self, mock_post):
        ApiCredential.objects.create(
            service="zarinpal", is_active=True, credentials=json.dumps({"merchantId": "m-1"})
        )
        mock_post.return_value = _zarinpal_verify_response()
        provider = get_provider("ZARINPAL")
        order = Order.objects.create(
            user=self.user, shipping_recipient_name="", shipping_mobile="", shipping_province="",
            shipping_city="", shipping_address_line="", subtotal=250000, final_total=250000,
        )
        payment = Payment.objects.create(
            order=order, method="GATEWAY", gateway="ZARINPAL", amount=250000, provider_ref="A-123", status="UNDER_REVIEW",
        )

        result = provider.verify({"Status": "OK", "Authority": "A-123"}, payment)
        self.assertTrue(result.success)
        self.assertEqual(result.ref_id, "987654")
        sent_payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(sent_payload["amount"], 2500000)  # order.final_total (Toman) * 10, from `payment`

    def test_zarinpal_verify_returns_failure_without_network_call_when_status_not_ok(self):
        ApiCredential.objects.create(
            service="zarinpal", is_active=True, credentials=json.dumps({"merchantId": "m-1"})
        )
        provider = get_provider("ZARINPAL")
        order = Order.objects.create(
            user=self.user, shipping_recipient_name="", shipping_mobile="", shipping_province="",
            shipping_city="", shipping_address_line="", subtotal=250000, final_total=250000,
        )
        payment = Payment.objects.create(
            order=order, method="GATEWAY", gateway="ZARINPAL", amount=250000, provider_ref="A-123", status="UNDER_REVIEW",
        )
        with patch("apps.orders.providers.zarinpal.requests.post") as mock_post:
            result = provider.verify({"Status": "NOK", "Authority": "A-123"}, payment)
            mock_post.assert_not_called()
        self.assertFalse(result.success)
