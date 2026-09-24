from django.urls import reverse
from rest_framework.test import APITestCase

from apps.catalog.models import PriceHistory

from .base import AdminApiTestMixin


class AdminBulkPriceEditTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.staff = self.make_staff()
        self.client.force_authenticate(user=self.staff)
        self.product = self.make_product(price=100000, stock=0)

    def test_preview_does_not_write_anything(self):
        response = self.client.post(
            reverse("admin-product-prices-bulk") + "?preview=true",
            {"productIds": [self.product.pk], "mode": "percent", "direction": "increase", "value": 10},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["changes"][0]["new_price"], 110000)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, 100000)  # unchanged
        self.assertEqual(PriceHistory.objects.count(), 0)

    def test_apply_writes_price_and_history(self):
        response = self.client.post(
            reverse("admin-product-prices-bulk"),
            {"productIds": [self.product.pk], "mode": "fixed", "direction": "decrease", "value": 20000, "reason": "sale"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, 80000)
        history = PriceHistory.objects.get(product=self.product)
        self.assertEqual(history.old_price, 100000)
        self.assertEqual(history.new_price, 80000)
        self.assertEqual(history.reason, "sale")
        self.assertEqual(history.changed_by, self.staff)

    def test_set_mode_ignores_direction(self):
        response = self.client.post(
            reverse("admin-product-prices-bulk"),
            {"productIds": [self.product.pk], "mode": "set", "value": 55000},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["changes"][0]["new_price"], 55000)

    def test_round_to_nearest_1000(self):
        response = self.client.post(
            reverse("admin-product-prices-bulk"),
            {"productIds": [self.product.pk], "mode": "set", "value": 54499, "roundToNearest1000": True},
            format="json",
        )
        self.assertEqual(response.data["changes"][0]["new_price"], 54000)

    def test_percent_or_fixed_requires_direction(self):
        response = self.client.post(
            reverse("admin-product-prices-bulk"),
            {"productIds": [self.product.pk], "mode": "percent", "value": 10},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_price_history_endpoint(self):
        self.client.post(
            reverse("admin-product-prices-bulk"),
            {"productIds": [self.product.pk], "mode": "set", "value": 90000},
            format="json",
        )
        response = self.client.get(reverse("admin-price-history", args=[self.product.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
