"""راهنمای ایجاد صفحه معرفی محصولات به ایمالز (سند کاربر) در برابر پیاده‌سازی."""

from django.test import override_settings

from apps.catalog.models import Product, ProductVariant
from apps.public_api.tests import PublicApiSeededTestCase

URL = "/api/emalls/list"
ENVELOPE_FIELDS = {"success", "products", "total_items", "pages_count", "item_per_page", "page_num"}
REQUIRED_ITEM_FIELDS = {"title", "price", "category", "image", "is_available", "url"}


@override_settings(FRONTEND_BASE_URL="https://arbyte.ir")
class EmallsFeedTestCase(PublicApiSeededTestCase):
    def test_default_pagination_envelope(self):
        res = self.client.get(URL)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(set(body.keys()), ENVELOPE_FIELDS)
        self.assertTrue(body["success"])
        self.assertEqual(body["page_num"], 1)
        self.assertEqual(body["item_per_page"], 50)
        self.assertGreater(body["total_items"], 0)
        self.assertGreater(len(body["products"]), 0)

    def test_required_fields_present_on_every_item(self):
        res = self.client.get(URL, {"item_per_page": 20})
        for item in res.json()["products"]:
            self.assertTrue(REQUIRED_ITEM_FIELDS.issubset(item.keys()), item)
            self.assertTrue(item["url"].startswith("https://arbyte.ir/products/"))
            self.assertIsInstance(item["price"], int)
            self.assertGreater(item["price"], 0)

    def test_item_per_page_is_respected_and_clamped(self):
        res = self.client.get(URL, {"page": 1, "item_per_page": 2})
        body = res.json()
        self.assertEqual(body["item_per_page"], 2)
        self.assertLessEqual(len(body["products"]), 2)

        res = self.client.get(URL, {"item_per_page": 999999})
        self.assertEqual(res.json()["item_per_page"], 500)

    def test_page_param_moves_the_window(self):
        first = self.client.get(URL, {"page": 1, "item_per_page": 5}).json()["products"]
        second = self.client.get(URL, {"page": 2, "item_per_page": 5}).json()["products"]
        self.assertNotEqual([p["id"] for p in first], [p["id"] for p in second])

    def test_one_item_per_variant_not_per_product(self):
        product = Product.objects.filter(variants__deleted_at__isnull=True).first()
        variant_count = ProductVariant.objects.filter(product=product, deleted_at__isnull=True).count()
        if variant_count < 2:
            self.skipTest("seed has no multi-variant product to assert against")
        res = self.client.get(URL, {"item_per_page": 500})
        ids = {p["id"] for p in res.json()["products"]}
        own_variant_ids = {
            str(v)
            for v in ProductVariant.objects.filter(product=product, deleted_at__isnull=True).values_list(
                "id", flat=True
            )
        }
        self.assertTrue(own_variant_ids.issubset(ids))

    def test_unpublished_product_is_excluded(self):
        Product.objects.filter(status="ACTIVE").first().variants.first()
        hidden = Product.objects.filter(status="ACTIVE").exclude(variants=None).first()
        hidden.is_visible_on_site = False
        hidden.save(update_fields=["is_visible_on_site"])
        hidden_variant_ids = {str(v) for v in hidden.variants.filter(deleted_at__isnull=True).values_list("id", flat=True)}

        res = self.client.get(URL, {"item_per_page": 500})
        ids = {p["id"] for p in res.json()["products"]}
        self.assertFalse(hidden_variant_ids & ids)

    def test_post_method_also_works(self):
        res = self.client.post(URL, {"page": "1", "item_per_page": "3"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["item_per_page"], 3)
