import json
from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.catalog.models import Category, Product
from apps.inventory.models import StockMovement
from apps.orders.models import InvalidOrderTransition, Order, OrderItem, Payment
from apps.orders.providers import PaymentProviderError, get_provider
from apps.settings.models import ApiCredential
from apps.users.models import User

# CartApiTests / CheckoutApiTests / ImpersonatedCheckoutRestrictionTests /
# OrderHistoryApiTests / PaymentFlowApiTests / OrderInvoicePdfTests (public
# cart/checkout/order/payment-callback/invoice endpoints) removed in D-01
# along with the public API layer they tested — rebuilt against the ArByte
# contract in D-04/D-05. The order state machine and payment-provider
# abstraction they exercised are unchanged and still tested directly below.


class OrderStateMachineTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(phone="09121234567", password="test-pass")
        category = Category.objects.create(slug="desktop-stands", name="Desktop Stands")
        self.product = Product.objects.create(
            sku="TEST-001", slug="test-product", name="Test Product", price=390000, category=category
        )
        StockMovement.objects.record(self.product, "purchase", 10, reference="PO-1")
        self.order = Order.objects.create(
            user=self.user,
            shipping_address={"city": "Tehran", "line": "..."},
            subtotal=390000,
            total=390000,
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            product_name=self.product.name,
            sku=self.product.sku,
            price=self.product.price,
            quantity=2,
        )

    def test_order_item_subtotal_calculation(self):
        item = self.order.items.first()
        self.assertEqual(item.subtotal, 780000)

    def test_happy_path_transitions_and_stock_deduction(self):
        self.order.mark_paid()
        self.order.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(self.order.status, "paid")
        self.assertIsNotNone(self.order.paid_at)
        self.assertEqual(self.product.stock_count, 8)  # deducted at payment, not later

        self.order.start_processing()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "processing")

        self.order.mark_shipped(tracking_code="TRACK-123")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "shipped")
        self.assertEqual(self.order.tracking_code, "TRACK-123")

        self.order.mark_delivered()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "delivered")

        # Every hop must be logged.
        transitions = list(self.order.status_logs.values_list("from_status", "to_status"))
        self.assertEqual(
            transitions,
            [
                ("pending", "paid"),
                ("paid", "processing"),
                ("processing", "shipped"),
                ("shipped", "delivered"),
            ],
        )

    def test_invalid_transition_rejected(self):
        with self.assertRaises(InvalidOrderTransition):
            self.order.mark_delivered()  # can't skip straight from pending
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "pending")

    def test_double_mark_paid_does_not_double_deduct_stock(self):
        """Guards the same class of bug as a duplicate payment-gateway callback."""
        self.order.mark_paid()
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 8)

        with self.assertRaises(InvalidOrderTransition):
            self.order.mark_paid()
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 8)  # unchanged — not deducted twice

    def test_cancel_from_paid_reverses_stock(self):
        self.order.mark_paid()
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 8)

        self.order.cancel(reason="مشتری منصرف شد")
        self.product.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "canceled")
        self.assertEqual(self.product.stock_count, 10)  # fully reversed

    def test_cancel_from_processing_reverses_stock(self):
        self.order.mark_paid()
        self.order.start_processing()
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 8)

        self.order.cancel(reason="مشتری منصرف شد")
        self.product.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "canceled")
        self.assertEqual(self.product.stock_count, 10)  # fully reversed

    def test_cancel_from_pending_does_not_touch_stock(self):
        self.order.cancel(reason="منصرف شدم")
        self.product.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "canceled")
        self.assertEqual(self.product.stock_count, 10)  # nothing was ever deducted

    def test_mark_shipped_without_tracking_code_is_rejected(self):
        self.order.mark_paid()
        self.order.start_processing()
        with self.assertRaises(InvalidOrderTransition):
            self.order.mark_shipped(tracking_code="")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "processing")  # unchanged — never silently shipped

    def test_mark_returned_reverses_stock(self):
        self.order.mark_paid()
        self.order.start_processing()
        self.order.mark_shipped(tracking_code="TRACK-1")
        self.order.mark_delivered()
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 8)

        self.order.mark_returned()
        self.product.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "returned")
        self.assertEqual(self.product.stock_count, 10)


def _zarinpal_request_response(authority="A-TEST-AUTHORITY"):
    mock = MagicMock()
    mock.json.return_value = {"data": {"code": 100, "authority": authority, "fee_type": "Merchant", "fee": 0}, "errors": []}
    return mock


