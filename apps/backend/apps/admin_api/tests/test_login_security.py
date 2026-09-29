"""G-03 — قفل موقت ورود پنل و لاگ ورود."""

from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.analytics.models import AdminLoginAttempt

from .base import AdminApiTestMixin

URL = "/api/admin/auth/login/"


@override_settings(ADMIN_LOGIN_MAX_FAILURES=3, ADMIN_LOGIN_LOCK_MINUTES=15)
class AdminLoginLockoutTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        cache.clear()
        self.staff = self.make_staff(phone="09121119999")
        self.staff.set_password("Right-Pass-123")
        self.staff.save()

    def _login(self, password, phone="09121119999", ip="1.2.3.4"):
        return self.client.post(URL, {"phone": phone, "password": password}, format="json", REMOTE_ADDR=ip)

    def test_locks_after_failures_even_with_correct_password(self):
        for _ in range(3):
            self.assertEqual(self._login("wrong").status_code, 401)
        locked = self._login("Right-Pass-123")
        self.assertEqual(locked.status_code, 429)
        self.assertEqual(AdminLoginAttempt.objects.filter(reason="locked").count(), 1)
        self.assertEqual(AdminLoginAttempt.objects.filter(success=False, reason="bad_credentials").count(), 3)

    def test_success_resets_counter_and_is_logged(self):
        self._login("wrong")
        self._login("wrong")
        self.assertEqual(self._login("Right-Pass-123").status_code, 200)
        self._login("wrong")
        self._login("wrong")
        self.assertEqual(self._login("Right-Pass-123").status_code, 200)
        ok = AdminLoginAttempt.objects.filter(success=True)
        self.assertEqual(ok.count(), 2)
        self.assertEqual(ok.first().user, self.staff)
        self.assertEqual(ok.first().ip_address, "1.2.3.4")

    def test_ip_lock_covers_phone_spraying(self):
        for i in range(3):
            self._login("x", phone=f"0912000000{i}", ip="5.5.5.5")
        self.assertEqual(self._login("Right-Pass-123", ip="5.5.5.5").status_code, 429)
        self.assertEqual(self._login("Right-Pass-123", ip="6.6.6.6").status_code, 200)

    def test_login_log_endpoint(self):
        self._login("wrong")
        self.client.force_authenticate(user=self.make_superuser())
        rows = self.client.get("/api/admin/login-attempts/", {"success": "false"}).json()["results"]
        self.assertEqual(rows[0]["reason"], "bad_credentials")
