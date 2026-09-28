from django.urls import reverse
from rest_framework.test import APITestCase

from apps.inventory.models import Inventory
from apps.orders import order_status
from apps.orders.models import Order, OrderItem

from .base import AdminApiTestMixin


class AdminOrderApiTests(AdminApiTestMixin, APITestCase):
    """D-05 §۶ — با مدل ۹-وضعیتی هماهنگ شد. سفارش‌ها اینجا مستقیم با
    Order.objects.create ساخته می‌شوند (نه checkout واقعی)، پس رزرو موجودی
    دستی انجام می‌شود تا گذار به SHIPPED (که STOCK_OUT واقعی می‌کند) خراب نشود."""

    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.customer = self.make_customer()
        self.product = self.make_product(stock=10)
        self.variant = self.product.variants.first()
        Inventory.objects.reserve(self.variant, 1, reference="TEST")
        self.order = Order.objects.create(
            user=self.customer, shipping_recipient_name="مشتری تست", shipping_mobile="09120000000",
            shipping_province="تهران", shipping_city="تهران", shipping_address_line="...",
            subtotal=100000, final_total=100000,
        )
        OrderItem.objects.create(
            order=self.order, variant=self.variant, product_name_snapshot=self.product.name,
            sku_snapshot=self.variant.sku, unit_price=self.variant.final_price, quantity=1, final_price=100000,
        )

    def _advance_to_payment_review(self):
        order_status.transition_to(self.order, "AWAITING_PAYMENT")
        order_status.transition_to(self.order, "PAYMENT_REVIEW")
        self.order.refresh_from_db()

    def test_list_and_detail(self):
        response = self.client.get(reverse("admin-order-list"))
        self.assertEqual(response.data["count"], 1)
        response = self.client.get(reverse("admin-order-detail", args=[self.order.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["items"]), 1)

    def test_filter_by_status_and_search(self):
        response = self.client.get(reverse("admin-order-list"), {"status": "PENDING"})
        self.assertEqual(response.data["count"], 1)
        response = self.client.get(reverse("admin-order-list"), {"search": self.order.order_number})
        self.assertEqual(response.data["count"], 1)
        response = self.client.get(reverse("admin-order-list"), {"status": "SHIPPED"})
        self.assertEqual(response.data["count"], 0)

    def test_full_happy_path_transition(self):
        self._advance_to_payment_review()

        r1 = self.client.post(reverse("admin-order-mark-paid", args=[self.order.pk]))
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r1.data["status"], "PAID")

        r2 = self.client.post(reverse("admin-order-start-processing", args=[self.order.pk]))
        self.assertEqual(r2.data["status"], "PROCESSING")

        r2b = self.client.post(reverse("admin-order-ready-to-ship", args=[self.order.pk]))
        self.assertEqual(r2b.data["status"], "READY_TO_SHIP")

        r3 = self.client.post(
            reverse("admin-order-mark-shipped", args=[self.order.pk]), {"trackingNumber": "TRACK-1"}, format="json"
        )
        self.assertEqual(r3.status_code, 200)
        self.assertEqual(r3.data["status"], "SHIPPED")
        self.assertEqual(r3.data["shipment"]["tracking_number"], "TRACK-1")

        r4 = self.client.post(reverse("admin-order-mark-delivered", args=[self.order.pk]))
        self.assertEqual(r4.data["status"], "DELIVERED")

    def test_mark_shipped_without_tracking_number_is_rejected(self):
        self._advance_to_payment_review()
        self.client.post(reverse("admin-order-mark-paid", args=[self.order.pk]))
        self.client.post(reverse("admin-order-start-processing", args=[self.order.pk]))
        self.client.post(reverse("admin-order-ready-to-ship", args=[self.order.pk]))
        response = self.client.post(reverse("admin-order-mark-shipped", args=[self.order.pk]), {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_invalid_transition_returns_400_not_500(self):
        # PENDING -> SHIPPED مستقیم مجاز نیست
        response = self.client.post(
            reverse("admin-order-mark-shipped", args=[self.order.pk]), {"trackingNumber": "X"}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_no_endpoint_accepts_a_raw_status_field(self):
        response = self.client.patch(reverse("admin-order-detail", args=[self.order.pk]), {"status": "PAID"}, format="json")
        # detail view is read-only (RetrieveAPIView) — PATCH isn't even routed
        self.assertEqual(response.status_code, 405)

    def test_cancel_reverses_reservation_when_processing(self):
        self._advance_to_payment_review()
        self.client.post(reverse("admin-order-mark-paid", args=[self.order.pk]))
        self.client.post(reverse("admin-order-start-processing", args=[self.order.pk]))
        inventory = Inventory.objects.get(variant=self.variant)
        reserved_before_cancel = inventory.reserved_quantity

        response = self.client.post(reverse("admin-order-cancel", args=[self.order.pk]), {"reason": "customer request"}, format="json")
        self.assertEqual(response.status_code, 200)
        inventory.refresh_from_db()
        self.assertEqual(inventory.reserved_quantity, reserved_before_cancel - 1)
