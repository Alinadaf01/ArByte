from django.urls import reverse
from rest_framework.test import APITestCase

from apps.orders.models import Order, OrderItem

from .base import AdminApiTestMixin


class AdminOrderApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.customer = self.make_customer()
        self.product = self.make_product(stock=10)
        self.order = Order.objects.create(user=self.customer, shipping_address={"city": "Tehran"}, subtotal=100000, total=100000)
        OrderItem.objects.create(
            order=self.order, product=self.product, product_name=self.product.name, sku=self.product.sku,
            price=self.product.price, quantity=1,
        )

    def test_list_and_detail(self):
        response = self.client.get(reverse("admin-order-list"))
        self.assertEqual(response.data["count"], 1)
        response = self.client.get(reverse("admin-order-detail", args=[self.order.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["items"]), 1)

    def test_filter_by_status_and_search(self):
        response = self.client.get(reverse("admin-order-list"), {"status": "pending"})
        self.assertEqual(response.data["count"], 1)
        response = self.client.get(reverse("admin-order-list"), {"search": self.order.number})
        self.assertEqual(response.data["count"], 1)
        response = self.client.get(reverse("admin-order-list"), {"status": "shipped"})
        self.assertEqual(response.data["count"], 0)

    def test_full_happy_path_transition(self):
        r1 = self.client.post(reverse("admin-order-mark-paid", args=[self.order.pk]))
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r1.data["status"], "paid")

        r2 = self.client.post(reverse("admin-order-start-processing", args=[self.order.pk]))
        self.assertEqual(r2.data["status"], "processing")

        r3 = self.client.post(reverse("admin-order-mark-shipped", args=[self.order.pk]), {"trackingCode": "TRACK-1"}, format="json")
        self.assertEqual(r3.status_code, 200)
        self.assertEqual(r3.data["status"], "shipped")
        self.assertEqual(r3.data["tracking_code"], "TRACK-1")

        r4 = self.client.post(reverse("admin-order-mark-delivered", args=[self.order.pk]))
        self.assertEqual(r4.data["status"], "delivered")

    def test_mark_shipped_without_tracking_code_is_rejected(self):
        self.client.post(reverse("admin-order-mark-paid", args=[self.order.pk]))
        self.client.post(reverse("admin-order-start-processing", args=[self.order.pk]))
        response = self.client.post(reverse("admin-order-mark-shipped", args=[self.order.pk]), {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_invalid_transition_returns_400_not_500(self):
        # pending -> shipped directly is not a legal transition
        response = self.client.post(reverse("admin-order-mark-shipped", args=[self.order.pk]), {"trackingCode": "X"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_no_endpoint_accepts_a_raw_status_field(self):
        response = self.client.patch(reverse("admin-order-detail", args=[self.order.pk]), {"status": "paid"}, format="json")
        # detail view is read-only (RetrieveAPIView) — PATCH isn't even routed
        self.assertEqual(response.status_code, 405)

    def test_cancel_reverses_stock_when_processing(self):
        self.client.post(reverse("admin-order-mark-paid", args=[self.order.pk]))
        self.client.post(reverse("admin-order-start-processing", args=[self.order.pk]))
        self.product.refresh_from_db()
        stock_after_sale = self.product.stock_count

        response = self.client.post(reverse("admin-order-cancel", args=[self.order.pk]), {"reason": "customer request"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, stock_after_sale + 1)
