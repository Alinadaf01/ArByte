"""E-05 §۴ — سفر کامل مشتری: خرید کارت‌به‌کارت → رسید → تأیید ادمین → پیامک
تأیید پرداخت → ورود سریال → SHIPPED (پیامک ارسال) → DELIVERED → فاکتور و
کارت گارانتی → پیگیری مهمان (حریم خصوصی) → /account/devices.

روی همان الگوی apps.public_api.tests_d05_orders.OrderTestBase و
apps.orders.tests's captureOnCommitCallbacks (برای دیدن پیامک بدون نیاز
واقعی به کاوه‌نگار/Celery) — هیچ مسیر جدیدی اختراع نشده."""

from unittest.mock import MagicMock, patch

from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.inventory.models import Inventory
from apps.orders import order_status
from apps.orders.models import Order, OrderItemUnit, PaymentReceipt, Shipment
from apps.public_api.jwt_tokens import issue_tokens
from apps.settings.models import ShippingMethod, SiteSettings
from apps.users.models import Address, User

_FAKE_PDF_BYTES = b"%PDF-1.4 fake"


def _mock_sync_playwright():
    mock = MagicMock()
    mock.return_value.__enter__.return_value.chromium.launch.return_value.new_page.return_value.pdf.return_value = (
        _FAKE_PDF_BYTES
    )
    return mock


