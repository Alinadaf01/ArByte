from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.orders.models import Order, OrderItem

from .base import AdminApiTestMixin


class AdminDashboardApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.staff = self.make_staff()
        self.client.force_authenticate(user=self.staff)
        self.product = self.make_product(stock=10, price=100000)
        customer = self.make_customer()
        self.order = Order.objects.create(user=customer, shipping_address={}, subtotal=100000, total=100000)
        OrderItem.objects.create(
            order=self.order, product=self.product, product_name=self.product.name, sku=self.product.sku,
            price=100000, quantity=1,
        )
        self.order.paid_at = timezone.now()
        self.order.status = "paid"
        self.order.save(update_fields=["paid_at", "status"])

    def test_dashboard_shape(self):
        response = self.client.get(reverse("admin-dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["today"]["sales"], 100000)
        self.assertEqual(len(response.data["trends"]["sales_chart_30d"]), 30)
        self.assertEqual(len(response.data["recent_orders"]), 1)
        self.assertEqual(len(response.data["trends"]["top_products_by_quantity"]), 1)
        self.assertEqual(response.data["trends"]["top_products_by_quantity"][0]["units_sold"], 1)
        # This order is paid (status="paid"), not yet in "processing" — one of the eight needs-action counters.
        self.assertEqual(response.data["needs_action"]["paid_pending_processing"], 1)
        self.assertIn("system_health", response.data)
        self.assertIn("site_visits", response.data)

    def test_since_last_visit_empty_before_first_visit(self):
        response = self.client.get(reverse("admin-dashboard"))
        self.assertIsNone(response.data["since_last_visit"]["last_visit_at"])
        self.assertEqual(response.data["since_last_visit"]["feed"], [])

    def test_mark_seen_updates_watermark_and_feed(self):
        response = self.client.post(reverse("admin-dashboard-mark-seen"))
        self.assertEqual(response.status_code, 200)
        self.staff.refresh_from_db()
        self.assertIsNotNone(self.staff.last_dashboard_visit)

        # A new order created after the watermark should show up in the feed.
        customer = self.make_customer(phone="09121110099")
        Order.objects.create(user=customer, shipping_address={}, subtotal=50000, total=50000)

        response = self.client.get(reverse("admin-dashboard"))
        feed_types = [item["type"] for item in response.data["since_last_visit"]["feed"]]
        self.assertIn("order", feed_types)
