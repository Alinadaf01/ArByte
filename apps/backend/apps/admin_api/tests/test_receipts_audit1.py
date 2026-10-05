"""AUDIT-1 §11 — رسید کارت‌به‌کارت: آپلود مشتری → ذخیره → اتصال به همان
پرداخت/سفارش → ادمین مجاز فایل واقعی را می‌بیند؛ بقیه هرگز."""

from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.orders.models import Order, PaymentReceipt
from apps.public_api import tests_d05_orders
from apps.public_api.jwt_tokens import issue_tokens
from apps.users.models import User

from .base import AdminApiTestMixin

JPEG = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00" + b"\x01" * 2048
PDF = b"%PDF-1.4\n" + b"0" * 1024


class ReceiptEndToEndTests(AdminApiTestMixin, tests_d05_orders.ReceiptTests):
    def setUp(self):
        super().setUp()
        # TransactionTestCase جدول‌ها را خالی می‌کند؛ نقش‌های پیش‌فرض (data migration) دوباره ساخته می‌شوند.
        from django.apps import apps as global_apps
        from django.db import connection

        from apps.admin_api.models import AdminRole

        if not AdminRole.objects.exists():
            migration = __import__("apps.admin_api.migrations.0002_default_roles", fromlist=["create_default_roles"])
            migration.create_default_roles(global_apps, connection.schema_editor())

    def _upload_bytes(self, content: bytes, name: str, content_type: str):
        file_obj = SimpleUploadedFile(name, content, content_type=content_type)
        return self.client.post(
            f"/api/v1/orders/{self.order_number}/receipt",
            {"file": file_obj, "amount": 10_000_000},
            format="multipart",
        )

    def _admin(self, user=None) -> APIClient:
        client = APIClient()
        client.force_authenticate(user=user or self.make_staff(phone="09121119901"))
        return client

    def _receipt_from_order_detail(self, admin: APIClient) -> dict:
        order = Order.objects.get(order_number=self.order_number)
        detail = admin.get(f"/api/admin/orders/{order.pk}/")
        self.assertEqual(detail.status_code, 200, detail.data)
        receipts = [r for p in detail.data["payments"] for r in p["receipts"]]
        self.assertEqual(len(receipts), 1)
        return receipts[0]

    def test_full_access_role_is_not_forbidden(self):
        """رگرسیون: «مدیر کل» (غیر سوپریوزر) قبلاً روی رسید ۴۰۳ می‌گرفت."""
        self._upload_bytes(JPEG, "r.jpg", "image/jpeg")
        admin = self._admin()
        self.assertEqual(admin.get(self._receipt_from_order_detail(admin)["file_url"]).status_code, 200)
        self.assertEqual(admin.get("/api/admin/payments/receipts/").status_code, 200)

    def test_orders_view_only_role_can_view_but_not_approve(self):
        self._upload_bytes(JPEG, "r.jpg", "image/jpeg")
        support = User.objects.create_user(phone="09121119904", is_staff=True, is_verified=True)
        support.groups.add(Group.objects.get(name="پشتیبانی"))
        admin = self._admin(support)
        receipt = self._receipt_from_order_detail(admin)
        self.assertEqual(admin.get(receipt["file_url"]).status_code, 200)
        response = admin.patch(
            f"/api/admin/payments/receipts/{receipt['id']}/", {"decision": "APPROVE"}, format="json"
        )
        self.assertEqual(response.status_code, 403)

    def test_admin_sees_the_real_uploaded_file(self):
        self.assertEqual(self._upload_bytes(JPEG, "IMG_2024.JPG", "image/jpeg").status_code, 201)
        admin = self._admin()
        receipt = self._receipt_from_order_detail(admin)
        self.assertEqual(receipt["status"], "PENDING")

        response = admin.get(receipt["file_url"])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "image/jpeg")
        self.assertEqual(b"".join(response.streaming_content), JPEG)
        self.assertTrue(response["Content-Disposition"].startswith("inline"))
        self.assertIn("no-store", response["Cache-Control"])
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")

    def test_pdf_receipt_served_as_pdf(self):
        self.assertEqual(self._upload_bytes(PDF, "scan.pdf", "application/pdf").status_code, 201)
        admin = self._admin()
        response = admin.get(self._receipt_from_order_detail(admin)["file_url"])
        self.assertEqual(response["Content-Type"], "application/pdf")

    def test_receipt_is_linked_to_its_payment_and_order(self):
        self._upload_bytes(JPEG, "r.jpg", "image/jpeg")
        receipt = PaymentReceipt.objects.get()
        self.assertEqual(receipt.payment.order.order_number, self.order_number)
        self.assertEqual(receipt.user, self.user)

    def test_access_is_denied_to_everyone_else(self):
        self._upload_bytes(JPEG, "r.jpg", "image/jpeg")
        receipt = PaymentReceipt.objects.get()
        url = f"/api/admin/payments/receipts/{receipt.pk}/file/"

        self.assertIn(APIClient().get(url).status_code, (401, 403))  # ناشناس
        self.assertIn(self.client.get(url).status_code, (401, 403))  # خود مشتری با توکن فروشگاه
        no_section = User.objects.create_user(phone="09121119902", is_staff=True, is_verified=True)
        no_section.groups.add(Group.objects.create(name="audit-no-payments"))
        self.assertEqual(self._admin(no_section).get(url).status_code, 403)  # ادمین بدون بخش پرداخت
        # فایل هرگز از مسیر عمومی media سرو نمی‌شود.
        self.assertEqual(APIClient().get(f"/media/{receipt.file.name}").status_code, 404)

    def test_other_customer_cannot_upload_to_or_see_this_order(self):
        other = User.objects.create_user(phone="09121119903", is_verified=True)
        access, _ = issue_tokens(other)
        intruder = APIClient()
        intruder.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        file_obj = SimpleUploadedFile("r.jpg", JPEG, content_type="image/jpeg")
        response = intruder.post(
            f"/api/v1/orders/{self.order_number}/receipt", {"file": file_obj, "amount": 1}, format="multipart"
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(intruder.get(f"/api/v1/orders/{self.order_number}").status_code, 404)
        self.assertFalse(PaymentReceipt.objects.exists())

    def test_admin_can_approve_after_viewing(self):
        self._upload_bytes(JPEG, "r.jpg", "image/jpeg")
        admin = self._admin()
        receipt = self._receipt_from_order_detail(admin)
        response = admin.patch(
            f"/api/admin/payments/receipts/{receipt['id']}/", {"decision": "APPROVE"}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(Order.objects.get(order_number=self.order_number).status, "PAID")
