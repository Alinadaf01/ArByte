"""D-03 — apps.public_api tests. §3's shared test-vector requirement:
variant-label / variant-selection / search-normalize vectors live in
packages/contracts/test-vectors/*.json and are run from both Vitest
(packages/contracts/src/**/*.test.ts) and here — one logic, two
implementations, one set of expected answers."""

import json
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.catalog.management.commands.seed_arbyte import FIXTURE_PATH

from .search import normalize_search_text
from .variant import build_variant_label, select_card_variant

TEST_VECTORS_DIR = Path(settings.BASE_DIR).parent.parent / "packages" / "contracts" / "test-vectors"


def _load_vector(name: str):
    path = TEST_VECTORS_DIR / name
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


class BuildVariantLabelVectorTests(TestCase):
    def test_all_vectors(self):
        vectors = _load_vector("variant-label.json")
        if vectors is None:
            self.skipTest(f"test vector not found: {TEST_VECTORS_DIR / 'variant-label.json'}")
        for vector in vectors:
            with self.subTest(vector["description"]):
                result = build_variant_label(vector["axisValues"], vector["variantAxes"])
                self.assertEqual(result, vector["expected"])


class SelectCardVariantVectorTests(TestCase):
    def test_all_vectors(self):
        vector_file = _load_vector("variant-selection.json")
        if vector_file is None:
            self.skipTest(f"test vector not found: {TEST_VECTORS_DIR / 'variant-selection.json'}")

        for case in vector_file["cases"]:
            with self.subTest(case["description"]):
                variants = case.get("variants", vector_file["variants"])
                if case.get("expectError"):
                    with self.assertRaises(ValueError):
                        select_card_variant(variants, case["defaultVariantId"], case.get("specFilters"))
                    continue

                result = select_card_variant(variants, case["defaultVariantId"], case.get("specFilters"))
                self.assertEqual(result["id"], case["expectedId"])
                if "expectedPrice" in case:
                    self.assertEqual(result["price"], case["expectedPrice"])


class NormalizeSearchTextVectorTests(TestCase):
    def test_all_vectors(self):
        vectors = _load_vector("search-normalize.json")
        if vectors is None:
            self.skipTest(f"test vector not found: {TEST_VECTORS_DIR / 'search-normalize.json'}")
        for vector in vectors:
            with self.subTest(vector["description"]):
                self.assertEqual(normalize_search_text(vector["input"]), vector["expected"])


class PublicApiSeededTestCase(TestCase):
    """D-03 §4 — every endpoint test below runs against the exact same seed
    as D-02's SeedArbyteParityTests (fixtures/arbyte-catalog.json), so
    assertions can use real slugs/prices instead of hand-built fixtures —
    the whole point of D-03's data-parity requirement."""

    @classmethod
    def setUpTestData(cls):
        if not FIXTURE_PATH.exists():
            return
        call_command("seed_arbyte")
        cls.fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

    def setUp(self):
        if not FIXTURE_PATH.exists():
            self.skipTest(f"fixture not found: {FIXTURE_PATH} — run `pnpm --filter @arbyte/api export-catalog` first")
        self.client = APIClient()


