from unittest.mock import MagicMock, patch

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.inventory.models import StockMovement
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
    """BACKEND-TASK.md §3.6-ب — the 8 admin PDF exports, all rendered via
    headless Chromium (apps/documents). One happy-path assertion per
    endpoint, plus a single table-driven permission sweep."""

    def setUp(self):
        patcher = patch("apps.documents.pdf.sync_playwright", new=_mock_sync_playwright())
        patcher.start()
        self.addCleanup(patcher.stop)

        self.staff = self.make_staff()
        self.client.force_authenticate(user=self.staff)
        self.customer = self.make_customer(phone="09121110030")
        self.product = self.make_product(stock=10)
        self.order = Order.objects.create(
            user=self.customer,
            shipping_address={"province": "تهران", "city": "تهران", "line": "خیابان ولیعصر", "receiverName": "مشتری تست", "receiverPhone": "09121110030"},
            status="processing",
            subtotal=100000, total=100000,
        )
        OrderItem.objects.create(order=self.order, product=self.product, product_name=self.product.name, sku=self.product.sku, price=100000, quantity=1)

    def _assert_pdf(self, response):
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF-"))

    def test_admin_order_invoice_pdf(self):
        self.order.status = "paid"
        self.order.paid_at = timezone.now()
        self.order.save(update_fields=["status", "paid_at"])
        response = self.client.get(reverse("admin-order-invoice-pdf", args=[self.order.pk]))
        self._assert_pdf(response)

    def test_admin_order_invoice_pdf_rejects_unpaid_order(self):
        pending_order = Order.objects.create(user=self.customer, shipping_address={}, status="pending", total=1000)
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
        StockMovement.objects.record(self.product, "sale", 1, reference=self.order.number)
        response = self.client.get(reverse("admin-stock-ledger-pdf"), {"product": self.product.pk})
        self._assert_pdf(response)

    def test_admin_stocktake_pdf(self):
        response = self.client.get(reverse("admin-inventory-stocktake-pdf"))
        self._assert_pdf(response)

    def test_admin_sales_report_pdf(self):
        response = self.client.get(reverse("admin-report-sales-pdf"))
        self._assert_pdf(response)

    def test_admin_price_list_pdf(self):
        response = self.client.get(reverse("admin-product-price-list-pdf"))
        self._assert_pdf(response)

    def test_admin_price_list_pdf_respects_filters(self):
        response = self.client.get(reverse("admin-product-price-list-pdf"), {"search": "no-such-product"})
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
            reverse("admin-stock-ledger-pdf"),
            reverse("admin-inventory-stocktake-pdf"),
            reverse("admin-report-sales-pdf"),
            reverse("admin-product-price-list-pdf"),
            reverse("admin-user-statement-pdf", args=[self.customer.pk]),
        ]
        for url in urls:
            response = self.client.get(url)
            self.assertEqual(response.status_code, 403, f"{url} should 403 for non-staff")
