import itertools
import json
from decimal import Decimal

from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.catalog.management.commands.seed_arbyte import FIXTURE_PATH
from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.content.models import HomepageBlock

# Every call needs a genuinely distinct slug/name by default — several
# tests below call the *_make_* helpers more than once in the same test
# (e.g. two products, each with their own brand), and Brand.name is fully
# unique (not soft-delete-scoped), so a fixed default would collide.
_counter = itertools.count(1)


def _make_brand(slug=None) -> Brand:
    slug = slug or f"test-brand-{next(_counter)}"
    return Brand.objects.create(name=f"Brand {slug}", slug=slug)


def _make_category(slug=None) -> Category:
    slug = slug or f"test-category-{next(_counter)}"
    return Category.objects.create(slug=slug, name=f"Category {slug}")


def _make_product(*, slug=None, brand=None, category=None) -> Product:
    slug = slug or f"test-product-{next(_counter)}"
    return Product.objects.create(
        slug=slug,
        name="Test Product",
        brand=brand or _make_brand(),
        category=category or _make_category(),
        condition="NEW",
    )


class CatalogConstraintTests(TestCase):
    """D-02 §۱ — هر قید یک تست."""

    def test_category_slug_unique_only_among_live_rows(self):
        cat = _make_category(slug="dupe")
        cat.deleted_at = __import__("django.utils.timezone", fromlist=["now"]).now()
        cat.save(update_fields=["deleted_at"])
        # A soft-deleted row must not block reusing its slug.
        _make_category(slug="dupe")

    def test_category_slug_unique_among_live_rows_rejected(self):
        _make_category(slug="live-dupe")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                _make_category(slug="live-dupe")

    def test_brand_slug_unique_only_among_live_rows(self):
        # name is fully unique on Brand (not soft-delete-scoped, per Prisma's
        # `name String @unique`) — only slug is; give the second row a
        # different name so this test isolates the slug constraint alone.
        b = _make_brand(slug="dupe-brand")
        from django.utils import timezone

        b.deleted_at = timezone.now()
        b.save(update_fields=["deleted_at"])
        Brand.objects.create(name="A Different Brand Name", slug="dupe-brand")

    def test_product_slug_unique_only_among_live_rows(self):
        p = _make_product(slug="dupe-product")
        from django.utils import timezone

        p.deleted_at = timezone.now()
        p.save(update_fields=["deleted_at"])
        _make_product(slug="dupe-product", brand=p.brand, category=p.category)

    def test_variant_sku_unique_only_among_live_rows(self):
        product = _make_product()
        v = ProductVariant.objects.create(product=product, sku="SKU-1", final_price=100000)
        from django.utils import timezone

        v.deleted_at = timezone.now()
        v.save(update_fields=["deleted_at"])
        ProductVariant.objects.create(product=product, sku="SKU-1", final_price=200000)

    def test_variant_sku_unique_among_live_rows_rejected(self):
        product = _make_product()
        ProductVariant.objects.create(product=product, sku="SKU-LIVE", final_price=100000)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ProductVariant.objects.create(product=product, sku="SKU-LIVE", final_price=200000)

    def test_only_one_default_variant_per_product(self):
        product = _make_product()
        ProductVariant.objects.create(product=product, sku="A", is_default=True, final_price=100000)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ProductVariant.objects.create(product=product, sku="B", is_default=True, final_price=200000)

    def test_two_products_can_each_have_their_own_default_variant(self):
        p1, p2 = _make_product(slug="p1"), _make_product(slug="p2")
        ProductVariant.objects.create(product=p1, sku="P1-DEFAULT", is_default=True, final_price=100000)
        ProductVariant.objects.create(product=p2, sku="P2-DEFAULT", is_default=True, final_price=100000)

    def test_profit_value_shape_neither_set_is_allowed(self):
        product = _make_product()
        ProductVariant.objects.create(product=product, sku="FIXED", final_price=100000)

    def test_profit_value_shape_amount_only_is_allowed(self):
        product = _make_product()
        ProductVariant.objects.create(
            product=product, sku="AMOUNT", final_price=100000, profit_type="AMOUNT", profit_amount_toman=50000
        )

    def test_profit_value_shape_percent_only_is_allowed(self):
        product = _make_product()
        ProductVariant.objects.create(
            product=product, sku="PERCENT", final_price=100000, profit_type="PERCENT", profit_percent_basis_points=800
        )

    def test_profit_value_shape_both_set_rejected(self):
        product = _make_product()
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ProductVariant.objects.create(
                    product=product,
                    sku="BOTH",
                    final_price=100000,
                    profit_amount_toman=50000,
                    profit_percent_basis_points=800,
                )

    def test_category_max_two_levels(self):
        top = _make_category(slug="top")
        child = Category.objects.create(slug="child", name="Child", parent=top)
        grandchild = Category(slug="grandchild", name="Grandchild", parent=child)
        with self.assertRaises(Exception):
            grandchild.full_clean()


class SeedArbyteParityTests(TestCase):
    """D-02 §۴ — تعداد دسته/محصول/واریانت/بلوک بعد از seed با JSON برابر؛
    idempotent (دو بار پشت‌سرهم، بدون تکرار)."""

    @classmethod
    def setUpTestData(cls):
        if not FIXTURE_PATH.exists():
            return
        cls.fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

    def setUp(self):
        if not FIXTURE_PATH.exists():
            self.skipTest(f"fixture not found: {FIXTURE_PATH} — run `pnpm --filter @arbyte/api export-catalog` first")

    def test_seed_counts_match_fixture(self):
        call_command("seed_arbyte")

        self.assertEqual(Brand.objects.count(), len(self.fixture["brands"]))
        self.assertEqual(Category.objects.count(), len(self.fixture["categories"]))
        self.assertEqual(Product.objects.count(), len(self.fixture["products"]))
        expected_variants = sum(len(p["variants"]) for p in self.fixture["products"])
        self.assertEqual(ProductVariant.objects.count(), expected_variants)
        self.assertEqual(HomepageBlock.objects.count(), len(self.fixture["homepageBlocks"]))

    def test_seed_is_idempotent(self):
        call_command("seed_arbyte")
        first_counts = (
            Brand.objects.count(),
            Category.objects.count(),
            Product.objects.count(),
            ProductVariant.objects.count(),
            HomepageBlock.objects.count(),
        )

        call_command("seed_arbyte")
        second_counts = (
            Brand.objects.count(),
            Category.objects.count(),
            Product.objects.count(),
            ProductVariant.objects.count(),
            HomepageBlock.objects.count(),
        )

        self.assertEqual(first_counts, second_counts)

    def test_seeded_variant_final_price_matches_fixture(self):
        call_command("seed_arbyte")
        flagship = next(p for p in self.fixture["products"] if p["slug"] == "msi-titan-18-hx")
        default_variant_json = next(v for v in flagship["variants"] if v["isDefault"])

        variant = ProductVariant.objects.get(sku=default_variant_json["sku"])
        self.assertEqual(variant.final_price, int(default_variant_json["finalPrice"]))
        self.assertEqual(Decimal(variant.final_price), Decimal(default_variant_json["finalPrice"]))
