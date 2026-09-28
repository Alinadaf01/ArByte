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
        self.order = Order.objects.create(user=customer, shipping_address={}, subtotal=100000, total=100000)
        OrderItem.objects.create(
            order=self.order, variant=self.variant, product_name_snapshot=self.product.name,
            sku_snapshot=self.variant.sku, unit_price=100000, quantity=2,
        )
        self.order.paid_at = timezone.now()
        self.order.status = "paid"
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
