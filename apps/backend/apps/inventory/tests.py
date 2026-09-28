import threading

from django.db import connection
from django.test import TestCase, TransactionTestCase

from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.inventory.models import InsufficientStockError, Inventory, InventoryTransaction


def _make_variant(*, sku="TEST-001") -> ProductVariant:
    brand, _ = Brand.objects.get_or_create(name="Test Brand", defaults={"slug": "test-brand"})
    category, _ = Category.objects.get_or_create(slug="desktop-stands", defaults={"name": "Desktop Stands"})
    product = Product.objects.create(
        slug=f"test-product-{sku.lower()}", name="Test Product", brand=brand, category=category, condition="NEW"
    )
    return ProductVariant.objects.create(product=product, sku=sku, is_default=True, final_price=100000)


class InventoryManagerTests(TestCase):
    """D-02 §۲ — replaces StockMovement.objects.record() (Product.stock_count)
    with Inventory.objects.{stock_in,stock_out,adjust,reserve,release}()
    (variant-keyed, InventoryTransaction kardex)."""

    def setUp(self):
        self.variant = _make_variant()
        self.inventory = Inventory.objects.create(variant=self.variant)

    def test_stock_in_increases_quantity_and_logs(self):
        txn = Inventory.objects.stock_in(self.variant, 10, reference="PO-1")
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 10)
        self.assertEqual(txn.type, "STOCK_IN")
        self.assertEqual(txn.quantity_change, 10)
        self.assertEqual(txn.quantity_after, 10)

    def test_stock_out_decreases_quantity(self):
        Inventory.objects.stock_in(self.variant, 10)
        txn = Inventory.objects.stock_out(self.variant, 4, reference="ARB-1")
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 6)
        self.assertEqual(txn.quantity_change, -4)

    def test_stock_out_below_zero_rejected(self):
        Inventory.objects.stock_in(self.variant, 5)
        with self.assertRaises(InsufficientStockError):
            Inventory.objects.stock_out(self.variant, 6)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 5)

    def test_adjustment_can_be_negative(self):
        Inventory.objects.stock_in(self.variant, 20)
        Inventory.objects.adjust(self.variant, -3, note="stocktake mismatch")
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 17)

    def test_quantity_after_matches_sum_of_transactions(self):
        Inventory.objects.stock_in(self.variant, 20)
        Inventory.objects.stock_out(self.variant, 5)
        Inventory.objects.stock_in(self.variant, 2)
        Inventory.objects.adjust(self.variant, -1)
        self.inventory.refresh_from_db()
        total = sum(t.quantity_change for t in InventoryTransaction.objects.filter(variant=self.variant))
        self.assertEqual(total, self.inventory.quantity)
        self.assertEqual(self.inventory.quantity, 16)

    def test_reserve_increases_reserved_quantity_not_quantity(self):
        Inventory.objects.stock_in(self.variant, 10)
        Inventory.objects.reserve(self.variant, 3, reference="cart-1")
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 10)
        self.assertEqual(self.inventory.reserved_quantity, 3)
        self.assertEqual(self.inventory.available_quantity, 7)

    def test_reserve_beyond_available_rejected(self):
        Inventory.objects.stock_in(self.variant, 5)
        Inventory.objects.reserve(self.variant, 5)
        with self.assertRaises(InsufficientStockError):
            Inventory.objects.reserve(self.variant, 1)

    def test_release_undoes_a_reservation(self):
        Inventory.objects.stock_in(self.variant, 10)
        Inventory.objects.reserve(self.variant, 4)
        Inventory.objects.release(self.variant, 4)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.reserved_quantity, 0)
        self.assertEqual(self.inventory.available_quantity, 10)

    def test_release_more_than_reserved_rejected(self):
        Inventory.objects.stock_in(self.variant, 10)
        Inventory.objects.reserve(self.variant, 2)
        with self.assertRaises(ValueError):
            Inventory.objects.release(self.variant, 3)


class InventoryReservationConcurrencyTests(TransactionTestCase):
    """D-02 §۲ — 'رزرو و کسر موجودی با select_for_update روی Inventory در
    تراکنش. یک تست همزمانی (دو رزرو همزمان روی آخرین عدد → فقط یکی موفق).'

    TransactionTestCase (not TestCase) is required here: TestCase wraps each
    test in one outer transaction, so a second thread's select_for_update()
    would see the first thread's *uncommitted* row and never actually block
    on a real lock. Each thread below opens its own real connection/
    transaction, which is what select_for_update()'s row-lock guarantee
    actually depends on."""

    def setUp(self):
        self.variant = _make_variant(sku="LAST-UNIT")
        self.inventory = Inventory.objects.create(variant=self.variant, quantity=1, reserved_quantity=0)

    def test_only_one_of_two_concurrent_reservations_on_last_unit_succeeds(self):
        results = []
        barrier = threading.Barrier(2)

        def attempt():
            try:
                barrier.wait(timeout=5)
                Inventory.objects.reserve(self.variant, 1, reference="concurrency-test")
                results.append("success")
            except InsufficientStockError:
                results.append("failed")
            finally:
                connection.close()

        threads = [threading.Thread(target=attempt) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(sorted(results), ["failed", "success"])

        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.reserved_quantity, 1)
        self.assertEqual(self.inventory.available_quantity, 0)
        # Exactly one RESERVATION transaction was logged — the failed
        # attempt raised before ever writing to InventoryTransaction.
        self.assertEqual(
            InventoryTransaction.objects.filter(variant=self.variant, type="RESERVATION").count(), 1
        )
