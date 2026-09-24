from django.test import TestCase

from apps.users.models import OTPCode, User

# OtpFlowTests / AddressTests / ImpersonationFlowTests (public
# otp-request/otp-verify/address-*/impersonate-* endpoints) removed in D-01
# along with the public API layer they tested — rebuilt against the ArByte
# contract in D-04. The underlying model logic they exercised (OTPCode.issue/
# verify, ImpersonationTicket.issue/is_valid, merge_guest_cart_into_user) is
# unchanged and still lives on apps.users.models / apps.orders.services.


class AdminManualUserCreationTests(TestCase):
    """Staff must be able to create a pre-verified user directly, bypassing
    OTP entirely — for when SMS delivery fails (BACKEND-TASK.md §users).
    Posts to Django's own built-in /admin/ (contrib.admin), independent of
    the removed apps.users public views/urls above."""

    def setUp(self):
        self.staff = User.objects.create_superuser(phone="09120009999", password="staff-pass-123")
        self.client.force_login(self.staff)

    def test_staff_can_create_pre_verified_user_without_otp(self):
        response = self.client.post(
            "/admin/users/user/add/",
            {
                "phone": "09301112233",
                "password1": "a-strong-pass-123",
                "password2": "a-strong-pass-123",
                "is_verified": "on",
                "is_active": "on",
            },
        )
        self.assertEqual(response.status_code, 302)  # redirect on success
        user = User.objects.get(phone="09301112233")
        self.assertTrue(user.is_verified)
        self.assertFalse(OTPCode.objects.filter(phone="09301112233").exists())
