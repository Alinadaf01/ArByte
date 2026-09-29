from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.catalog.models import ProductVariant
from apps.orders.models import Order, OrderItem

from .base import AdminApiTestMixin


class AdminReportsApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.product = self.make_product(stock=10, price=100000)
        self.variant = self.product.variants.first()
        # cost_price moved to ProductVariant.supplier_price in D-02.
        ProductVariant.objects.filter(pk=self.variant.pk).update(supplier_price=40000)
        customer = self.make_customer()
        self.order = Order.objects.create(
            user=customer, shipping_recipient_name="", shipping_mobile="", shipping_province="",
            shipping_city="", shipping_address_line="", subtotal=100000, final_total=100000,
        )
        OrderItem.objects.create(
            order=self.order, variant=self.variant, product_name_snapshot=self.product.name,
            sku_snapshot=self.variant.sku, unit_price=100000, quantity=2, final_price=200000,
        )
        self.order.paid_at = timezone.now()
        self.order.status = "PAID"
        self.order.save(update_fields=["paid_at", "status"])

    def test_sales_report(self):
        response = self.client.get(reverse("admin-report-sales"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["series"]), 1)
        self.assertEqual(response.data["series"][0]["total"], 100000)

    def test_top_products_report(self):
        response = self.client.get(reverse("admin-report-top-products"), {"by": "quantity"})
        self.assertEqual(response.data[0]["units_sold"], 2)

    def test_gross_margin_report(self):
        response = self.client.get(reverse("admin-report-gross-margin"))
        # revenue = 100000*2 = 200000, cost = 40000*2 = 80000
        self.assertEqual(response.data["revenue"], 200000)
        self.assertEqual(response.data["cost"], 80000)
        self.assertEqual(response.data["margin"], 120000)
        self.assertEqual(response.data["coverage_percent"], 100.0)

    def test_by_gateway_report_empty_without_payments(self):
        response = self.client.get(reverse("admin-report-by-gateway"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_sales_export_returns_xlsx(self):
        response = self.client.get(reverse("admin-report-sales-export"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response["Content-Type"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    def test_sales_report_monthly_uses_jalali_months(self):
        # 2026-09-22 = ۳۱ شهریور ۱۴۰۵، 2026-09-23 = ۱ مهر ۱۴۰۵ — ماه میلادی یکی، ماه شمسی دو تا.
        tz = timezone.get_current_timezone()
        Order.objects.filter(pk=self.order.pk).update(paid_at=timezone.datetime(2026, 9, 22, 12, tzinfo=tz))
        second = Order.objects.create(
            user=self.order.user, shipping_recipient_name="", shipping_mobile="", shipping_province="",
            shipping_city="", shipping_address_line="", subtotal=50000, final_total=50000, status="PAID",
            paid_at=timezone.datetime(2026, 9, 23, 12, tzinfo=tz),
        )
        self.assertTrue(second.pk)
        series = self.client.get(reverse("admin-report-sales"), {"groupBy": "month"}).data["series"]
        self.assertEqual([(r["label"], r["total"]) for r in series], [("شهریور 1405", 100000), ("مهر 1405", 50000)])

    def test_by_payment_method_report_reads_payment_snapshot(self):
        from apps.orders.models import Payment

        Payment.objects.create(order=self.order, method="MANUAL_CARD_TO_CARD", amount=60000, status="CONFIRMED")
        Payment.objects.create(order=self.order, method="GATEWAY", gateway="ZARINPAL", amount=40000, status="CONFIRMED")
        rows = self.client.get(reverse("admin-report-by-gateway")).data
        self.assertEqual([(r["label"], r["total"]) for r in rows], [("کارت‌به‌کارت", 60000), ("زرین‌پال", 40000)])
