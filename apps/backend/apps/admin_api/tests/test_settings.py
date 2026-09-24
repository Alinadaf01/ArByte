import io
import json

from django.urls import reverse
from PIL import Image
from rest_framework.test import APITestCase

from apps.analytics.models import AdminActivityLog
from apps.settings.models import ApiCredential, ShippingMethod, SiteSettings

from .base import AdminApiTestMixin


def _fake_image_file(name="logo.png"):
    buffer = io.BytesIO()
    Image.new("RGB", (10, 10), color="blue").save(buffer, format="PNG")
    buffer.seek(0)
    buffer.name = name
    return buffer


class AdminSiteSettingsApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_get_and_patch_singleton(self):
        response = self.client.get(reverse("admin-settings-site"))
        self.assertEqual(response.status_code, 200)

        response = self.client.patch(reverse("admin-settings-site"), {"email": "shop@arbyte.ir"}, format="multipart")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(SiteSettings.load().email, "shop@arbyte.ir")

    def test_patch_with_plain_json_when_no_image_files(self):
        # Regression: the view only accepted multipart/form-data, so the
        # panel's own optimization (send JSON when no image is being
        # uploaded, multipart only when one is) 415'd on every text-only
        # save — e.g. just toggling notifyOwnerNewOrder.
        response = self.client.patch(
            reverse("admin-settings-site"),
            {"email": "json-only@arbyte.ir", "notifyOwnerNewOrder": False},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        settings = SiteSettings.load()
        self.assertEqual(settings.email, "json-only@arbyte.ir")
        self.assertFalse(settings.notify_owner_new_order)

    def test_multiword_image_field_upload_is_written(self):
        # Regression: the view used plain MultiPartParser/FormParser, which
        # only underscoreizes single-word field names. A multi-word field
        # like logoLight was silently dropped instead of landing on
        # logo_light — the same bug class fixed in blog.py for coverImage.
        response = self.client.patch(
            reverse("admin-settings-site"),
            {"logoLight": _fake_image_file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        settings = SiteSettings.load()
        self.assertTrue(settings.logo_light)

    def test_uploaded_logo_and_favicon_urls_are_absolute(self):
        # FIX-TASK.md دور چهارم، باگ ۱ — این‌جا DRF's own ImageField serializer
        # field این absolutize را خودکار انجام می‌دهد (چون context دارد
        # request)، برخلاف بقیه مدل‌ها که SerializerMethodField دستی دارند؛
        # این تست همان رفتار خودکار را تأیید می‌کند تا رگرسیون نشود.
        response = self.client.patch(
            reverse("admin-settings-site"),
            {"logoLight": _fake_image_file("logo_light.png"), "favicon": _fake_image_file("favicon.png")},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["logo_light"].startswith("http"), response.data["logo_light"])
        self.assertTrue(response.data["favicon"].startswith("http"), response.data["favicon"])


class AdminApiCredentialApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_credentials_never_appear_in_create_response(self):
        response = self.client.post(
            reverse("admin-settings-credential-list"),
            {"service": "zarinpal", "label": "main", "credentials": {"merchantId": "SECRET-KEY-123"}, "isActive": False},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertNotIn("credentials", response.data)
        self.assertNotIn("SECRET-KEY-123", str(response.data))

    def test_credentials_never_appear_in_list_or_detail(self):
        cred = ApiCredential.objects.create(service="kavenegar", credentials='{"apiKey": "TOP-SECRET"}')
        list_response = self.client.get(reverse("admin-settings-credential-list"))
        self.assertNotIn("credentials", list_response.data[0])
        self.assertNotIn("TOP-SECRET", str(list_response.data))

        detail_response = self.client.get(reverse("admin-settings-credential-detail", args=[cred.pk]))
        self.assertNotIn("credentials", detail_response.data)
        self.assertNotIn("TOP-SECRET", str(detail_response.data))

    def test_credentials_never_leak_into_activity_log(self):
        self.client.post(
            reverse("admin-settings-credential-list"),
            {"service": "idpay", "credentials": {"apiKey": "LEAK-ME-NOT"}, "isActive": False},
            format="json",
        )
        for entry in AdminActivityLog.objects.all():
            self.assertNotIn("LEAK-ME-NOT", str(entry.changes))

    def test_credentials_actually_persisted_and_usable(self):
        response = self.client.post(
            reverse("admin-settings-credential-list"),
            {"service": "zarinpal", "credentials": {"merchantId": "ABC"}, "isActive": True},
            format="json",
        )
        cred = ApiCredential.objects.get(pk=response.data["id"])
        self.assertTrue(cred.has_valid_credentials())

    def test_credentials_key_names_survive_camelcase_parsing(self):
        # Regression: the global camelCase JSON parser underscoreizes nested
        # dict keys by default — {"apiKey": "x"} in the request body would
        # silently become {"api_key": "x"} on disk, which
        # kavenegar_client.py's data.get("apiKey") would never find, quietly
        # breaking every SMS send. JSON_UNDERSCOREIZE.ignore_fields must
        # exempt "credentials" from that transform.
        response = self.client.post(
            reverse("admin-settings-credential-list"),
            {"service": "kavenegar", "credentials": {"apiKey": "REAL-KEY-123"}, "isActive": True},
            format="json",
        )
        cred = ApiCredential.objects.get(pk=response.data["id"])
        stored = json.loads(cred.credentials)
        self.assertEqual(stored.get("apiKey"), "REAL-KEY-123")

    def test_delete_credential(self):
        cred = ApiCredential.objects.create(service="kavenegar", credentials='{"apiKey": "x"}')
        response = self.client.delete(reverse("admin-settings-credential-detail", args=[cred.pk]))
        self.assertEqual(response.status_code, 204)


class AdminShippingMethodApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_crud(self):
        create = self.client.post(
            reverse("admin-settings-shipping-list"), {"name": "پست پیشتاز", "cost": 50000}, format="json"
        )
        self.assertEqual(create.status_code, 201)
        method_id = create.data["id"]

        update = self.client.patch(
            reverse("admin-settings-shipping-detail", args=[method_id]), {"cost": 60000}, format="json"
        )
        self.assertEqual(update.data["cost"], 60000)

        delete = self.client.delete(reverse("admin-settings-shipping-detail", args=[method_id]))
        self.assertEqual(delete.status_code, 204)
        self.assertFalse(ShippingMethod.objects.filter(pk=method_id).exists())
