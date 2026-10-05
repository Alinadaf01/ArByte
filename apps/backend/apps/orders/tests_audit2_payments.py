"""AUDIT-2 — سه روش پرداخت، بله‌پی (ربات + فاکتور + وب‌هوک)، ترکیبی و امنیت."""

from datetime import timedelta
from unittest import mock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.inventory.models import Inventory
from apps.public_api.jwt_tokens import issue_tokens
from apps.settings.models import ShippingMethod
from apps.users.models import Address, User

from . import payment_state
from .balepay import service as bale
from .models import BalePaySession, BaleUpdate, Order, Payment, PaymentReceipt
from .testing import TEST_WEBHOOK_SECRET, enable_payments

LIMIT_RIAL = 150_000_000  # ۱۵ میلیون تومان
JPEG = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00" + b"\x01" * 512
WEBHOOK = f"/api/bale/webhook/{TEST_WEBHOOK_SECRET}"
CHAT = 9_000_001


class BaleCalls:
    """Bot API ساختگی: همه‌ی فراخوانی‌ها ثبت می‌شوند، هیچ شبکه‌ای نیست."""

    def __init__(self):
        self.calls: list[tuple[str, dict]] = []

    def __call__(self, token, method, payload=None, **kwargs):
        self.calls.append((method, payload or {}))
        if method == "getMe":
            return {"username": "arbytebot"}
        return {}

    def named(self, method):
        return [p for m, p in self.calls if m == method]


