"""AUDIT-6 — Torob API v3 در برابر docs/integrations/torob-api-v3.pdf."""

import json
from datetime import timedelta
from unittest import mock

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.admin_api.tests.base import AdminApiTestMixin
from apps.analytics.models import AdminActivityLog
from apps.catalog import pricing
from apps.catalog.models import Product, ProductVariant
from apps.content.models import Campaign, CampaignProduct
from apps.public_api.tests import PublicApiSeededTestCase
from apps.settings.models import ApiCredential

from . import feed
from .models import TorobFetchLog

URL = "/api/torob/v3/products"

# کلاس Product مستند (صفحه‌ی ۱۵) + seller_* که فقط برای بازارگاه‌هاست.
SPEC_FIELDS = {
    "page_unique",
    "page_url",
    "product_group_id",
    "title",
    "subtitle",
    "current_price",
    "old_price",
    "availability",
    "category_name",
    "image_links",
    "short_desc",
    "spec",
    "guarantee",
    "date_added",
    "date_updated",
}
ENVELOPE_FIELDS = {"api_version", "current_page", "total", "max_pages", "next_cursor", "products"}


def _keypair():
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_pem = (
        private.public_key()
        .public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
        .decode()
    )
    return private, public_pem


PRIVATE_KEY, PUBLIC_PEM = _keypair()
OTHER_PRIVATE_KEY, _ = _keypair()


def _token(key=PRIVATE_KEY, **claims) -> str:
    payload = {"iat": int(timezone.now().timestamp()), **claims}
    return jwt.encode(payload, key, algorithm="RS256")


@override_settings(FRONTEND_BASE_URL="https://arbyte.ir")
class TorobV3TestCase(PublicApiSeededTestCase):
    def setUp(self):
        super().setUp()
        pricing._index_cache["value"] = None
        self.credential = ApiCredential.objects.create(
            service="torob", credentials=json.dumps({"publicKey": PUBLIC_PEM}), is_active=True
        )

    def post(self, body, token: str | None = "default", raw: bytes | None = None):
        headers = {}
        if token == "default":
            token = _token()
        if token:
            headers["HTTP_X_TOROB_TOKEN"] = token
            headers["HTTP_X_TOROB_TOKEN_VERSION"] = "1"
        data = raw if raw is not None else json.dumps(body)
        return self.client.generic("POST", URL, data, content_type="application/json", **headers)

    def all_items(self) -> list[dict]:
        response = self.post({"page": 1, "sort": "date_added_desc"})
        self.assertEqual(response.status_code, 200)
        return response.json()["products"]

    def public_variant_count(self) -> int:
        return feed.page_query(feed.SORT_PRODUCT_ID).count()


class AuthTests(TorobV3TestCase):
    body = {"page": 1, "sort": "date_added_desc"}

    def assert_rejected(self, response):
        self.assertEqual(response.status_code, 401)
        self.assertIn("error", response.json())
        self.assertNotIn("products", response.json())

    def test_valid_token(self):
        self.assertEqual(self.post(self.body).status_code, 200)

    def test_missing_wrong_expired_and_confused_tokens(self):
        self.assert_rejected(self.post(self.body, token=None))
        self.assert_rejected(self.post(self.body, token=_token(OTHER_PRIVATE_KEY)))
        self.assert_rejected(self.post(self.body, token=_token(exp=int(timezone.now().timestamp()) - 3600)))
        self.assert_rejected(self.post(self.body, token="not-a-jwt"))
        # حمله‌ی سردرگمی الگوریتم: HS256 با خود کلید عمومی به‌عنوان secret.
        hs = jwt.encode({"x": 1}, "a-shared-secret-that-is-not-the-key-32b", algorithm="HS256")
        self.assert_rejected(self.post(self.body, token=hs))
        unsigned = jwt.encode({"x": 1}, None, algorithm="none")
        self.assert_rejected(self.post(self.body, token=unsigned))

    def test_disabled_or_unconfigured(self):
        self.credential.is_active = False
        self.credential.save()
        self.assert_rejected(self.post(self.body))
        self.credential.is_active = True
        self.credential.credentials = json.dumps({"publicKey": ""})
        self.credential.save()
        self.assert_rejected(self.post(self.body))

    def test_single_line_pem_from_admin_form_is_accepted(self):
        self.credential.credentials = json.dumps({"publicKey": PUBLIC_PEM.replace("\n", " ")})
        self.credential.save()
        self.assertEqual(self.post(self.body).status_code, 200)

    def test_get_is_not_allowed(self):
        self.assertEqual(self.client.get(URL).status_code, 405)

    def test_token_is_never_logged(self):
        token = _token()
        self.post(self.body, token=token)
        self.post(self.body, token=None)
        for log in TorobFetchLog.objects.all():
            self.assertNotIn(token, log.error)


