"""AUDIT-5 §۱۲.۱۶ — هیچ مسیر پنل برای ناشناس یا مشتری عادی باز نیست.

به‌جای فهرست دستی، همه‌ی الگوهای `apps.admin_api.urls` پیمایش می‌شوند؛ مسیر
تازه‌ای که permission نداشته باشد همین‌جا شکست می‌خورد.
"""

import re

from django.urls import URLPattern, URLResolver, get_resolver
from rest_framework.test import APITestCase

from .base import AdminApiTestMixin

# فقط ورود/تمدید توکن پنل عمداً عمومی‌اند (خودشان اعتبارسنجی می‌کنند).
PUBLIC_ADMIN_ROUTES = {"admin-login", "admin-refresh"}


def _admin_routes():
    resolver = get_resolver()
    for entry in resolver.url_patterns:
        if isinstance(entry, URLResolver) and getattr(entry.urlconf_module, "__name__", "") == "apps.admin_api.urls":
            for pattern in entry.url_patterns:
                if isinstance(pattern, URLPattern) and pattern.name not in PUBLIC_ADMIN_ROUTES:
                    route = str(pattern.pattern)
                    path = re.sub(r"<(?:int:)?[^>]+>", "1", route)
                    yield pattern.name, "/api/" + path


class AdminRoutesRequireStaffTests(AdminApiTestMixin, APITestCase):
    def test_every_admin_route_rejects_anonymous_and_customers(self):
        routes = list(_admin_routes())
        self.assertGreater(len(routes), 50)
        customer = self.make_customer()
        for actor in (None, customer):
            self.client.force_authenticate(user=actor)
            for name, path in routes:
                for method in ("get", "post", "patch", "delete"):
                    response = getattr(self.client, method)(path, {}, format="json")
                    with self.subTest(actor=str(actor), route=name, method=method):
                        self.assertIn(response.status_code, (401, 403, 405), f"{method.upper()} {path}")


class MissingObjectIs404Tests(AdminApiTestMixin, APITestCase):
    """شناسه‌ی ناموجود در مسیرهای پنل ۴۰۴ است، نه ۵۰۰ (DoesNotExist بدون handler)."""

    def test_missing_ids_return_404(self):
        self.client.force_authenticate(user=self.make_staff())
        for path, method in (
            ("/api/admin/orders/999999/transition/", "post"),
            ("/api/admin/orders/999999/serials/", "post"),
            ("/api/admin/orders/999999/mark-shipped/", "post"),
            ("/api/admin/orders/999999/invoice.pdf", "get"),
            ("/api/admin/returns/999999/", "get"),
        ):
            response = getattr(self.client, method)(path, {}, format="json")
            with self.subTest(path=path):
                self.assertEqual(response.status_code, 404, path)