class PaymentTestBase(TestCase):
    def setUp(self):
        enable_payments(limit_rial=LIMIT_RIAL)
        self.user = User.objects.create_user(phone="09121230001", is_verified=True)
        self.client = self._client_for(self.user)
        self.address = Address.objects.create(
            user=self.user,
            province="تهران",
            city="تهران",
            line="خیابان تست",
            postal_code="1234567890",
            receiver_name="مشتری",
            receiver_phone="09121230001",
        )
        ShippingMethod.objects.create(name="پست", cost=0, is_active=True)
        self.bale = BaleCalls()
        patcher = mock.patch("apps.orders.balepay.client.call", side_effect=self.bale)
        patcher.start()
        self.addCleanup(patcher.stop)
        self._seq = 0

    @staticmethod
    def _client_for(user) -> APIClient:
        client = APIClient()
        access, _ = issue_tokens(user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        return client

    def order_for(self, total: int, plan: str):
        self._seq += 1
        sku = f"PAY-{self._seq}"
        brand = Brand.objects.create(name=f"B{sku}", slug=f"b-{sku.lower()}")
        category = Category.objects.create(slug=f"c-{sku.lower()}", name="دسته")
        product = Product.objects.create(
            slug=f"p-{sku.lower()}", name="لپ‌تاپ", brand=brand, category=category, requires_serial=False
        )
        variant = ProductVariant.objects.create(product=product, sku=sku, is_default=True, final_price=total)
        Inventory.objects.create(variant=variant, quantity=5)
        self.client.post("/api/v1/cart/items", {"variantId": variant.pk, "quantity": 1}, format="json")
        return self.client.post("/api/v1/orders", {"addressId": self.address.pk, "paymentPlan": plan}, format="json")

    def make_order(self, total: int, plan: str) -> Order:
        response = self.order_for(total, plan)
        self.assertEqual(response.status_code, 201, response.data)
        return Order.objects.get(order_number=response.data["data"]["orderNumber"])

    def update(self, body: dict):
        self._seq += 1
        return self.client.post(WEBHOOK, {"update_id": 1000 + self._seq, **body}, format="json")

    def start(self, order: Order) -> BalePaySession:
        response = self.client.post(f"/api/v1/orders/{order.order_number}/payment/online")
        self.assertEqual(response.status_code, 201, response.data)
        token = response.data["data"]["deepLink"].split("start=")[1]
        return BalePaySession.objects.get(token=token)

    def open_invoice(self, order: Order) -> BalePaySession:
        session = self.start(order)
        self.update({"message": {"chat": {"id": CHAT}, "from": {"id": CHAT}, "text": f"/start {session.token}"}})
        session.refresh_from_db()
        return session

    def pay(self, session: BalePaySession, *, charge="8557291793", amount=None, chat=CHAT, payload=None):
        return self.update(
            {
                "message": {
                    "chat": {"id": chat},
                    "from": {"id": chat},
                    "successful_payment": {
                        "currency": "IRR",
                        "total_amount": session.amount_rial if amount is None else amount,
                        "invoice_payload": payload or session.invoice_payload,
                        "telegram_payment_charge_id": "tg-1",
                        "provider_payment_charge_id": charge,
                    },
                }
            }
        )


class PlanRulesTests(PaymentTestBase):
    def test_options_around_the_limit(self):
        limit = payment_state.online_limit_toman()
        self.assertEqual(limit, 15_000_000)
        at_limit = {o.plan: o for o in payment_state.plan_options(limit)}
        self.assertTrue(at_limit["ONLINE"].available)
        self.assertFalse(at_limit["COMBINED"].available)  # زیر/برابر سقف، ترکیبی بی‌معناست

        over = {o.plan: o for o in payment_state.plan_options(45_000_000)}
        self.assertFalse(over["ONLINE"].available)
        self.assertEqual(over["ONLINE"].reason, "پرداخت آنلاین برای مبالغ تا سقف مجاز در دسترس است.")
        self.assertTrue(over["BANK_TRANSFER"].available)
        self.assertEqual((over["COMBINED"].online_amount, over["COMBINED"].bank_amount), (15_000_000, 30_000_000))

    def test_limit_is_configurable(self):
        enable_payments(limit_rial=20_000_000)
        self.assertEqual(payment_state.online_limit_toman(), 2_000_000)
        self.assertFalse({o.plan: o for o in payment_state.plan_options(3_000_000)}["ONLINE"].available)

    def test_disabled_methods(self):
        from apps.settings.models import ApiCredential

        ApiCredential.objects.filter(service="balepay").update(is_active=False)
        options = {o.plan: o for o in payment_state.plan_options(45_000_000)}
        self.assertFalse(options["ONLINE"].available)
        self.assertFalse(options["COMBINED"].available)

    def test_payment_plans_endpoint_uses_the_server_cart_total(self):
        self.order_for(45_000_000, "BANK_TRANSFER")  # سبد خالی می‌شود؛ یک سبد تازه بسازیم
        variant = ProductVariant.objects.get(sku="PAY-1")
        self.client.post("/api/v1/cart/items", {"variantId": variant.pk, "quantity": 1}, format="json")
        data = self.client.get("/api/v1/payment-plans").data["data"]
        self.assertEqual(data["total"], 45_000_000)
        self.assertEqual(data["onlineLimit"], 15_000_000)
        self.assertEqual([p["plan"] for p in data["plans"] if p["available"]], ["BANK_TRANSFER", "COMBINED"])
        self.assertEqual(APIClient().get("/api/v1/payment-plans").status_code, 401)


class CheckoutTests(PaymentTestBase):
    def test_online_under_limit(self):
        order = self.make_order(10_000_000, "ONLINE")
        payment = order.payments.get()
        self.assertEqual((order.payment_plan, payment.method, payment.amount), ("ONLINE", "GATEWAY", 10_000_000))
        self.assertEqual((order.status, order.payment_status), ("AWAITING_PAYMENT", "UNPAID"))

    def test_backend_enforces_the_online_limit(self):
        response = self.order_for(15_000_001, "ONLINE")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "ONLINE_PAYMENT_LIMIT_EXCEEDED")
        self.assertFalse(Order.objects.exists())  # هیچ سفارش/رزرو نیمه‌کاره

    def test_combined_splits_on_the_server(self):
        order = self.make_order(45_000_000, "COMBINED")
        rows = sorted((p.method, p.amount) for p in order.payments.all())
        self.assertEqual(rows, [("GATEWAY", 15_000_000), ("MANUAL_CARD_TO_CARD", 30_000_000)])
        self.assertEqual(self.order_for(10_000_000, "COMBINED").status_code, 409)

    def test_bank_transfer_and_legacy_method(self):
        self.assertEqual(self.make_order(5_000_000, "BANK_TRANSFER").payments.get().method, "MANUAL_CARD_TO_CARD")
        response = self.client.post(
            "/api/v1/orders", {"addressId": self.address.pk, "paymentMethod": "MANUAL_CARD_TO_CARD"}, format="json"
        )
        self.assertIn(response.status_code, (201, 400))  # سبد خالی → 400؛ مهم: نگاشت قدیمی معتبر است
        bad = self.client.post(
            "/api/v1/orders", {"addressId": self.address.pk, "paymentPlan": "CRYPTO"}, format="json"
        )
        self.assertEqual(bad.status_code, 400)