class CatalogEndpointSmokeTests(PublicApiSeededTestCase):
    """D-03 §1/§2 — every endpoint from the inventory answers with the
    Arbyte envelope; wrong-input cases hit the Arbyte error envelope."""

    def test_category_tree(self):
        response = self.client.get("/api/v1/catalog/categories")
        self.assertEqual(response.status_code, 200)
        self.assertIn("data", response.data)
        self.assertIn("requestId", response.data["meta"])
        self.assertTrue(len(response.data["data"]) > 0)

    def test_top_level_categories(self):
        response = self.client.get("/api/v1/catalog/categories/top-level")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]), len(self.fixture["categories"]))

    def test_category_detail(self):
        slug = self.fixture["categories"][0]["slug"]
        response = self.client.get(f"/api/v1/catalog/categories/{slug}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["slug"], slug)

    def test_category_detail_not_found(self):
        response = self.client.get("/api/v1/catalog/categories/does-not-exist")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["code"], "NOT_FOUND")
        self.assertIn("requestId", response.data)

    def test_product_list_default_pagination(self):
        response = self.client.get("/api/v1/catalog/products")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["meta"]["pagination"]["perPage"], 24)
        self.assertEqual(response.data["meta"]["pagination"]["total"], len(self.fixture["products"]))

    def test_product_list_invalid_per_page_is_validation_error(self):
        response = self.client.get("/api/v1/catalog/products?perPage=999")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "VALIDATION_ERROR")
        self.assertIn("perPage", response.data["fieldErrors"])

    def test_product_list_page_2(self):
        first = self.client.get("/api/v1/catalog/products?perPage=5&page=1")
        second = self.client.get("/api/v1/catalog/products?perPage=5&page=2")
        self.assertEqual(second.data["meta"]["pagination"]["page"], 2)
        first_ids = {p["id"] for p in first.data["data"]}
        second_ids = {p["id"] for p in second.data["data"]}
        self.assertEqual(first_ids & second_ids, set())

    def test_product_list_filter_by_category(self):
        slug = self.fixture["categories"][0]["slug"]
        response = self.client.get(f"/api/v1/catalog/products?category={slug}")
        self.assertEqual(response.status_code, 200)
        for card in response.data["data"]:
            self.assertEqual(card["category"]["slug"], slug)

    def test_product_list_sort_price_asc_is_ordered(self):
        response = self.client.get("/api/v1/catalog/products?sort=price_asc&perPage=60")
        prices = [card["defaultVariant"]["price"] for card in response.data["data"]]
        self.assertEqual(prices, sorted(prices))

    def test_product_detail(self):
        slug = self.fixture["products"][0]["slug"]
        response = self.client.get(f"/api/v1/catalog/products/{slug}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["slug"], slug)
        self.assertTrue(len(response.data["data"]["variants"]) >= 1)

    def test_product_detail_not_found(self):
        response = self.client.get("/api/v1/catalog/products/does-not-exist")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["code"], "NOT_FOUND")

    def test_default_variant_flagship_matches_fixture_price(self):
        flagship = next(p for p in self.fixture["products"] if p["slug"] == "msi-titan-18-hx")
        default_variant_json = next(v for v in flagship["variants"] if v["isDefault"])
        response = self.client.get("/api/v1/catalog/products/msi-titan-18-hx")
        self.assertEqual(
            response.data["data"]["variants"][
                [v["id"] for v in response.data["data"]["variants"]].index(response.data["data"]["defaultVariantId"])
            ]["price"]["final"],
            int(default_variant_json["finalPrice"]),
        )

    def test_spec_filter_overrides_default_variant_on_list(self):
        # Addendum §3 — clicking a spec filter on the list must show the
        # *matching* variant's price, not the product's true default.
        flagship = next(p for p in self.fixture["products"] if p["slug"] == "msi-titan-18-hx")
        non_default = next(v for v in flagship["variants"] if not v["isDefault"])
        ram_spec = next(s for s in non_default["specifications"] if s["definitionKey"] == "ram-gaming")
        # Resolve the Django integer id for this spec definition via the filters endpoint.
        filters = self.client.get("/api/v1/catalog/filters?category=laptop-new").data["data"]
        ram_def = next(f for f in filters["specs"] if f["name"] == "حافظه رم")
        response = self.client.get(f"/api/v1/catalog/products?spec[{ram_def['specDefId']}]={ram_spec['value']}")
        card = next(c for c in response.data["data"] if c["slug"] == "msi-titan-18-hx")
        self.assertEqual(card["defaultVariant"]["price"], int(non_default["finalPrice"]))

    def test_filters_without_category_has_no_spec_groups(self):
        response = self.client.get("/api/v1/catalog/filters")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["specs"], [])
        self.assertGreater(len(response.data["data"]["brands"]), 0)

    def test_filters_not_found_category(self):
        response = self.client.get("/api/v1/catalog/filters?category=does-not-exist")
        self.assertEqual(response.status_code, 404)

    def test_search_matches_brand_name(self):
        response = self.client.get("/api/v1/catalog/search?q=msi")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(all(c["brand"]["slug"] == "msi" for c in response.data["data"]))
        self.assertGreater(len(response.data["data"]), 0)

    def test_search_requires_q(self):
        response = self.client.get("/api/v1/catalog/search")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "VALIDATION_ERROR")

    def test_homepage_resolves_blocks(self):
        response = self.client.get("/api/v1/content/homepage")
        self.assertEqual(response.status_code, 200)
        blocks = response.data["data"]["blocks"]
        self.assertEqual(len(blocks), len(self.fixture["homepageBlocks"]))
        flagship_block = next(b for b in blocks if b["type"] == "FLAGSHIP_DUEL")
        self.assertEqual(len(flagship_block["products"]), 2)
        self.assertEqual(len(flagship_block["metrics"]), 2)
        for metric in flagship_block["metrics"]:
            self.assertTrue(metric["label"])

    def test_health(self):
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")


class PublicApiSecurityTests(PublicApiSeededTestCase):
    """D-03 §3 — equivalent of packages/contracts/src/catalog/
    product-security.test.ts, but against real serialized responses instead
    of a hand-built Zod-parse fixture: no supplier/profit/price-model field
    ever reaches a public /api/v1/ response."""

    FORBIDDEN_SUBSTRINGS = ("supplierPrice", "profitType", "profitAmountToman", "profitPercentBasisPoints", "priceModel")

    def _assert_response_clean(self, path: str):
        response = self.client.get(path)
        body = json.dumps(response.data)
        for forbidden in self.FORBIDDEN_SUBSTRINGS:
            self.assertNotIn(forbidden, body, f"{forbidden} leaked from {path}")

    def test_product_list_is_clean(self):
        self._assert_response_clean("/api/v1/catalog/products?perPage=60")

    def test_product_detail_is_clean(self):
        slug = self.fixture["products"][0]["slug"]
        self._assert_response_clean(f"/api/v1/catalog/products/{slug}")

    def test_search_is_clean(self):
        self._assert_response_clean("/api/v1/catalog/search?q=a")

    def test_homepage_is_clean(self):
        self._assert_response_clean("/api/v1/content/homepage")


class PublicApiPerformanceTests(PublicApiSeededTestCase):
    """D-03 §3 — 'بدون N+1: فهرست ۲۴ محصولی حداکثر ۵ کوئری.'"""

    def test_product_list_24_items_at_most_5_queries(self):
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get("/api/v1/catalog/products?perPage=24")
        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(ctx.captured_queries), 5, "\n".join(q["sql"] for q in ctx.captured_queries))
