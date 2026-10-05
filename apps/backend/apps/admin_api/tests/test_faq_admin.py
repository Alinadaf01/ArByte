"""سوالات متداول از پنل: فقط ادمین می‌نویسد، فروشگاه همان ترتیب را می‌خواند."""

from rest_framework.test import APITestCase

from apps.content.models import FaqItem

from .base import AdminApiTestMixin


class FaqAdminTests(AdminApiTestMixin, APITestCase):
    def test_seeded_defaults_and_public_shape(self):
        self.assertGreaterEqual(FaqItem.objects.count(), 4)
        data = self.client.get("/api/v1/content/faq").data["data"]
        self.assertEqual(len([f for f in data if f["onHome"]]), 4)
        self.assertEqual(set(data[0]), {"id", "question", "answer", "onHome"})

    def test_put_replaces_list_in_order(self):
        self.client.force_authenticate(user=self.make_staff())
        items = [
            {"question": "دوم؟", "answer": "ب", "showOnHome": False},
            {"question": "اول؟", "answer": "الف", "showOnHome": True},
        ]
        response = self.client.put("/api/admin/pages/faq/", {"items": items}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        public = self.client.get("/api/v1/content/faq").data["data"]
        self.assertEqual([f["question"] for f in public], ["دوم؟", "اول؟"])
        self.assertEqual([f["onHome"] for f in public], [False, True])

    def test_validation_and_permissions(self):
        self.assertIn(self.client.put("/api/admin/pages/faq/", {"items": []}, format="json").status_code, (401, 403))
        self.client.force_authenticate(user=self.make_staff())
        bad = self.client.put("/api/admin/pages/faq/", {"items": [{"question": "", "answer": "x"}]}, format="json")
        self.assertEqual(bad.status_code, 400)
        self.assertGreaterEqual(FaqItem.objects.count(), 4)  # چیزی پاک نشد
