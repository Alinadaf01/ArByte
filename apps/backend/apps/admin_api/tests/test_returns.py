from django.urls import reverse
from rest_framework.test import APITestCase

from apps.orders.models import Order, Return

from .base import AdminApiTestMixin


class AdminReturnApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        customer = self.make_customer()
        order = Order.objects.create(user=customer, shipping_address={}, total=1000)
        self.ret = Return.objects.create(order=order, reason="خرابی")

    def test_list_and_detail(self):
        response = self.client.get(reverse("admin-return-list"))
        self.assertEqual(response.data["count"], 1)
        response = self.client.get(reverse("admin-return-detail", args=[self.ret.pk]))
        self.assertEqual(response.data["status"], "requested")

    def test_filter_by_status(self):
        response = self.client.get(reverse("admin-return-list"), {"status": "requested"})
        self.assertEqual(response.data["count"], 1)
        response = self.client.get(reverse("admin-return-list"), {"status": "refunded"})
        self.assertEqual(response.data["count"], 0)

    def test_full_happy_path(self):
        r1 = self.client.post(reverse("admin-return-approve", args=[self.ret.pk]))
        self.assertEqual(r1.data["status"], "approved")
        r2 = self.client.post(reverse("admin-return-mark-received", args=[self.ret.pk]))
        self.assertEqual(r2.data["status"], "received")
        r3 = self.client.post(reverse("admin-return-mark-refunded", args=[self.ret.pk]))
        self.assertEqual(r3.data["status"], "refunded")

    def test_invalid_transition_is_400(self):
        response = self.client.post(reverse("admin-return-mark-received", args=[self.ret.pk]))
        self.assertEqual(response.status_code, 400)

    def test_reject(self):
        response = self.client.post(reverse("admin-return-reject", args=[self.ret.pk]))
        self.assertEqual(response.data["status"], "rejected")
