from rest_framework.test import APITestCase

from apps.analytics.models import AdminActivityLog
from apps.content.models import AboutPage, LegalDocument

from .base import AdminApiTestMixin


class AdminContentPagesTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_about_update_cleans_rows_and_logs(self):
        res = self.client.put(
            "/api/admin/pages/about/",
            {
                "heroTitle": "عنوان",
                "storyBody": "یک\n\nدو",
                "team": [{"name": "نیما", "role": "فنی"}, {"name": "", "role": ""}],
                "principles": [],
                "timeline": [{"year": "۱۴۰۰", "note": "شروع"}],
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        about = AboutPage.load()
        self.assertEqual(about.team, [{"name": "نیما", "role": "فنی"}])
        self.assertEqual(about.hero_title, "عنوان")
        self.assertTrue(AdminActivityLog.objects.exists())

    def test_legal_lists_all_keys_and_updates_one(self):
        res = self.client.get("/api/admin/pages/legal/")
        self.assertEqual([d["key"] for d in res.json()], ["terms", "privacy", "shipping", "returns", "warranty"])
        res = self.client.patch("/api/admin/pages/legal/privacy/", {"body": "## داده‌ها\nمتن"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(LegalDocument.objects.get(key="privacy").body, "## داده‌ها\nمتن")
        self.assertEqual(self.client.get("/api/v1/content/legal").json()["data"][0]["key"], "privacy")
