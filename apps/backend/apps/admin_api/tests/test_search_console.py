from datetime import date

from django.urls import reverse
from rest_framework.test import APITestCase

from apps.admin_api.models import SearchConsolePerformance

from .base import AdminApiTestMixin


class AdminSearchConsoleApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_returns_503_when_cache_empty(self):
        for url_name in ["admin-sc-performance", "admin-sc-queries", "admin-sc-pages", "admin-sc-index-status", "admin-sc-sitemap-status"]:
            response = self.client.get(reverse(url_name))
            self.assertEqual(response.status_code, 503, url_name)

    def test_returns_data_once_cached(self):
        SearchConsolePerformance.objects.create(date=date.today(), impressions=100, clicks=10, ctr=0.1, avg_position=5.0)
        response = self.client.get(reverse("admin-sc-performance"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["impressions"], 100)
