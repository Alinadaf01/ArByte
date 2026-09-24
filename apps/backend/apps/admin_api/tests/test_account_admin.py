from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.analytics.models import AdminActivityLog
from apps.users.models import ImpersonationTicket

from .base import AdminApiTestMixin


class AdminResetPasswordApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.superuser = self.make_superuser()
        self.client.force_authenticate(user=self.superuser)
        self.staff = self.make_staff(phone="09121110070")

    def test_superuser_can_reset_staff_password(self):
        response = self.client.post(reverse("admin-user-reset-password", args=[self.staff.pk]))
        self.assertEqual(response.status_code, 200)
        new_password = response.data["password"]
        self.assertTrue(len(new_password) >= 14)

        self.staff.refresh_from_db()
        self.assertTrue(self.staff.check_password(new_password))
        self.assertTrue(self.staff.must_change_password)
        self.assertTrue(AdminActivityLog.objects.filter(model_name="User", action="reset_password").exists())

    def test_password_never_appears_in_activity_log(self):
        response = self.client.post(reverse("admin-user-reset-password", args=[self.staff.pk]))
        new_password = response.data["password"]
        for entry in AdminActivityLog.objects.all():
            self.assertNotIn(new_password, str(entry.changes))

    def test_cannot_reset_password_for_customer(self):
        customer = self.make_customer(phone="09121110071")
        response = self.client.post(reverse("admin-user-reset-password", args=[customer.pk]))
        self.assertEqual(response.status_code, 400)

    def test_regular_staff_cannot_reset_passwords(self):
        regular_staff = self.make_staff(phone="09121110072")  # مدیر کل role, not superuser
        self.client.force_authenticate(user=regular_staff)
        response = self.client.post(reverse("admin-user-reset-password", args=[self.staff.pk]))
        self.assertEqual(response.status_code, 403)

    def test_non_staff_gets_403(self):
        customer = self.make_customer(phone="09121110073")
        self.client.force_authenticate(user=customer)
        response = self.client.post(reverse("admin-user-reset-password", args=[self.staff.pk]))
        self.assertEqual(response.status_code, 403)


class AdminChangePasswordApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.staff = self.make_staff()
        self.client.force_authenticate(user=self.staff)

    def test_change_password_with_correct_current_password(self):
        response = self.client.post(
            reverse("admin-change-password"),
            {"current_password": "staff-pass-123", "new_password": "BrandNewPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.staff.refresh_from_db()
        self.assertTrue(self.staff.check_password("BrandNewPass123!"))

    def test_clears_must_change_password_flag(self):
        self.staff.must_change_password = True
        self.staff.save(update_fields=["must_change_password"])
        self.client.post(
            reverse("admin-change-password"),
            {"current_password": "staff-pass-123", "new_password": "BrandNewPass123!"},
            format="json",
        )
        self.staff.refresh_from_db()
        self.assertFalse(self.staff.must_change_password)

    def test_wrong_current_password_rejected(self):
        response = self.client.post(
            reverse("admin-change-password"), {"current_password": "wrong", "new_password": "BrandNewPass123!"}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_too_short_new_password_rejected(self):
        response = self.client.post(
            reverse("admin-change-password"), {"current_password": "staff-pass-123", "new_password": "short"}, format="json"
        )
        self.assertEqual(response.status_code, 400)


class AdminImpersonateApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.superuser = self.make_superuser()
        self.client.force_authenticate(user=self.superuser)
        self.customer = self.make_customer(phone="09121110074")

    def test_superuser_can_impersonate_customer(self):
        response = self.client.post(reverse("admin-user-impersonate", args=[self.customer.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertIn("ticket", response.data)
        self.assertEqual(response.data["expiresInSeconds"], ImpersonationTicket.TICKET_LIFETIME_SECONDS)
        self.assertIn(response.data["ticket"], response.data["url"])
        ticket = ImpersonationTicket.objects.get(token=response.data["ticket"])
        self.assertEqual(ticket.target_user, self.customer)
        self.assertEqual(ticket.issued_by, self.superuser)
        # Issuing a ticket is not itself a logged support session — only
        # redeeming it (apps.users.views.ImpersonateConsumeView) is.
        self.assertFalse(AdminActivityLog.objects.filter(action="impersonate_start").exists())

    def test_cannot_impersonate_staff_user(self):
        staff = self.make_staff(phone="09121110075")
        response = self.client.post(reverse("admin-user-impersonate", args=[staff.pk]))
        self.assertEqual(response.status_code, 400)

    def test_regular_staff_cannot_impersonate(self):
        regular_staff = self.make_staff(phone="09121110076")
        self.client.force_authenticate(user=regular_staff)
        response = self.client.post(reverse("admin-user-impersonate", args=[self.customer.pk]))
        self.assertEqual(response.status_code, 403)


class AdminForceLogoutApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.superuser = self.make_superuser()
        self.client.force_authenticate(user=self.superuser)
        self.staff = self.make_staff(phone="09121110077")

    def test_force_logout_blacklists_outstanding_tokens(self):
        RefreshToken.for_user(self.staff)
        RefreshToken.for_user(self.staff)
        self.assertEqual(OutstandingToken.objects.filter(user=self.staff).count(), 2)

        response = self.client.post(reverse("admin-user-force-logout", args=[self.staff.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["tokensRevoked"], 2)
        self.assertEqual(BlacklistedToken.objects.filter(token__user=self.staff).count(), 2)

    def test_blacklisted_refresh_token_is_rejected(self):
        token = RefreshToken.for_user(self.staff)
        self.client.post(reverse("admin-user-force-logout", args=[self.staff.pk]))

        self.client.force_authenticate(user=None)
        response = self.client.post(reverse("admin-refresh"), {"refresh": str(token)}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_regular_staff_cannot_force_logout(self):
        regular_staff = self.make_staff(phone="09121110078")
        self.client.force_authenticate(user=regular_staff)
        response = self.client.post(reverse("admin-user-force-logout", args=[self.staff.pk]))
        self.assertEqual(response.status_code, 403)
