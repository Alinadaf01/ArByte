from django.urls import reverse
from rest_framework.test import APITestCase

from .base import AdminApiTestMixin


class AdminAuthTests(AdminApiTestMixin, APITestCase):
    def test_staff_can_login_with_password(self):
        self.make_staff(phone="09121110001")
        response = self.client.post(reverse("admin-login"), {"phone": "09121110001", "password": "staff-pass-123"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["access"])
        self.assertTrue(response.data["user"]["is_staff"])

    def test_non_staff_login_rejected_even_with_correct_password(self):
        from apps.users.models import User

        User.objects.create_user(phone="09121110003", password="pass-123", is_staff=False, is_verified=True)
        response = self.client.post(reverse("admin-login"), {"phone": "09121110003", "password": "pass-123"}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_wrong_password_rejected(self):
        self.make_staff(phone="09121110001")
        response = self.client.post(reverse("admin-login"), {"phone": "09121110001", "password": "wrong"}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_customer_without_password_cannot_login(self):
        # OTP-created customers never get a usable password at all.
        self.make_customer(phone="09121110004")
        response = self.client.post(reverse("admin-login"), {"phone": "09121110004", "password": ""}, format="json")
        self.assertEqual(response.status_code, 400)


class AdminPermissionGateTests(AdminApiTestMixin, APITestCase):
    """A spot-check across several unrelated endpoints — the point is that
    IsAdminStaff is the permission class everywhere, not that each endpoint
    has its own bespoke check."""

    def test_unauthenticated_request_is_denied(self):
        response = self.client.get(reverse("admin-dashboard"))
        self.assertEqual(response.status_code, 401)

    def test_authenticated_non_staff_is_denied(self):
        customer = self.make_customer()
        self.client.force_authenticate(user=customer)
        for url_name in ["admin-dashboard", "admin-product-list", "admin-order-list", "admin-user-list", "admin-activity-log"]:
            response = self.client.get(reverse(url_name))
            self.assertEqual(response.status_code, 403, f"{url_name} should 403 for non-staff")

    def test_staff_is_allowed(self):
        staff = self.make_staff()
        self.client.force_authenticate(user=staff)
        response = self.client.get(reverse("admin-dashboard"))
        self.assertEqual(response.status_code, 200)
