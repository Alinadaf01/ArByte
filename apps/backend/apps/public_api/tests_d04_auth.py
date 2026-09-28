"""D-04 §۱/§۵ — OTP، refresh/blacklist، جعل‌هویت + عملیات ممنوع."""

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from apps.users.models import ImpersonationTicket, OTPCode, User


def _last_otp_for(phone: str) -> OTPCode:
    return OTPCode.objects.filter(phone=phone).order_by("-created_at").first()


class OtpRequestTests(TestCase):
    def setUp(self):
        # DRF's throttle cache (LocMemCache) isn't part of the DB
        # transaction Django rolls back between tests — without clearing it,
        # the otp_request ScopedRateThrottle (10/hour, IP-keyed) accumulates
        # across every test in the whole run and starts 429ing unrelated tests.
        cache.clear()
        self.client = APIClient()

    def test_request_returns_expires_in_seconds(self):
        response = self.client.post("/api/v1/auth/otp/request", {"mobile": "09121110001"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertAlmostEqual(response.data["data"]["expiresInSeconds"], 300, delta=2)
        self.assertTrue(OTPCode.objects.filter(phone="09121110001").exists())

    def test_invalid_mobile_is_validation_error(self):
        response = self.client.post("/api/v1/auth/otp/request", {"mobile": "0912"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "VALIDATION_ERROR")

    def test_persian_digit_mobile_is_normalized(self):
        response = self.client.post("/api/v1/auth/otp/request", {"mobile": "۰۹۱۲۱۱۱۰۰۰۲"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(OTPCode.objects.filter(phone="09121110002").exists())

    def test_per_mobile_rate_limit(self):
        mobile = "09121110003"
        for _ in range(3):
            response = self.client.post("/api/v1/auth/otp/request", {"mobile": mobile}, format="json")
            self.assertEqual(response.status_code, 200)
        fourth = self.client.post("/api/v1/auth/otp/request", {"mobile": mobile}, format="json")
        self.assertEqual(fourth.status_code, 429)
        self.assertEqual(fourth.data["code"], "RATE_LIMITED")


class OtpVerifyTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.mobile = "09122220001"
        self.client.post("/api/v1/auth/otp/request", {"mobile": self.mobile}, format="json")
        # OTP_DEV_MODE — همان الگوریتم otp.py اما بدون parse کردن لاگ: کد را
        # مستقیم از دیتابیس با هش reverse نمی‌شود خواند، پس یک OTP تازه با
        # کد شناخته‌شده مستقیم می‌سازیم (هم‌ارزِ چیزی که واقعاً /otp/request ساخت).
        otp = _last_otp_for(self.mobile)
        otp.code_hash = self._hash("1234")
        otp.save(update_fields=["code_hash"])

    @staticmethod
    def _hash(raw_code: str) -> str:
        from django.contrib.auth.hashers import make_password

        return make_password(raw_code)

    def test_correct_code_creates_user_and_returns_tokens(self):
        response = self.client.post(
            "/api/v1/auth/otp/verify", {"mobile": self.mobile, "code": "1234"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.data["data"]
        self.assertTrue(data["accessToken"])
        self.assertTrue(data["refreshToken"])
        self.assertEqual(data["user"]["mobile"], self.mobile)
        self.assertTrue(User.objects.filter(phone=self.mobile, is_verified=True).exists())

    def test_wrong_code_is_otp_invalid(self):
        response = self.client.post(
            "/api/v1/auth/otp/verify", {"mobile": self.mobile, "code": "0000"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "OTP_INVALID")

    def test_expired_code_is_otp_expired(self):
        otp = _last_otp_for(self.mobile)
        otp.expires_at = timezone.now() - timezone.timedelta(seconds=1)
        otp.save(update_fields=["expires_at"])
        response = self.client.post(
            "/api/v1/auth/otp/verify", {"mobile": self.mobile, "code": "1234"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "OTP_EXPIRED")

    def test_max_attempts_locks_the_code(self):
        for _ in range(OTPCode.MAX_ATTEMPTS):
            self.client.post("/api/v1/auth/otp/verify", {"mobile": self.mobile, "code": "0000"}, format="json")
        response = self.client.post(
            "/api/v1/auth/otp/verify", {"mobile": self.mobile, "code": "1234"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "OTP_MAX_ATTEMPTS")

    def test_existing_user_is_reused_not_duplicated(self):
        self.client.post("/api/v1/auth/otp/verify", {"mobile": self.mobile, "code": "1234"}, format="json")
        self.assertEqual(User.objects.filter(phone=self.mobile).count(), 1)


class RefreshLogoutTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(phone="09122220002", is_verified=True)
        from apps.public_api.jwt_tokens import issue_tokens

        self.access_token, self.refresh_token = issue_tokens(self.user)

    def test_refresh_rotates_and_blacklists_old_token(self):
        response = self.client.post(
            "/api/v1/auth/refresh", {"refreshToken": self.refresh_token}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        new_refresh = response.data["data"]["refreshToken"]
        self.assertNotEqual(new_refresh, self.refresh_token)

        reuse = self.client.post("/api/v1/auth/refresh", {"refreshToken": self.refresh_token}, format="json")
        self.assertEqual(reuse.status_code, 401)

    def test_refresh_invalid_token_is_unauthorized(self):
        response = self.client.post("/api/v1/auth/refresh", {"refreshToken": "garbage"}, format="json")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["code"], "UNAUTHORIZED")

    def test_logout_blacklists_all_outstanding_tokens(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.post("/api/v1/auth/logout")
        self.assertEqual(response.status_code, 200)
        outstanding = OutstandingToken.objects.filter(user=self.user)
        self.assertTrue(outstanding.exists())
        for token in outstanding:
            self.assertTrue(BlacklistedToken.objects.filter(token=token).exists())


class MeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(phone="09122220003", first_name="علی", is_verified=True)
        from apps.public_api.jwt_tokens import issue_tokens

        self.access_token, _ = issue_tokens(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

    def test_me_returns_profile_without_impersonation(self):
        response = self.client.get("/api/v1/auth/me")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["firstName"], "علی")
        self.assertNotIn("impersonation", response.data["data"])

    def test_me_requires_auth(self):
        client = APIClient()
        response = client.get("/api/v1/auth/me")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["code"], "UNAUTHORIZED")


class ImpersonateExchangeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(phone="09100000001", is_staff=True, first_name="مدیر")
        self.customer = User.objects.create_user(phone="09122220004", is_verified=True)

    def test_valid_ticket_exchanges_for_scoped_session(self):
        ticket = ImpersonationTicket.issue(target_user=self.customer, issued_by=self.admin)
        response = self.client.post("/api/v1/auth/impersonate/exchange", {"ticket": ticket.token}, format="json")
        self.assertEqual(response.status_code, 200)
        data = response.data["data"]
        self.assertEqual(data["user"]["mobile"], self.customer.phone)
        self.assertIn("impersonation", data)
        self.assertEqual(data["impersonation"]["by"], "مدیر")
        self.assertNotIn("refreshToken", data)

        ticket.refresh_from_db()
        self.assertIsNotNone(ticket.used_at)

    def test_used_ticket_is_rejected(self):
        ticket = ImpersonationTicket.issue(target_user=self.customer, issued_by=self.admin)
        self.client.post("/api/v1/auth/impersonate/exchange", {"ticket": ticket.token}, format="json")
        again = self.client.post("/api/v1/auth/impersonate/exchange", {"ticket": ticket.token}, format="json")
        self.assertEqual(again.status_code, 400)
        self.assertEqual(again.data["code"], "IMPERSONATION_TICKET_USED")

    def test_expired_ticket_is_rejected(self):
        ticket = ImpersonationTicket.issue(target_user=self.customer, issued_by=self.admin)
        ticket.expires_at = timezone.now() - timezone.timedelta(seconds=1)
        ticket.save(update_fields=["expires_at"])
        response = self.client.post("/api/v1/auth/impersonate/exchange", {"ticket": ticket.token}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "IMPERSONATION_TICKET_EXPIRED")

    def test_unknown_ticket_is_rejected(self):
        response = self.client.post(
            "/api/v1/auth/impersonate/exchange", {"ticket": "does-not-exist"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "IMPERSONATION_TICKET_INVALID")

    def test_me_reports_impersonation_context(self):
        ticket = ImpersonationTicket.issue(target_user=self.customer, issued_by=self.admin)
        exchange = self.client.post("/api/v1/auth/impersonate/exchange", {"ticket": ticket.token}, format="json")
        access_token = exchange.data["data"]["accessToken"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = self.client.get("/api/v1/auth/me")
        self.assertIn("impersonation", response.data["data"])

    def test_blocked_action_rejected_during_impersonation(self):
        ticket = ImpersonationTicket.issue(target_user=self.customer, issued_by=self.admin)
        exchange = self.client.post("/api/v1/auth/impersonate/exchange", {"ticket": ticket.token}, format="json")
        access_token = exchange.data["data"]["accessToken"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # account.profile.update — IMPERSONATION_BLOCKED_ACTIONS (auth/index.ts)
        response = self.client.patch("/api/v1/account/profile", {"firstName": "دستکاری"}, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["code"], "IMPERSONATION_FORBIDDEN_ACTION")

        # خواندن همیشه آزاد است.
        read_response = self.client.get("/api/v1/account/profile")
        self.assertEqual(read_response.status_code, 200)
