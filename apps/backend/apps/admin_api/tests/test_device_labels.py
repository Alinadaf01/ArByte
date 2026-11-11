from django.urls import reverse
from rest_framework.test import APITestCase

from apps.devicelabels.models import DeviceLabel

from .base import AdminApiTestMixin


class AdminDeviceLabelTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_create_and_list(self):
        response = self.client.post(
            reverse("admin-device-label-list"),
            {
                "code": "1412",
                "device_name": "MacBook Pro 14 M3 Pro",
                "cpu": "Apple M3 Pro",
                "ram": "18GB",
                "storage": "512GB",
                "battery_health_percent": 92,
                "battery_cycle_count": 140,
                "grade": "A+",
                "defect_notes": "هاله مشکی روی کیبورد",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["code"], "1412")
        self.assertEqual(response.data["grade_display"], "A+")

        list_response = self.client.get(reverse("admin-device-label-list"))
        self.assertEqual(list_response.data["count"], 1)

    def test_duplicate_code_rejected(self):
        DeviceLabel.objects.create(code="1412", device_name="Device A")
        response = self.client.post(
            reverse("admin-device-label-list"),
            {"code": "1412", "device_name": "Device B"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_pdf_download(self):
        label = DeviceLabel.objects.create(
            code="1413", device_name="Surface Pro 10", grade="A", defect_notes="سالم"
        )
        response = self.client.get(reverse("admin-device-label-pdf", args=[label.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")

    def test_delete(self):
        label = DeviceLabel.objects.create(code="1414", device_name="Device C")
        response = self.client.delete(reverse("admin-device-label-detail", args=[label.pk]))
        self.assertEqual(response.status_code, 204)
        self.assertEqual(DeviceLabel.objects.count(), 0)
