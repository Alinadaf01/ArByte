from unittest.mock import MagicMock, patch

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.orders.models import Order, OrderItem

from .base import AdminApiTestMixin

# D-01: cdn.playwright.dev geoblocks Iranian IPs with a 403 (same issue
# documented in apps/backend/Dockerfile's own comment) — `playwright install
# chromium` cannot complete on this dev machine. Per
# 01-tasks/batch-02/D-01.md §4 ("اگر روی ویندوز دردسر داشت، PDF در تست mock
# شود"), apps.documents.pdf.sync_playwright is mocked at the one place every
# PDF path (direct and Celery-wrapped) actually calls it, so these tests
# still exercise real view/permission/template wiring end to end — only the
# Chromium render itself is faked.
_FAKE_PDF_BYTES = b"%PDF-1.4\n%mocked in tests -- no real Chromium (D-01)\n%%EOF"


def _mock_sync_playwright():
    mock = MagicMock()
    mock.return_value.__enter__.return_value.chromium.launch.return_value.new_page.return_value.pdf.return_value = (
        _FAKE_PDF_BYTES
    )
    return mock


class AdminDocumentPdfTests(AdminApiTestMixin, APITestCase):
    """BACKEND-TASK.md §3.6-ب — admin PDF exports, all rendered via headless
    Chromium (apps/documents). D-02: stock-ledger/stocktake/price-list PDFs
    are reached through inventory.py/products.py, both disabled (see
    docs/backend/ADMIN-DISABLED.md) — F-02 re-enabled all of them."""

    def setUp(self):
        patcher = patch("apps.documents.pdf.sync_playwright", new=_mock_sync_playwright())
        patcher.start()
        self.addCleanup(patcher.stop)

        self.staff = self.make_staff()
        self.client.force_authenticate(user=self.staff)
        self.customer = self.make_customer(phone="09121110030")
        self.product = self.make_product(stock=10)
        self.variant = self.product.variants.first()
        self.order = Order.objects.create(
            user=self.customer,
            shipping_recipient_name="مشتری تست", shipping_mobile="09121110030",
            shipping_province="تهران", shipping_city="تهران", shipping_address_line="خیابان ولیعصر",
            status="PROCESSING",
            subtotal=100000, final_total=100000,
        )
        OrderItem.objects.create(
            order=self.order,
            variant=self.variant,
            product_name_snapshot=self.product.name,
            sku_snapshot=self.variant.sku,
            unit_price=100000,
            quantity=1,
            final_price=100000,
        )

    def _assert_pdf(self, response):
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF-"))

    def test_admin_order_invoice_pdf(self):
        self.order.status = "PAID"
        self.order.paid_at = timezone.now()
        self.order.save(update_fields=["status", "paid_at"])
        response = self.client.get(reverse("admin-order-invoice-pdf", args=[self.order.pk]))
        self._assert_pdf(response)

    def test_admin_order_invoice_pdf_rejects_unpaid_order(self):
        pending_order = Order.objects.create(
            user=self.customer, shipping_recipient_name="", shipping_mobile="", shipping_province="",
            shipping_city="", shipping_address_line="", status="PENDING", subtotal=1000, final_total=1000,
        )
        response = self.client.get(reverse("admin-order-invoice-pdf", args=[pending_order.pk]))
        self.assertEqual(response.status_code, 400)

    def test_admin_packing_slip_pdf(self):
        response = self.client.get(reverse("admin-order-packing-slip-pdf", args=[self.order.pk]))
        self._assert_pdf(response)

    def test_admin_daily_shipping_list_pdf_includes_processing_orders(self):
        response = self.client.get(reverse("admin-daily-shipping-list-pdf"))
        self._assert_pdf(response)

    def test_admin_daily_shipping_list_pdf_respects_date_filter(self):
        response = self.client.get(reverse("admin-daily-shipping-list-pdf"), {"date": "2020-01-01"})
        self._assert_pdf(response)

    def test_admin_stock_ledger_pdf(self):
        response = self.client.get(reverse("admin-inventory-transactions"), {"format": "pdf"})
        self._assert_pdf(response)

    def test_admin_stocktake_pdf(self):
        response = self.client.get(reverse("admin-stocktake-pdf"))
        self._assert_pdf(response)

    def test_admin_sales_report_pdf(self):
        response = self.client.get(reverse("admin-report-sales-pdf"))
        self._assert_pdf(response)

    def test_admin_price_list_pdf(self):
        response = self.client.get(reverse("admin-price-list-pdf"))
        self._assert_pdf(response)

    def test_admin_price_list_pdf_respects_filters(self):
        response = self.client.get(reverse("admin-price-list-pdf"), {"search": "nothing-matches"})
        self._assert_pdf(response)

    def test_admin_customer_statement_pdf(self):
        response = self.client.get(reverse("admin-user-statement-pdf", args=[self.customer.pk]))
        self._assert_pdf(response)

    def test_non_staff_denied_on_all_document_endpoints(self):
        self.client.force_authenticate(user=self.customer)
        urls = [
            reverse("admin-order-invoice-pdf", args=[self.order.pk]),
            reverse("admin-order-packing-slip-pdf", args=[self.order.pk]),
            reverse("admin-daily-shipping-list-pdf"),
            reverse("admin-report-sales-pdf"),
            reverse("admin-user-statement-pdf", args=[self.customer.pk]),
        ]
        for url in urls:
            response = self.client.get(url)
            self.assertEqual(response.status_code, 403, f"{url} should 403 for non-staff")