class RequestValidationTests(TorobV3TestCase):
    def assert_400(self, body=None, raw=None, contains=""):
        response = self.post(body, raw=raw)
        self.assertEqual(response.status_code, 400, response.content)
        self.assertEqual(set(response.json()), {"error"})
        self.assertIn(contains, response.json()["error"])

    def test_spec_error_cases(self):
        self.assert_400(raw=b"")
        self.assert_400(raw=b"{not json")
        self.assert_400({})
        self.assert_400({"page": 1}, contains="sort parameter is not provided")  # نمونه‌ی مستند
        self.assert_400({"sort": "date_added_desc"}, contains="page")
        self.assert_400({"page": 0, "sort": "date_added_desc"})
        self.assert_400({"page": "1", "sort": "date_added_desc"})
        self.assert_400({"page": 1, "sort": "price_asc"})
        self.assert_400({"page": 1, "sort": "product_id_desc"})
        self.assert_400({"sort": "product_id_desc", "cursor": "abc"})
        self.assert_400({"page_urls": []})
        self.assert_400({"page_uniques": [1, 2]})
        self.assert_400({"page_uniques": ["1_1"], "page": 1, "sort": "date_added_desc"})


class ContractTests(TorobV3TestCase):
    def test_envelope_and_every_item_match_the_spec(self):
        response = self.post({"page": 1, "sort": "date_added_desc"})
        self.assertEqual(response["Content-Type"], "application/json")
        body = response.json()
        self.assertEqual(set(body), ENVELOPE_FIELDS)
        self.assertEqual(body["api_version"], "torob_api_v3")
        self.assertEqual(body["current_page"], 1)
        self.assertEqual(body["total"], self.public_variant_count())
        self.assertTrue(body["products"])
        for item in body["products"]:
            self.assertEqual(set(item), SPEC_FIELDS)
            self.assertEqual(feed.validate_item(item), [], item["page_unique"])
            self.assertTrue(item["page_url"].startswith("https://arbyte.ir/products/"))
            self.assertIn("?v=", item["page_url"])
            for link in item["image_links"]:
                self.assertTrue(link.startswith("https://"))

    def test_one_item_per_sellable_variant_with_storefront_values(self):
        items = {i["page_unique"]: i for i in self.all_items()}
        variant = ProductVariant.objects.filter(deleted_at__isnull=True, product__status="ACTIVE").first()
        item = items[f"{variant.product_id}_{variant.pk}"]
        final, compare_at = pricing.live_price(variant)
        self.assertEqual(item["current_price"], final)
        self.assertEqual(item["product_group_id"], str(variant.product_id))
        self.assertIn(variant.product.name, item["title"])
        self.assertEqual(item["category_name"], variant.product.category.name)
        self.assertTrue(item["subtitle"].startswith(variant.product.brand.name))
        self.assertEqual(len(items), self.public_variant_count())

    def test_campaign_price_and_old_price(self):
        variant = ProductVariant.objects.filter(deleted_at__isnull=True, product__status="ACTIVE").first()
        campaign = Campaign.objects.create(
            name="audit-6",
            start_at=timezone.now() - timedelta(hours=1),
            end_at=timezone.now() + timedelta(hours=1),
            rules={"discountType": "PERCENT", "value": 10},
        )
        CampaignProduct.objects.create(campaign=campaign, product=variant.product)
        pricing._index_cache["value"] = None
        unique = f"{variant.product_id}_{variant.pk}"
        item = self.post({"page_uniques": [unique]}).json()["products"][0]
        final, compare_at = pricing.live_price(variant)
        self.assertLess(final, variant.final_price)
        self.assertEqual(item["current_price"], final)
        self.assertEqual(item["old_price"], compare_at)

    def test_out_of_stock_keeps_an_int_price(self):
        variant = ProductVariant.objects.filter(deleted_at__isnull=True, product__status="ACTIVE").first()
        variant.inventory.quantity = variant.inventory.reserved_quantity
        variant.inventory.save()
        variant.is_preorder = False
        variant.save()
        item = self.post({"page_uniques": [f"{variant.product_id}_{variant.pk}"]}).json()["products"][0]
        self.assertFalse(item["availability"])
        self.assertIsInstance(item["current_price"], int)

    def test_condition_appears_in_title_when_not_new(self):
        variant = ProductVariant.objects.filter(deleted_at__isnull=True, product__status="ACTIVE").first()
        Product.objects.filter(pk=variant.product_id).update(condition="OPEN_BOX")
        item = self.post({"page_uniques": [f"{variant.product_id}_{variant.pk}"]}).json()["products"][0]
        self.assertIn("(", item["title"])