def _zarinpal_verify_response(code=100, ref_id=987654):
    mock = MagicMock()
    mock.json.return_value = {"data": {"code": code, "ref_id": ref_id}, "errors": []}
    return mock


class PaymentProviderTests(TestCase):
    """Unit-level: the provider classes themselves, network mocked out."""

    def setUp(self):
        self.user = User.objects.create_user(phone="09121110019", is_verified=True)

    def test_get_provider_raises_for_unknown_code(self):
        with self.assertRaises(PaymentProviderError):
            get_provider("NOT-A-GATEWAY")

    def test_provider_raises_when_no_credential_configured(self):
        with self.assertRaises(PaymentProviderError):
            get_provider("ZARINPAL")

    def test_provider_raises_when_credential_is_invalid_json(self):
        ApiCredential.objects.create(service="zarinpal", is_active=True, credentials="")
        # is_active=True + empty credentials would fail clean(), but this
        # simulates a row that reached the DB some other way (fixture/bulk).
        with self.assertRaises(PaymentProviderError):
            get_provider("ZARINPAL")

    @patch("apps.orders.providers.zarinpal.requests.post")
    def test_zarinpal_request_builds_startpay_redirect_url(self, mock_post):
        ApiCredential.objects.create(
            service="zarinpal", is_active=True, is_sandbox=True, credentials=json.dumps({"merchantId": "m-1"})
        )
        mock_post.return_value = _zarinpal_request_response(authority="A-123")
        provider = get_provider("ZARINPAL")
        order = Order.objects.create(user=self.user, shipping_address={}, total=100000)

        result = provider.request(order, "http://backend/callback")
        self.assertEqual(result.authority, "A-123")
        self.assertIn("sandbox.zarinpal.com/pg/StartPay/A-123", result.redirect_url)
        # Rial, not Toman — the payload sent to Zarinpal must be x10.
        sent_payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(sent_payload["amount"], 1000000)

    @patch("apps.orders.providers.zarinpal.requests.post")
    def test_zarinpal_request_raises_on_gateway_rejection(self, mock_post):
        ApiCredential.objects.create(
            service="zarinpal", is_active=True, credentials=json.dumps({"merchantId": "m-1"})
        )
        mock = MagicMock()
        mock.json.return_value = {"data": {}, "errors": {"code": -9, "message": "merchant_id نامعتبر است."}}
        mock_post.return_value = mock
        provider = get_provider("ZARINPAL")
        order = Order.objects.create(user=self.user, shipping_address={}, total=100000)

        with self.assertRaises(PaymentProviderError):
            provider.request(order, "http://backend/callback")

    @patch("apps.orders.providers.zarinpal.requests.post")
    def test_zarinpal_verify_uses_payment_amount_not_callback_data(self, mock_post):
        ApiCredential.objects.create(
            service="zarinpal", is_active=True, credentials=json.dumps({"merchantId": "m-1"})
        )
        mock_post.return_value = _zarinpal_verify_response()
        provider = get_provider("ZARINPAL")
        order = Order.objects.create(user=self.user, shipping_address={}, total=250000)
        payment = Payment.objects.create(
            order=order, gateway="ZARINPAL", gateway_name="زرین‌پال", amount=250000,
            authority="A-123", idempotency_key="tok-1",
        )

        result = provider.verify({"Status": "OK", "Authority": "A-123"}, payment)
        self.assertTrue(result.success)
        self.assertEqual(result.ref_id, "987654")
        sent_payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(sent_payload["amount"], 2500000)  # order.total (Toman) * 10, from `payment`

    def test_zarinpal_verify_returns_failure_without_network_call_when_status_not_ok(self):
        ApiCredential.objects.create(
            service="zarinpal", is_active=True, credentials=json.dumps({"merchantId": "m-1"})
        )
        provider = get_provider("ZARINPAL")
        order = Order.objects.create(user=self.user, shipping_address={}, total=250000)
        payment = Payment.objects.create(
            order=order, gateway="ZARINPAL", gateway_name="زرین‌پال", amount=250000,
            authority="A-123", idempotency_key="tok-2",
        )
        with patch("apps.orders.providers.zarinpal.requests.post") as mock_post:
            result = provider.verify({"Status": "NOK", "Authority": "A-123"}, payment)
            mock_post.assert_not_called()
        self.assertFalse(result.success)
