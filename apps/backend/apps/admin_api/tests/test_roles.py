from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.admin_api.models import AdminRole
from apps.analytics.models import AdminActivityLog

from .base import AdminApiTestMixin


class AdminRoleApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.superuser = self.make_superuser()
        self.client.force_authenticate(user=self.superuser)

    def test_list_returns_five_default_roles(self):
        response = self.client.get(reverse("admin-role-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 5)
        names = {row["name"] for row in response.data}
        self.assertIn("مدیر کل", names)
        self.assertIn("حسابدار", names)
        general_manager = next(r for r in response.data if r["name"] == "مدیر کل")
        self.assertTrue(general_manager["is_system"])
        self.assertEqual(sorted(general_manager["grants"]["products"]), ["create", "delete", "edit", "view"])
        accountant = next(r for r in response.data if r["name"] == "حسابدار")
        self.assertEqual(accountant["grants"], {"reports": ["view"]})

    def test_sections_catalog(self):
        response = self.client.get(reverse("admin-role-sections"))
        self.assertEqual(response.status_code, 200)
        keys = {row["key"] for row in response.data}
        self.assertIn("credentials", keys)
        credentials_row = next(r for r in response.data if r["key"] == "credentials")
        self.assertTrue(credentials_row["sensitive"])
        self.assertEqual(sorted(credentials_row["actions"]), ["create", "delete", "edit", "view"])

    def test_create_role_with_scoped_grants(self):
        response = self.client.post(
            reverse("admin-role-list"),
            {"name": "نقش تست", "description": "برای تست", "grants": {"blog": ["view", "edit"]}},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.data["is_system"])
        self.assertEqual(response.data["grants"], {"blog": ["edit", "view"]})
        self.assertTrue(Group.objects.filter(name="نقش تست").exists())

    def test_create_role_rejects_duplicate_name(self):
        response = self.client.post(reverse("admin-role-list"), {"name": "مدیر کل", "grants": {}}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_create_role_rejects_unknown_section(self):
        response = self.client.post(
            reverse("admin-role-list"), {"name": "بد", "grants": {"nonexistent": ["view"]}}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_update_role_grants_and_logs_activity(self):
        create = self.client.post(reverse("admin-role-list"), {"name": "نقش ۲", "grants": {}}, format="json")
        role_id = create.data["id"]

        response = self.client.patch(
            reverse("admin-role-detail", args=[role_id]), {"grants": {"orders": ["view", "edit"]}}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["grants"], {"orders": ["edit", "view"]})
        self.assertTrue(AdminActivityLog.objects.filter(model_name="AdminRole", action="update").exists())

    def test_cannot_delete_system_role(self):
        general_manager = AdminRole.objects.get(group__name="مدیر کل")
        response = self.client.delete(reverse("admin-role-detail", args=[general_manager.pk]))
        self.assertEqual(response.status_code, 400)
        self.assertTrue(AdminRole.objects.filter(pk=general_manager.pk).exists())

    def test_can_delete_custom_role(self):
        create = self.client.post(reverse("admin-role-list"), {"name": "نقش موقت", "grants": {}}, format="json")
        role_id = create.data["id"]
        response = self.client.delete(reverse("admin-role-detail", args=[role_id]))
        self.assertEqual(response.status_code, 204)
        self.assertFalse(AdminRole.objects.filter(pk=role_id).exists())

    def test_cannot_edit_own_role(self):
        staff = self.make_staff(phone="09121110050")  # مدیر کل, per make_staff()
        self.client.force_authenticate(user=staff)
        general_manager = AdminRole.objects.get(group__name="مدیر کل")
        response = self.client.patch(
            reverse("admin-role-detail", args=[general_manager.pk]), {"grants": {"roles": ["view", "edit"]}}, format="json"
        )
        self.assertEqual(response.status_code, 403)

    def test_superuser_can_edit_role_they_hold(self):
        # Superusers bypass every check, including self-role-edit, since a
        # Group grant can't self-escalate someone who already bypasses everything.
        role = AdminRole.objects.get(group__name="حسابدار")
        self.superuser.groups.add(role.group)
        response = self.client.patch(reverse("admin-role-detail", args=[role.pk]), {"description": "تغییر"}, format="json")
        self.assertEqual(response.status_code, 200)

    def test_non_staff_denied(self):
        customer = self.make_customer()
        self.client.force_authenticate(user=customer)
        response = self.client.get(reverse("admin-role-list"))
        self.assertEqual(response.status_code, 403)

    def test_staff_without_roles_permission_denied(self):
        # A staff user in a role that doesn't grant "roles" (e.g. مدیر محصول)
        # must not see the roles list at all.
        product_manager_role = AdminRole.objects.get(group__name="مدیر محصول")
        from apps.users.models import User

        staff = User.objects.create_user(phone="09121110051", password="x", is_staff=True, is_verified=True)
        staff.groups.add(product_manager_role.group)
        self.client.force_authenticate(user=staff)
        response = self.client.get(reverse("admin-role-list"))
        self.assertEqual(response.status_code, 403)


class AdminMyPermissionsApiTests(AdminApiTestMixin, APITestCase):
    def test_superuser_gets_all_sections(self):
        superuser = self.make_superuser()
        self.client.force_authenticate(user=superuser)
        response = self.client.get(reverse("admin-my-permissions"))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["isSuperuser"])
        self.assertIn("credentials", response.data["grants"])

    def test_scoped_role_gets_only_its_grants(self):
        from apps.users.models import User

        accountant_role = AdminRole.objects.get(group__name="حسابدار")
        staff = User.objects.create_user(phone="09121110052", password="x", is_staff=True, is_verified=True)
        staff.groups.add(accountant_role.group)
        self.client.force_authenticate(user=staff)

        response = self.client.get(reverse("admin-my-permissions"))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["isSuperuser"])
        self.assertEqual(response.data["grants"], {"reports": ["view"]})

    def test_anonymous_denied(self):
        response = self.client.get(reverse("admin-my-permissions"))
        self.assertEqual(response.status_code, 401)