class ModeTests(TorobV3TestCase):
    def test_page_mode_exact_pages(self):
        total = self.public_variant_count()
        with mock.patch.object(feed, "PAGE_SIZE", 3):
            first = self.post({"page": 1, "sort": "date_added_desc"}).json()
            self.assertEqual(len(first["products"]), min(3, total))
            self.assertEqual(first["max_pages"], -(-total // 3))
            seen = []
            for page in range(1, first["max_pages"] + 1):
                seen += [
                    p["page_unique"] for p in self.post({"page": page, "sort": "date_added_desc"}).json()["products"]
                ]
            self.assertEqual(len(seen), total)
            self.assertEqual(len(set(seen)), total)
            beyond = self.post({"page": first["max_pages"] + 1, "sort": "date_added_desc"}).json()
            self.assertEqual(beyond["products"], [])

    def test_cursor_mode_walks_everything_once(self):
        total = self.public_variant_count()
        with mock.patch.object(feed, "PAGE_SIZE", 3):
            body = {"sort": "product_id_desc"}
            seen, pages = [], 0
            while True:
                data = self.post(body).json()
                pages += 1
                self.assertEqual(data["current_page"], pages)
                seen += [p["page_unique"] for p in data["products"]]
                if data["next_cursor"] is None:
                    break
                body = {"cursor": data["next_cursor"], "sort": "product_id_desc"}
        self.assertEqual(len(seen), total)
        self.assertEqual(len(set(seen)), total)
        ids = [int(u.split("_")[1]) for u in seen]
        self.assertEqual(ids, sorted(ids, reverse=True))

    def test_date_updated_desc_puts_the_changed_variant_first(self):
        variant = (
            ProductVariant.objects.filter(deleted_at__isnull=True, product__status="ACTIVE").order_by("pk").first()
        )
        variant.final_price += 1000
        variant.save()
        first = self.post({"page": 1, "sort": "date_updated_desc"}).json()["products"][0]
        self.assertEqual(first["page_unique"], f"{variant.product_id}_{variant.pk}")
        self.assertGreaterEqual(first["date_updated"], first["date_added"][:10])

    def test_lookup_by_unique_and_url(self):
        variant = ProductVariant.objects.filter(deleted_at__isnull=True, product__status="ACTIVE").first()
        unique = f"{variant.product_id}_{variant.pk}"
        by_unique = self.post({"page_uniques": [unique, "999999_999999", "garbage"]}).json()
        self.assertEqual([p["page_unique"] for p in by_unique["products"]], [unique])
        self.assertEqual((by_unique["total"], by_unique["max_pages"]), (1, 1))

        url = feed.product_url(variant.product.slug, variant.pk).replace("https://", "https://www.")
        by_url = self.post({"page_urls": [url, "https://evil.example/products/x?v=1"]}).json()
        self.assertEqual([p["page_unique"] for p in by_url["products"]], [unique])
        bare = self.post({"page_urls": [f"https://arbyte.ir/products/{variant.product.slug}"]}).json()
        self.assertEqual(len(bare["products"]), 1)

    def test_hidden_or_deleted_items_are_absent(self):
        variant = ProductVariant.objects.filter(deleted_at__isnull=True, product__status="ACTIVE").first()
        unique = f"{variant.product_id}_{variant.pk}"
        Product.objects.filter(pk=variant.product_id).update(is_visible_on_site=False)
        hidden = self.post({"page_uniques": [unique]}).json()
        self.assertEqual((hidden["products"], hidden["total"]), ([], 0))  # نمونه‌ی مستند
        self.assertNotIn(unique, [i["page_unique"] for i in self.all_items()])
        Product.objects.filter(pk=variant.product_id).update(is_visible_on_site=True)
        ProductVariant.objects.filter(pk=variant.pk).update(deleted_at=timezone.now())
        self.assertEqual(self.post({"page_uniques": [unique]}).json()["products"], [])

    def test_invalid_item_is_skipped_not_fatal(self):
        def broken(rows):
            items = original(rows)
            if items:
                items[0]["current_price"] = None
            return items

        original = feed.build_items
        with mock.patch.object(feed, "build_items", side_effect=broken):
            response = self.post({"page": 1, "sort": "date_added_desc"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["products"]), min(100, self.public_variant_count()) - 1)
        self.assertEqual(TorobFetchLog.objects.latest("created_at").invalid_count, 1)


class AdminPanelTests(AdminApiTestMixin, TorobV3TestCase):
    def test_status_never_exposes_the_key(self):
        self.post({"page": 1, "sort": "date_added_desc"})
        self.post({"page": 1})
        admin = APIClient()
        admin.force_authenticate(self.make_staff(phone="09121118801"))
        data = admin.get("/api/admin/torob/status/").data
        self.assertTrue(data["enabled"])
        self.assertTrue(data["keyConfigured"])
        self.assertEqual(len(data["keyFingerprint"]), 16)
        self.assertNotIn("BEGIN", json.dumps(data, default=str))
        self.assertEqual(data["itemCount"], self.public_variant_count())
        self.assertEqual(data["last24h"]["requests"], 2)
        self.assertEqual(data["last24h"]["errors"], 1)
        self.assertTrue(data["endpointUrl"].endswith("/api/torob/v3/products"))

    def test_validate_feed_runs_without_sending_and_is_logged(self):
        admin = APIClient()
        user = self.make_staff(phone="09121118802")
        admin.force_authenticate(user)
        data = admin.post("/api/admin/torob/validate/").data
        self.assertEqual(data["checked"], self.public_variant_count())
        self.assertEqual(data["invalid"], 0)
        self.assertTrue(AdminActivityLog.objects.filter(user=user, action="torob_validate").exists())

    def test_customer_cannot_see_panel(self):
        customer = APIClient()
        customer.force_authenticate(self.make_customer(phone="09121118803"))
        self.assertIn(customer.get("/api/admin/torob/status/").status_code, (401, 403))
