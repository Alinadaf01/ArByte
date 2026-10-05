"""AUDIT-5 §۱۲.۱۳–۱۲.۱۵ — واحدها، یکتایی سریال و ارسال اتمیک."""

from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.inventory.models import Inventory
from apps.orders import order_status
from apps.orders.models import Order, OrderItem, OrderItemUnit, Shipment

from .base import AdminApiTestMixin


class FulfilmentAtomicityTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.customer = self.make_customer()
        product = self.make_product(stock=10, requires_serial=True)
        self.variant = product.variants.first()
        self.order = self._order(quantity=2)

    def _order(self, quantity=1, status="PAYMENT_REVIEW"):
        Inventory.objects.reserve(self.variant, quantity, reference="TEST")
        order = Order.objects.create(
            user=self.customer, shipping_recipient_name="مشتری", shipping_mobile="09123334455",
            shipping_province="تهران", shipping_city="تهران", shipping_address_line="...",
            subtotal=100000, final_total=100000, status=status,
        )
        OrderItem.objects.create(
            order=order, variant=self.variant, product_name_snapshot="P", sku_snapshot=self.variant.sku,
            unit_price=50000, quantity=quantity, final_price=100000,
        )
        return order

    def _paid(self, order):
        order_status.transition_to(order, "PAID")
        return list(OrderItemUnit.objects.filter(order_item__order=order).order_by("pk"))

    def _serials(self, order, units):
        return self.client.post(reverse("admin-order-serials", args=[order.pk]), {"units": units}, format="json")

    def test_paid_creates_exactly_quantity_units_idempotently(self):
        units = self._paid(self.order)
        self.assertEqual(len(units), 2)
        self.assertEqual(len({u.certificate_id for u in units}), 2)
        from apps.orders.fulfilment import ensure_units

        ensure_units(self.order)
        self.assertEqual(OrderItemUnit.objects.filter(order_item__order=self.order).count(), 2)

    def test_invalid_row_saves_nothing(self):
        units = self._paid(self.order)
        response = self._serials(self.order, [{"id": units[0].pk, "serial_number": "SN-1"}, {"id": 999999, "serial_number": "X"}])
        self.assertEqual(response.status_code, 400)
        units[0].refresh_from_db()
        self.assertIsNone(units[0].serial_number)

    def test_duplicate_serial_in_same_request_or_other_order_rejected(self):
        units = self._paid(self.order)
        dup = self._serials(self.order, [{"id": units[0].pk, "serial_number": "ab-1"}, {"id": units[1].pk, "serial_number": "AB-1"}])
        self.assertEqual(dup.status_code, 400)
        self.assertEqual(self._serials(self.order, [{"id": units[0].pk, "serial_number": "SN-7"}]).status_code, 200)

        other = self._order()
        other_units = self._paid(other)
        clash = self._serials(other, [{"id": other_units[0].pk, "serial_number": "sn-7"}])
        self.assertEqual(clash.status_code, 400)
        self.assertIn("SN-7", clash.data["detail"])

    def test_database_constraint_blocks_duplicates_case_insensitively(self):
        units = self._paid(self.order)
        OrderItemUnit.objects.filter(pk=units[0].pk).update(serial_number="ZZ-9")
        with self.assertRaises(IntegrityError), transaction.atomic():
            OrderItemUnit.objects.filter(pk=units[1].pk).update(serial_number="zz-9")

    def test_rejected_ship_leaves_no_shipment(self):
        self._paid(self.order)  # PAID → SHIPPED مستقیم مجاز نیست
        for url, body in (
            (reverse("admin-order-mark-shipped", args=[self.order.pk]), {"trackingNumber": "T-1"}),
            (reverse("admin-order-transition", args=[self.order.pk]), {"to": "SHIPPED", "provider": "پست", "trackingNumber": "T-1"}),
        ):
            self.assertEqual(self.client.post(url, body, format="json").status_code, 400)
        self.assertFalse(Shipment.objects.filter(order=self.order).exists())

    def test_full_flow_serial_ship_warranty(self):
        units = self._paid(self.order)
        self.assertEqual(self._serials(self.order, [{"id": u.pk, "serial_number": f"S-{u.pk}"} for u in units]).status_code, 200)
        for to in ("PROCESSING", "READY_TO_SHIP"):
            self.assertEqual(self.client.post(reverse("admin-order-transition", args=[self.order.pk]), {"to": to}, format="json").status_code, 200)
        shipped = self.client.post(
            reverse("admin-order-transition", args=[self.order.pk]),
            {"to": "SHIPPED", "provider": "پست", "trackingNumber": "TRK-1"}, format="json",
        )
        self.assertEqual(shipped.status_code, 200, shipped.data)
        shipment = Shipment.objects.get(order=self.order)
        self.order.refresh_from_db()
        self.assertEqual((self.order.status, shipment.tracking_number), ("SHIPPED", "TRK-1"))
        self.assertIsNotNone(shipment.shipped_at)
        # بعد از ارسال، سریال قفل است.
        self.assertEqual(self._serials(self.order, [{"id": units[0].pk, "serial_number": "NEW"}]).status_code, 400)