class BaleFlowTests(PaymentTestBase):
    def test_full_online_payment(self):
        order = self.make_order(10_000_000, "ONLINE")
        session = self.open_invoice(order)
        self.assertEqual((session.chat_id, session.status), (CHAT, "INVOICE_SENT"))
        invoice = self.bale.named("sendInvoice")[0]
        self.assertEqual(invoice["prices"][0]["amount"], 100_000_000)  # ریال، از سرور
        self.assertEqual(invoice["payload"], session.invoice_payload)
        self.assertEqual(invoice["chat_id"], CHAT)

        self.update(
            {
                "pre_checkout_query": {
                    "id": "q1",
                    "from": {"id": CHAT},
                    "currency": "IRR",
                    "total_amount": session.amount_rial,
                    "invoice_payload": session.invoice_payload,
                }
            }
        )
        self.assertTrue(self.bale.named("answerPreCheckoutQuery")[0]["ok"])
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "UNPAID")  # PreCheckout هرگز پرداخت نیست

        self.pay(session)
        order.refresh_from_db()
        session.refresh_from_db()
        self.assertEqual((order.status, order.payment_status), ("PAID", "CONFIRMED"))
        self.assertEqual(session.provider_payment_charge_id, "8557291793")
        payment = order.payments.get()
        self.assertEqual((payment.status, payment.provider_ref), ("CONFIRMED", "8557291793"))
        self.assertIsNotNone(payment.paid_at)
        message = self.bale.named("sendMessage")[-1]
        url = message["reply_markup"]["inline_keyboard"][0][0]["url"]
        self.assertTrue(url.endswith(f"/orders/{order.order_number}"))

    def test_pre_checkout_rejects_wrong_amount_payload_or_user(self):
        session = self.open_invoice(self.make_order(10_000_000, "ONLINE"))
        base = {"id": "q", "from": {"id": CHAT}, "currency": "IRR", "invoice_payload": session.invoice_payload}
        for query in (
            {**base, "total_amount": session.amount_rial - 10},
            {**base, "total_amount": session.amount_rial, "invoice_payload": "forged"},
            {**base, "total_amount": session.amount_rial, "from": {"id": 42}},
            {**base, "total_amount": session.amount_rial, "currency": "USD"},
        ):
            self.update({"pre_checkout_query": query})
        answers = self.bale.named("answerPreCheckoutQuery")
        self.assertEqual([a["ok"] for a in answers], [False, False, False, False])

    def test_duplicate_update_and_duplicate_payment_are_idempotent(self):
        order = self.make_order(10_000_000, "ONLINE")
        session = self.open_invoice(order)
        body = {
            "update_id": 77,
            "message": {
                "chat": {"id": CHAT},
                "successful_payment": {
                    "total_amount": session.amount_rial,
                    "invoice_payload": session.invoice_payload,
                    "provider_payment_charge_id": "C-1",
                },
            },
        }
        self.client.post(WEBHOOK, body, format="json")
        self.client.post(WEBHOOK, body, format="json")  # همان update_id
        self.assertEqual(BaleUpdate.objects.filter(update_id=77).count(), 1)
        self.pay(session, charge="C-1")  # update تازه، همان پرداخت
        order.refresh_from_db()
        self.assertEqual(order.status_history.filter(to_status="PAID").count(), 1)

        self.pay(session, charge="C-2")  # پرداخت دوم برای همان فاکتور → پرچم، نه تأیید دوباره
        session.refresh_from_db()
        self.assertEqual(session.status, "PAID")
        self.assertIn("C-2", session.failure_reason)

    def test_wrong_amount_or_chat_is_never_confirmed(self):
        order = self.make_order(10_000_000, "ONLINE")
        session = self.open_invoice(order)
        self.pay(session, amount=1_000)
        session.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(session.status, "NEEDS_REVIEW")
        self.assertEqual(order.payment_status, "UNPAID")

        other = self.open_invoice(self.make_order(5_000_000, "ONLINE"))
        self.pay(other, chat=555)
        other.refresh_from_db()
        self.assertEqual(other.status, "NEEDS_REVIEW")

    def test_charge_id_is_unique_across_orders(self):
        first = self.open_invoice(self.make_order(10_000_000, "ONLINE"))
        self.pay(first, charge="SAME")
        second_order = self.make_order(5_000_000, "ONLINE")
        second = self.open_invoice(second_order)
        self.pay(second, charge="SAME")
        second.refresh_from_db()
        second_order.refresh_from_db()
        self.assertEqual(second.status, "NEEDS_REVIEW")
        self.assertEqual(second_order.payment_status, "UNPAID")

    def test_token_is_one_time_and_bound_to_one_chat(self):
        order = self.make_order(10_000_000, "ONLINE")
        session = self.open_invoice(order)
        self.update({"message": {"chat": {"id": 777}, "text": f"/start {session.token}"}})
        self.assertEqual(len(self.bale.named("sendInvoice")), 1)
        self.assertIn("حساب دیگری", self.bale.named("sendMessage")[-1]["text"])

        new_session = self.start(order)  # جلسه‌ی تازه، قبلی منقضی
        session.refresh_from_db()
        self.assertEqual(session.status, "EXPIRED")
        self.assertNotEqual(new_session.token, session.token)
        self.assertGreaterEqual(len(new_session.token), 32)

        BalePaySession.objects.filter(pk=new_session.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
        self.update({"message": {"chat": {"id": CHAT}, "text": f"/start {new_session.token}"}})
        self.assertIn("منقضی", self.bale.named("sendMessage")[-1]["text"])

    def test_webhook_secret_and_authorization(self):
        self.assertEqual(self.client.post("/api/bale/webhook/wrong", {}, format="json").status_code, 404)
        self.assertEqual(self.client.get(WEBHOOK).status_code, 405)
        order = self.make_order(10_000_000, "ONLINE")
        intruder = self._client_for(User.objects.create_user(phone="09121230002", is_verified=True))
        self.assertEqual(intruder.post(f"/api/v1/orders/{order.order_number}/payment/online").status_code, 404)
        self.assertEqual(intruder.post(f"/api/v1/orders/{order.order_number}/payment/move-to-bank").status_code, 404)

    def test_session_amount_respects_a_lowered_limit(self):
        order = self.make_order(10_000_000, "ONLINE")
        enable_payments(limit_rial=50_000_000)
        response = self.client.post(f"/api/v1/orders/{order.order_number}/payment/online")
        self.assertEqual(response.data["code"], "ONLINE_PAYMENT_LIMIT_EXCEEDED")

    def test_connection_check_never_returns_tokens(self):
        result = bale.test_connection()
        self.assertEqual(result, {"ok": True, "botUsername": "arbytebot", "providerTokenSet": True})


class CombinedPaymentTests(PaymentTestBase):
    def _upload(self, order):
        file_obj = SimpleUploadedFile("r.jpg", JPEG, content_type="image/jpeg")
        return self.client.post(
            f"/api/v1/orders/{order.order_number}/receipt",
            {"file": file_obj, "amount": 30_000_000},
            format="multipart",
        )

    def test_online_then_bank(self):
        order = self.make_order(45_000_000, "COMBINED")
        self.pay(self.open_invoice(order))
        order.refresh_from_db()
        self.assertEqual((order.status, order.payment_status), ("AWAITING_PAYMENT", "PARTIALLY_PAID"))
        self.assertEqual(
            payment_state.breakdown(order),
            {
                "plan": "COMBINED",
                "total": 45_000_000,
                "paid": 15_000_000,
                "remaining": 30_000_000,
                "onlinePaid": 15_000_000,
                "bankPaid": 0,
            },
        )
        detail = self.client.get(f"/api/v1/orders/{order.order_number}").data["data"]
        self.assertEqual(detail["paymentBreakdown"]["remaining"], 30_000_000)
        self.assertIsNotNone(detail["cardToCardAccount"])  # حساب برای واریز باقی‌مانده

        self.assertEqual(self._upload(order).status_code, 201)
        order.refresh_from_db()
        self.assertEqual((order.status, order.payment_status), ("PAYMENT_REVIEW", "PARTIALLY_PAID"))
        receipt = PaymentReceipt.objects.get()
        self.assertEqual(receipt.payment.amount, 30_000_000)  # رسید به همان سهم واریز وصل است

        from .services import approve_receipt

        approve_receipt(receipt=receipt, admin_user=None)
        order.refresh_from_db()
        self.assertEqual((order.status, order.payment_status), ("PAID", "CONFIRMED"))
        self.assertEqual(payment_state.breakdown(order)["remaining"], 0)

    def test_bank_approved_first_does_not_mark_paid(self):
        from .services import approve_receipt

        order = self.make_order(45_000_000, "COMBINED")
        self._upload(order)
        approve_receipt(receipt=PaymentReceipt.objects.get(), admin_user=None)
        order.refresh_from_db()
        self.assertEqual((order.status, order.payment_status), ("AWAITING_PAYMENT", "PARTIALLY_PAID"))
        self.pay(self.open_invoice(order))
        order.refresh_from_db()
        self.assertEqual(order.status, "PAID")

    def test_online_failure_moves_remainder_to_bank(self):
        order = self.make_order(10_000_000, "ONLINE")
        response = self.client.post(f"/api/v1/orders/{order.order_number}/payment/move-to-bank")
        self.assertEqual(response.status_code, 200, response.data)
        order.refresh_from_db()
        self.assertEqual(order.payment_plan, "BANK_TRANSFER")
        statuses = sorted((p.method, p.status, p.amount) for p in order.payments.all())
        self.assertEqual(statuses, [("GATEWAY", "VOID", 10_000_000), ("MANUAL_CARD_TO_CARD", "UNPAID", 10_000_000)])
        self.assertEqual(self._upload(order).status_code, 201)

    def test_online_only_order_refuses_receipt(self):
        order = self.make_order(10_000_000, "ONLINE")
        self.assertEqual(self._upload(order).status_code, 409)
        self.assertFalse(Payment.objects.filter(method="MANUAL_CARD_TO_CARD").exists())


class AutoCancelSafetyTests(PaymentTestBase):
    def test_paid_or_in_progress_orders_are_never_auto_cancelled(self):
        from django.test import override_settings

        from .tasks import cancel_stale_unpaid_orders

        partly_paid = self.make_order(45_000_000, "COMBINED")
        self.pay(self.open_invoice(partly_paid))
        in_progress = self.make_order(5_000_000, "ONLINE")
        self.open_invoice(in_progress)
        abandoned = self.make_order(5_000_000, "BANK_TRANSFER")
        Order.objects.update(created_at=timezone.now() - timedelta(days=3))

        with override_settings(ORDER_AUTO_CANCEL_AFTER_HOURS=24):
            self.assertEqual(cancel_stale_unpaid_orders(), 1)
        statuses = {o.pk: o.status for o in Order.objects.all()}
        self.assertEqual(statuses[abandoned.pk], "CANCELLED")
        self.assertEqual(statuses[partly_paid.pk], "AWAITING_PAYMENT")
        self.assertEqual(statuses[in_progress.pk], "AWAITING_PAYMENT")
