"""AUDIT-5 §۱۲.۴ / §۱۲.۱۰ — مشخصات کلیدی صریح و صفحه‌بندی در دیتابیس."""

from datetime import timedelta

from django.utils import timezone

from apps.catalog.models import Product, ProductSpecification, ProductVariant, SpecificationDefinition
from apps.catalog.pricing import live_price, live_price_expression, reset_campaign_cache
from apps.content.models import Campaign, CampaignProduct

from .search import normalize_search_text, normalized_search_text
from .tests import PublicApiSeededTestCase


def _active_products():
    return Product.objects.filter(status="ACTIVE", deleted_at__isnull=True, is_visible_on_site=True)


class KeySpecsTests(PublicApiSeededTestCase):
    def _detail(self, slug):
        response = self.client.get(f"/api/v1/catalog/products/{slug}")
        self.assertEqual(response.status_code, 200)
        return response.data["data"]

    def test_default_order_is_processor_gpu_ram(self):
        ranked = dict(SpecificationDefinition.objects.filter(key_spec_order__isnull=False).values_list("key", "key_spec_order"))
        self.assertTrue(ranked)
        for key, order in ranked.items():
            self.assertEqual(order, {"cpu": 1, "gpu": 2, "ram": 3}[key.split("-")[0]])

    def test_each_variant_has_its_own_ordered_key_specs(self):
        product = (
            _active_products()
            .filter(variants__specifications__definition__key_spec_order__isnull=False)
            .distinct()
            .first()
        )
        detail = self._detail(product.slug)
        names_order = {d.name_fa: d.key_spec_order for d in SpecificationDefinition.objects.exclude(key_spec_order=None)}
        for variant in detail["variants"]:
            orders = [names_order[item["name"]] for item in variant["keySpecs"]]
            self.assertEqual(orders, sorted(orders))
            row = ProductVariant.objects.get(pk=variant["id"])
            for spec in row.specifications.filter(definition__key_spec_order__isnull=False).select_related("value"):
                self.assertIn(spec.value.value, [item["value"] for item in variant["keySpecs"]])

    def test_unranked_definition_is_never_a_key_spec_and_full_specs_stay(self):
        product = _active_products().filter(specifications__isnull=False).first()
        before = self._detail(product.slug)
        SpecificationDefinition.objects.update(key_spec_order=None)
        after = self._detail(product.slug)
        self.assertTrue(all(v["keySpecs"] == [] for v in after["variants"]))
        self.assertEqual(before["specifications"], after["specifications"])

    def test_admin_reorder_changes_output(self):
        product = _active_products().filter(specifications__definition__key_spec_order=1).first()
        cpu = SpecificationDefinition.objects.filter(key_spec_order=1, product_specifications__product=product).first()
        cpu.key_spec_order = 9
        cpu.save()
        detail = self._detail(product.slug)
        self.assertEqual(detail["variants"][0]["keySpecs"][-1]["name"], cpu.name_fa)

    def test_card_uses_chosen_variant_specs(self):
        listing = self.client.get("/api/v1/catalog/products?perPage=48").data["data"]
        self.assertTrue(any(card["keySpecs"] for card in listing))
        for card in listing:
            self.assertLessEqual(len(card["keySpecs"]), 4)


class LivePriceExpressionParityTests(PublicApiSeededTestCase):
    def tearDown(self):
        reset_campaign_cache()

    def _campaign(self, priority, rules, **target):
        now = timezone.now()
        campaign = Campaign.objects.create(
            name=f"c{priority}", start_at=now - timedelta(days=1), end_at=now + timedelta(days=1), priority=priority, rules=rules
        )
        CampaignProduct.objects.create(campaign=campaign, **target)
        return campaign

    def _assert_parity(self):
        reset_campaign_cache()
        rows = ProductVariant.objects.select_related("product__category").annotate(live=live_price_expression())
        for variant in rows:
            self.assertEqual(variant.live, live_price(variant)[0], variant.sku)

    def test_no_campaign(self):
        self._assert_parity()

    def test_percent_amount_and_priority_between_product_category_parent(self):
        product = _active_products().filter(category__parent__isnull=False).first() or _active_products().first()
        category = product.category
        self._campaign(1, {"discountType": "PERCENT", "value": 13}, category=category)
        self._campaign(5, {"discountType": "AMOUNT", "value": 2_500_000}, product=product)
        if category.parent_id:
            self._campaign(3, {"discountType": "PERCENT", "value": 40}, category_id=category.parent_id)
        self._campaign(2, {"discountType": "AMOUNT", "value": 10**12}, product=_active_products().exclude(pk=product.pk).first())
        self._assert_parity()


