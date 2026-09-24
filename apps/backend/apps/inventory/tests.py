from django.test import TestCase

from apps.catalog.models import Category, Product
from apps.inventory.models import StockMovement


class StockLedgerTests(TestCase):
    def setUp(self):
        category = Category.objects.create(slug="desktop-stands", name="Desktop Stands")
        self.product = Product.objects.create(
            sku="TEST-001", slug="test-product", name="Test Product", price=100000, category=category
        )

    def test_record_increases_balance_and_stock_count(self):
        movement = StockMovement.objects.record(self.product, "purchase", 10, reference="PO-1")
        self.product.refresh_from_db()
        self.assertEqual(movement.balance_after, 10)
        self.assertEqual(self.product.stock_count, 10)

    def test_sale_decreases_balance(self):
        StockMovement.objects.record(self.product, "purchase", 10)
        movement = StockMovement.objects.record(self.product, "sale", 4, reference="ARB-1")
        self.product.refresh_from_db()
        self.assertEqual(movement.quantity, -4)
        self.assertEqual(movement.balance_after, 6)
        self.assertEqual(self.product.stock_count, 6)

    def test_balance_matches_sum_of_movements(self):
        StockMovement.objects.record(self.product, "purchase", 20)
        StockMovement.objects.record(self.product, "sale", 5)
        StockMovement.objects.record(self.product, "return_in", 2)
        StockMovement.objects.record(self.product, "scrap", 1)
        self.product.refresh_from_db()
        total = sum(m.quantity for m in self.product.stock_movements.all())
        self.assertEqual(total, self.product.stock_count)
        self.assertEqual(self.product.stock_count, 16)

    def test_negative_stock_rejected(self):
        StockMovement.objects.record(self.product, "purchase", 5)
        with self.assertRaises(ValueError):
            StockMovement.objects.record(self.product, "sale", 6)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 5)

    def test_direct_stock_count_write_is_rejected(self):
        StockMovement.objects.record(self.product, "purchase", 5)
        self.product.refresh_from_db()
        self.product.stock_count = 999
        with self.assertRaises(ValueError):
            self.product.save()
