from django.urls import reverse
from rest_framework.test import APITestCase

from apps.catalog.models import Product
from apps.inventory.models import StockAlert, StockMovement

from .base import AdminApiTestMixin


class AdminInventoryApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.product = self.make_product(stock=3)
        Product.objects.filter(pk=self.product.pk).update(cost_price=1000)
        self.product.refresh_from_db()
        StockAlert.objects.create(product=self.product, reorder_point=5, is_active=True)

    def test_inventory_list_shows_low_stock(self):
        response = self.client.get(reverse("admin-inventory-list"))
        row = response.data["results"][0]
        self.assertTrue(row["is_low"])
        self.assertEqual(row["stock_value"], 3000)

    def test_inventory_summary(self):
        response = self.client.get(reverse("admin-inventory-summary"))
        self.assertEqual(response.data["low_stock_count"], 1)
        self.assertEqual(response.data["total_stock_value"], 3000)

    def test_patch_stock_alert_upserts(self):
        response = self.client.patch(
            reverse("admin-inventory-alert", args=[self.product.pk]), {"reorderPoint": 20, "isActive": True}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        alert = StockAlert.objects.get(product=self.product)
        self.assertEqual(alert.reorder_point, 20)

    def test_manual_purchase_movement(self):
        response = self.client.post(
            reverse("admin-stock-movement-list"), {"productId": self.product.pk, "type": "purchase", "quantity": 5}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 8)

    def test_sale_type_rejected_on_manual_endpoint(self):
        response = self.client.post(
            reverse("admin-stock-movement-list"), {"productId": self.product.pk, "type": "sale", "quantity": 1}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_return_in_type_rejected_on_manual_endpoint(self):
        response = self.client.post(
            reverse("admin-stock-movement-list"), {"productId": self.product.pk, "type": "return_in", "quantity": 1}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_negative_resulting_stock_rejected(self):
        response = self.client.post(
            reverse("admin-stock-movement-list"), {"productId": self.product.pk, "type": "scrap", "quantity": 999}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_list_movements_and_filter_by_type(self):
        StockMovement.objects.record(self.product, "adjustment", 2)
        response = self.client.get(reverse("admin-stock-movement-list"), {"type": "adjustment"})
        self.assertEqual(response.data["count"], 1)

    def test_export_xlsx(self):
        response = self.client.get(reverse("admin-stock-movement-export"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response["Content-Type"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