class DatabasePaginationTests(PublicApiSeededTestCase):
    def _list(self, query=""):
        response = self.client.get(f"/api/v1/catalog/products?{query}")
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def test_pages_are_disjoint_and_total_is_exact(self):
        full = self._list("perPage=48")
        total = full["meta"]["pagination"]["total"]
        seen = []
        for page in range(1, total // 2 + 2):
            seen += [card["slug"] for card in self._list(f"perPage=2&page={page}")["data"]]
        self.assertEqual(seen, [card["slug"] for card in full["data"]])
        self.assertEqual(self._list(f"perPage=2&page={total + 5}")["meta"]["pagination"]["total"], total)

    def test_price_sort_and_bounds_use_card_price(self):
        asc = [c["defaultVariant"]["price"] for c in self._list("perPage=48&sort=price_asc")["data"]]
        self.assertEqual(asc, sorted(asc))
        desc = [c["defaultVariant"]["price"] for c in self._list("perPage=48&sort=price_desc")["data"]]
        self.assertEqual(desc, sorted(desc, reverse=True))
        middle = sorted(asc)[len(asc) // 2]
        bounded = self._list(f"perPage=48&minPrice={middle}")
        self.assertTrue(0 < bounded["meta"]["pagination"]["total"] <= len(asc))

    def test_query_count_does_not_grow_with_catalog(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        with CaptureQueriesContext(connection) as ctx:
            self._list("perPage=2")
        self.assertLessEqual(len(ctx), 5)


class SqlSearchNormalizationTests(PublicApiSeededTestCase):
    def test_sql_matches_python_normalization(self):
        samples = ["Ali ي ك ۱۲٣ ـ‌ x", "  ASUS\tROG Zephyrus ", "مَک‌بوک پرو"]
        for text in samples:
            product = _active_products().first()
            Product.objects.filter(pk=product.pk).update(name=text)
            value = Product.objects.annotate(n=normalized_search_text("name")).get(pk=product.pk).n
            self.assertEqual(value, normalize_search_text(text), text)

    def test_search_paginates_in_db(self):
        response = self.client.get("/api/v1/catalog/search?q=a&perPage=1")
        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(response.data["data"]), 1)
        everything = self.client.get("/api/v1/catalog/search?q=a&perPage=48").data
        self.assertEqual(response.data["meta"]["pagination"]["total"], everything["meta"]["pagination"]["total"])


class ProductSpecificationSanity(PublicApiSeededTestCase):
    def test_variant_ram_lives_on_variants(self):
        self.assertTrue(
            ProductSpecification.objects.filter(variant__isnull=False, definition__key_spec_order=3).exists()
        )


class HomepageDataTests(PublicApiSeededTestCase):
    def test_flagship_metric_reads_variant_level_spec(self):
        from django.db.models import Count

        from apps.content.models import HomepageBlock
        from apps.public_api.services import get_homepage

        ram = (
            SpecificationDefinition.objects.filter(key_spec_order=3)
            .annotate(n=Count("product_specifications__variant__product", distinct=True))
            .order_by("-n")
            .first()
        )
        products = list(
            _active_products().filter(variants__specifications__definition=ram).distinct().values_list("slug", flat=True)[:2]
        )
        products = (products * 2)[:2]  # یک محصول هم کافی است: هر دو طرف از سطح واریانت می‌خوانند
        HomepageBlock.objects.filter(type="FLAGSHIP_DUEL").update(is_active=False)
        HomepageBlock.objects.create(
            type="FLAGSHIP_DUEL", sort_order=99, is_active=True, config={"productSlugs": products, "metrics": [str(ram.pk)]}
        )
        duel = next(b for b in get_homepage()["blocks"] if b["type"] == "FLAGSHIP_DUEL")
        self.assertTrue(all(duel["metrics"][0]["values"]), duel["metrics"])

    def test_check_homepage_data_command_is_read_only(self):
        from io import StringIO

        from django.core.management import call_command

        from apps.content.models import HomepageBlock

        before = list(HomepageBlock.objects.values())
        out = StringIO()
        call_command("check_homepage_data", stdout=out)
        self.assertIn("PRODUCT_RAIL", out.getvalue())
        self.assertEqual(before, list(HomepageBlock.objects.values()))
