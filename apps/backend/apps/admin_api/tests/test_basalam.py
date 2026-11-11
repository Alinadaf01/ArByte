from django.urls import reverse
from rest_framework.test import APITestCase

from .base import AdminApiTestMixin


class AdminBasalamTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.make_product(stock=4, price=50_000_000)

    def test_status_reports_disabled_without_credential(self):
        response = self.client.get(reverse("admin-basalam-status"))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["enabled"])
        self.assertEqual(data["itemCount"], 1)

    def test_json_export_matches_salam_api_shape(self):
        response = self.client.get(reverse("admin-basalam-products-export"), {"format": "json"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        item = data["products"][0]
        for key in ("sku", "name", "primary_price", "stock"):
            self.assertIn(key, item)

    def test_xlsx_export_default_format(self):
        response = self.client.get(reverse("admin-basalam-products-export"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
