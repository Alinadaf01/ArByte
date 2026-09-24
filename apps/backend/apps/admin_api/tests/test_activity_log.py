from django.urls import reverse
from rest_framework.test import APITestCase

from .base import AdminApiTestMixin


class AdminActivityLogApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.staff = self.make_staff()
        self.client.force_authenticate(user=self.staff)

    def test_mutations_are_logged_automatically(self):
        self.client.post(reverse("admin-category-list"), {"slug": "test", "name": "Test"}, format="json")
        response = self.client.get(reverse("admin-activity-log"))
        self.assertGreaterEqual(response.data["count"], 1)
        entry = response.data["results"][0]
        self.assertEqual(entry["model_name"], "Category")
        self.assertEqual(entry["action"], "create")

    def test_filter_by_model(self):
        self.client.post(reverse("admin-category-list"), {"slug": "t2", "name": "T2"}, format="json")
        response = self.client.get(reverse("admin-activity-log"), {"model": "Category"})
        self.assertGreaterEqual(response.data["count"], 1)
        for entry in response.data["results"]:
            self.assertEqual(entry["model_name"], "Category")
