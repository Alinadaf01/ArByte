from django.urls import reverse
from rest_framework.test import APITestCase

from apps.admin_api.models import AdminRole
from apps.users.models import Address, User

from .base import AdminApiTestMixin


class AdminUserApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_staff_created_user_can_be_verified_directly(self):
        response = self.client.post(
            reverse("admin-user-list"),
            {"phone": "09121110099", "firstName": "Sara", "isVerified": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(phone="09121110099")
        self.assertTrue(user.is_verified)

    def test_user_detail_includes_addresses_and_order_count(self):
        customer = self.make_customer(phone="09121110005")
        Address.objects.create(user=customer, province="Tehran", city="Tehran", line="...", postal_code="1234567890", receiver_name="Sara", receiver_phone="09121110005")
        response = self.client.get(reverse("admin-user-detail", args=[customer.pk]))
        self.assertEqual(len(response.data["addresses"]), 1)
        self.assertEqual(response.data["order_count"], 0)

    def test_search_filter(self):
        self.make_customer(phone="09121119999")
        response = self.client.get(reverse("admin-user-list"), {"search": "9999"})
        self.assertEqual(response.data["count"], 1)

    def test_patch_user(self):
        customer = self.make_customer(phone="09121110006")
        response = self.client.patch(reverse("admin-user-detail", args=[customer.pk]), {"firstName": "Updated"}, format="json")
        self.assertEqual(response.status_code, 200)
        customer.refresh_from_db()
        self.assertEqual(customer.first_name, "Updated")

    def test_user_addresses_endpoint(self):
        customer = self.make_customer(phone="09121110007")
        Address.objects.create(user=customer, province="Tehran", city="Tehran", line="...", postal_code="1234567890", receiver_name="Sara", receiver_phone="09121110007")
        response = self.client.get(reverse("admin-user-addresses", args=[customer.pk]))
        self.assertEqual(len(response.data), 1)


class AdminUserRoleAssignmentTests(AdminApiTestMixin, APITestCase):
    """§7.5 guardrails: role required for new staff users, self-role-change
    blocked, last مدیر کل protected from demotion."""

    def setUp(self):
        self.admin = self.make_staff()
        self.client.force_authenticate(user=self.admin)
        self.support_role = AdminRole.objects.get(group__name="پشتیبانی")

    def test_creating_staff_user_without_role_is_rejected(self):
        response = self.client.post(
            reverse("admin-user-list"), {"phone": "09121110060", "isStaff": True}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("role_id", response.data)

    def test_creating_staff_user_with_role_succeeds(self):
        response = self.client.post(
            reverse("admin-user-list"),
            {"phone": "09121110061", "isStaff": True, "roleId": self.support_role.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(phone="09121110061")
        self.assertTrue(user.groups.filter(pk=self.support_role.group_id).exists())

    def test_creating_non_staff_customer_does_not_require_role(self):
        response = self.client.post(reverse("admin-user-list"), {"phone": "09121110062"}, format="json")
        self.assertEqual(response.status_code, 201)

    def test_reassigning_another_staff_users_role_works(self):
        target = User.objects.create_user(phone="09121110063", password="x", is_staff=True, is_verified=True)
        response = self.client.patch(
            reverse("admin-user-detail", args=[target.pk]), {"roleId": self.support_role.pk}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        target.refresh_from_db()
        self.assertTrue(target.groups.filter(pk=self.support_role.group_id).exists())

    def test_cannot_change_own_role(self):
        response = self.client.patch(
            reverse("admin-user-detail", args=[self.admin.pk]), {"roleId": self.support_role.pk}, format="json"
        )
        self.assertEqual(response.status_code, 403)

    def test_cannot_demote_last_general_manager(self):
        # self.admin is the only مدیر کل in this test's data — demoting them
        # via role change must be rejected.
        other_admin = User.objects.create_user(phone="09121110064", password="x", is_staff=True, is_verified=True)
        self.client.force_authenticate(user=other_admin)
        general_manager_role = AdminRole.objects.get(group__name="مدیر کل")
        other_admin.groups.add(general_manager_role.group)

        response = self.client.patch(
            reverse("admin-user-detail", args=[self.admin.pk]), {"roleId": self.support_role.pk}, format="json"
        )
        self.assertEqual(response.status_code, 200)  # other_admin is also مدیر کل now, so this is fine

        # Now demote other_admin too — self.admin is still مدیر کل at this point? No: self.admin was just
        # demoted above, so other_admin is now the ONLY مدیر کل — demoting them must fail.
        response2 = self.client.patch(
            reverse("admin-user-detail", args=[other_admin.pk]), {"isStaff": False}, format="json"
        )
        self.assertEqual(response2.status_code, 400)

    def test_deactivating_last_general_manager_is_blocked(self):
        response = self.client.patch(reverse("admin-user-detail", args=[self.admin.pk]), {"isActive": False}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_superuser_is_exempt_from_last_manager_check(self):
        superuser = self.make_superuser()
        self.client.force_authenticate(user=superuser)
        response = self.client.patch(reverse("admin-user-detail", args=[self.admin.pk]), {"isActive": False}, format="json")
        self.assertEqual(response.status_code, 200)
