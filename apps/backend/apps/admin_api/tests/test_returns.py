from django.urls import reverse
from rest_framework.test import APITestCase

from apps.orders.models import Order, Return

from .base import AdminApiTestMixin


class AdminReturnApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        customer = self.make_customer()
        order = Order.objects.create(
            user=customer, shipping_recipient_name="", shipping_mobile="", shipping_province="",
            shipping_city="", shipping_address_line="", subtotal=1000, final_total=1000,
        )
        self.ret = Return.objects.create(order=order, reason="خرابی")

    def test_list_and_detail(self):
        response = self.client.get(reverse("admin-return-list"))
        self.assertEqual(response.data["count"], 1)
        response = self.client.get(reverse("admin-return-detail", args=[self.ret.pk]))
        self.assertEqual(response.data["status"], "REQUESTED")

    def test_filter_by_status(self):
        response = self.client.get(reverse("admin-return-list"), {"status": "REQUESTED"})
        self.assertEqual(response.data["count"], 1)
        response = self.client.get(reverse("admin-return-list"), {"status": "REFUNDED"})
        self.assertEqual(response.data["count"], 0)

    def test_full_happy_path(self):
        r1 = self.client.post(reverse("admin-return-approve", args=[self.ret.pk]))
        self.assertEqual(r1.data["status"], "APPROVED")
        r2 = self.client.post(reverse("admin-return-mark-received", args=[self.ret.pk]))
        self.assertEqual(r2.data["status"], "RECEIVED")
        r3 = self.client.post(reverse("admin-return-mark-refunded", args=[self.ret.pk]))
        self.assertEqual(r3.data["status"], "REFUNDED")

    def test_invalid_transition_is_400(self):
        response = self.client.post(reverse("admin-return-mark-received", args=[self.ret.pk]))
        self.assertEqual(response.status_code, 400)

    def test_reject(self):
        response = self.client.post(reverse("admin-return-reject", args=[self.ret.pk]))
        self.assertEqual(response.data["status"], "REJECTED")


class AdminReturnPerItemTests(AdminApiTestMixin, APITestCase):
    """F-04 — تأیید/رد قلم‌به‌قلم؛ فقط قلم تأییدشده STOCK_IN می‌شود."""

    def setUp(self):
        from apps.inventory.models import Inventory
        from apps.orders.models import Order, OrderItem, Return, ReturnItem

        self.client.force_authenticate(user=self.make_staff())
        a, b = self.make_product(sku="R-A", slug="r-a", stock=5), self.make_product(sku="R-B", slug="r-b", stock=5)
        self.va, self.vb = a.variants.first(), b.variants.first()
        order = Order.objects.create(
            user=self.make_customer(), shipping_recipient_name="x", shipping_mobile="09120000000", shipping_province="t",
            shipping_city="t", shipping_address_line="x", subtotal=2, final_total=2, status="DELIVERED",
        )
        ia = OrderItem.objects.create(order=order, variant=self.va, product_name_snapshot="A", sku_snapshot="R-A", unit_price=1, final_price=1)
        ib = OrderItem.objects.create(order=order, variant=self.vb, product_name_snapshot="B", sku_snapshot="R-B", unit_price=1, final_price=1)
        self.ret = Return.objects.create(order=order, reason="خراب")
        self.item_a = ReturnItem.objects.create(return_request=self.ret, order_item=ia, quantity=1)
        self.item_b = ReturnItem.objects.create(return_request=self.ret, order_item=ib, quantity=1)
        self.Inventory = Inventory

    def test_partial_approval_restocks_only_approved_items(self):
        from django.urls import reverse

        response = self.client.post(
            reverse("admin-return-approve", args=[self.ret.pk]),
            {"items": [{"id": self.item_a.pk, "approved": True}, {"id": self.item_b.pk, "approved": False}]},
            format="json",
        )
        self.assertEqual(response.data["status"], "APPROVED")
        self.assertEqual([i["decision"] for i in response.data["items"]], ["APPROVED", "REJECTED"])
        self.client.post(reverse("admin-return-mark-received", args=[self.ret.pk]))
        self.assertEqual(self.Inventory.objects.get(variant=self.va).quantity, 6)
        self.assertEqual(self.Inventory.objects.get(variant=self.vb).quantity, 5)

    def test_all_rejected_rejects_request(self):
        from django.urls import reverse

        response = self.client.post(
            reverse("admin-return-approve", args=[self.ret.pk]),
            {"items": [{"id": self.item_a.pk, "approved": False}, {"id": self.item_b.pk, "approved": False}], "admin_note": "خارج از مهلت"},
            format="json",
        )
        self.assertEqual((response.data["status"], response.data["admin_note"]), ("REJECTED", "خارج از مهلت"))