class CustomerJourneyTests(TransactionTestCase):
    """TransactionTestCase — نه TestCase — چون گام‌های میانی از طریق
    self.client (API واقعی) هستند و باید واقعاً commit شوند تا گام بعدی
    (پیگیری مهمان/دستگاه‌ها) داده‌ی تازه ببیند."""

    def setUp(self):
        settings_obj = SiteSettings.load()
        settings_obj.card_to_card_holder_name = "علی نداف نیا"
        settings_obj.card_to_card_number = "6063731076870360"
        settings_obj.card_to_card_sheba = "IR380600520670007862283001"
        settings_obj.business_name = "فروشگاه آربایت"
        settings_obj.national_id = "10861234567"
        settings_obj.economic_code = "411234567890"
        settings_obj.address = "تهران، خیابان ولیعصر، پلاک ۱۲۳"
        settings_obj.postal_code = "1234567890"
        settings_obj.phone_display = "۰۲۱-۱۲۳۴۵۶۷۸"
        settings_obj.test_period_days = 7
        settings_obj.warranty_terms = "دستگاه در صورت ایراد فنی ساخت، ظرف مهلت گارانتی تعویض یا تعمیر می‌شود."
        settings_obj.save()

        pdf_patcher = patch("apps.documents.pdf.sync_playwright", new=_mock_sync_playwright())
        pdf_patcher.start()
        self.addCleanup(pdf_patcher.stop)

        self.user = User.objects.create_user(phone="09121110077", is_verified=True)
        access, _ = issue_tokens(self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        self.address = Address.objects.create(
            user=self.user, province="تهران", city="تهران", line="خیابان آزادی، پلاک ۹",
            postal_code="1234567890", receiver_name="مریم رضایی", receiver_phone="09121110077",
        )
        ShippingMethod.objects.create(name="پست پیشتاز", cost=0, is_active=True)

        brand = Brand.objects.create(name="ArByte Test Brand", slug="arbyte-test-brand-e05")
        category = Category.objects.create(slug="laptops-e05", name="لپ‌تاپ")
        product = Product.objects.create(
            slug="e05-journey-product", name="لپ‌تاپ سفر مشتری", brand=brand, category=category,
            condition="NEW", requires_serial=True, warranty_months=24,
        )
        self.variant = ProductVariant.objects.create(
            product=product, sku="E05-JOURNEY-1", is_default=True, final_price=50_000_000,
        )
        Inventory.objects.create(variant=self.variant)
        Inventory.objects.stock_in(self.variant, 5, reference="PO-E05")

    def test_full_journey_card_to_card_to_delivered_devices_and_guest_tracking(self):
        # ۱) خرید کارت‌به‌کارت (E-02) ---------------------------------------
        add_resp = self.client.post(
            "/api/v1/cart/items", {"variantId": self.variant.pk, "quantity": 1}, format="json",
        )
        self.assertEqual(add_resp.status_code, 201, add_resp.data)

        checkout_resp = self.client.post(
            "/api/v1/orders",
            {"addressId": self.address.pk, "paymentMethod": "MANUAL_CARD_TO_CARD"},
            format="json",
        )
        self.assertEqual(checkout_resp.status_code, 201, checkout_resp.data)
        order_number = checkout_resp.data["data"]["orderNumber"]
        self.assertIsNotNone(checkout_resp.data["data"]["cardToCardAccount"])
        self.assertEqual(
            checkout_resp.data["data"]["cardToCardAccount"]["holderName"], "علی نداف نیا",
        )

        # ۲) رسید پرداخت ------------------------------------------------------
        from django.core.files.uploadedfile import SimpleUploadedFile

        receipt_file = SimpleUploadedFile("receipt.jpg", b"fake-receipt-bytes", content_type="image/jpeg")
        upload_resp = self.client.post(
            f"/api/v1/orders/{order_number}/receipt",
            {"file": receipt_file, "amount": 50_000_000},
            format="multipart",
        )
        self.assertEqual(upload_resp.status_code, 201, upload_resp.data)

        order = Order.objects.get(order_number=order_number)
        self.assertEqual(order.status, "PAYMENT_REVIEW")

        # ۳) تأیید ادمین → پیامک «پرداخت تأیید شد» ---------------------------
        from apps.orders import services as order_services

        receipt = PaymentReceipt.objects.get(payment__order__order_number=order_number)
        with patch("apps.notifications.services.NotificationService.send_sms") as mock_send:
            order_services.approve_receipt(receipt=receipt, admin_user=self.user)
        order.refresh_from_db()
        self.assertEqual(order.status, "PAID")
        self.assertEqual(order.payment_status, "CONFIRMED")
        confirmed_calls = [c for c in mock_send.call_args_list if c.args[1] == "order_confirmed"]
        self.assertEqual(len(confirmed_calls), 1)
        self.assertEqual(confirmed_calls[0].args[0], order.shipping_mobile)

        # فاکتور از PAID به بعد در دسترس است (E-05 §۱) — سرور واقعاً رندر می‌کند.
        invoice_resp = self.client.get(f"/api/v1/orders/{order_number}/invoice.pdf")
        self.assertEqual(invoice_resp.status_code, 200)
        self.assertEqual(invoice_resp["Content-Type"], "application/pdf")

        # ۴) ورود سریال (سند تسک: «فعلاً Django admin کافی است»، اینجا معادل ORM) + SHIPPED
        order_status.transition_to(order, "PROCESSING")
        item = order.items.get()
        OrderItemUnit.objects.create(order_item=item, serial_number="SN-E05-0001")

        Shipment.objects.create(order=order, provider="پست پیشتاز", tracking_number="TRK-E05-0001")
        order_status.transition_to(order, "READY_TO_SHIP")
        with patch("apps.notifications.services.NotificationService.send_sms") as mock_send:
            order_status.transition_to(order, "SHIPPED")
        order.refresh_from_db()
        shipped_calls = [c for c in mock_send.call_args_list if c.args[1] == "order_shipped"]
        self.assertEqual(len(shipped_calls), 1)

        # کارت گارانتی از SHIPPED به بعد در دسترس است (E-04/E-05 §۱).
        unit = item.units.get()
        warranty_resp = self.client.get(
            f"/api/v1/orders/{order_number}/units/{unit.certificate_id}/warranty.pdf"
        )
        self.assertEqual(warranty_resp.status_code, 200)
        self.assertEqual(warranty_resp["Content-Type"], "application/pdf")

        # ۵) صفحه‌ی مالک واردشده — سریال دیده می‌شود ---------------------------
        owner_resp = self.client.get(f"/api/v1/orders/{order_number}")
        self.assertEqual(owner_resp.status_code, 200)
        owner_data = owner_resp.data["data"]
        self.assertEqual(owner_data["status"], "SHIPPED")
        self.assertEqual(owner_data["items"][0]["units"][0]["serialNumber"], "SN-E05-0001")
        self.assertIn("shippingAddress", owner_data)

        # ۶) پیگیری مهمان — حریم خصوصی (E-05 §۲) --------------------------------
        guest_client = APIClient()
        guest_resp = guest_client.post(
            "/api/v1/orders/track",
            {"orderNumber": order_number, "mobile": "09121110077"},
            format="json",
        )
        self.assertEqual(guest_resp.status_code, 200)
        guest_data = guest_resp.data["data"]
        self.assertEqual(guest_data["shippingCity"], "تهران")
        self.assertNotIn("shippingAddress", guest_data)
        self.assertNotIn("invoice", guest_data)
        self.assertNotIn("payment", guest_data)
        self.assertNotIn("units", guest_data["items"][0])

        # ۷) تحویل → /account/devices --------------------------------------
        devices_before = self.client.get("/api/v1/account/devices")
        self.assertEqual(devices_before.data["data"], [])

        order_status.transition_to(order, "DELIVERED")

        devices_after = self.client.get("/api/v1/account/devices")
        self.assertEqual(devices_after.status_code, 200)
        devices = devices_after.data["data"]
        self.assertEqual(len(devices), 1)
        self.assertEqual(devices[0]["orderNumber"], order_number)
        self.assertEqual(devices[0]["serialNumber"], "SN-E05-0001")
        self.assertTrue(devices[0]["hasWarranty"])
