"""G-02 — ریدایرکت خودکار/دستی، داده‌ی sitemap، ثبت بازدید، فید ترب، کش HTTP و آی‌پی واقعی."""

from unittest.mock import patch

from django.core.cache import cache
from django.test import RequestFactory, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.admin_api.tests.base import AdminApiTestMixin
from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.content.models import BlogPost, Redirect
from apps.inventory.models import Inventory
from apps.public_api.client_ip import client_ip


def _product(slug="g02-p", *, stock=2, price=10_000_000, category=None, sku=None):
    brand, _ = Brand.objects.get_or_create(slug="g02-brand", defaults={"name": "G02"})
    category = category or Category.objects.get_or_create(slug="g02-cat", defaults={"name": "دسته"})[0]
    product = Product.objects.create(slug=slug, name="لپ‌تاپ آزمون", brand=brand, category=category, condition="STOCK")
    variant = ProductVariant.objects.create(
        product=product, sku=sku or f"{slug}-1", is_default=True, final_price=price
    )
    Inventory.objects.create(variant=variant)
    if stock:
        Inventory.objects.stock_in(variant, stock, reference="G02")
    return product, variant


class RedirectSignalTests(APITestCase):
    def test_slug_changes_create_301_and_collapse_chains(self):
        product, _ = _product("a1")
        product.slug = "a2"
        product.save()
        product.slug = "a3"
        product.save()
        self.assertEqual(Redirect.objects.get(from_path="/products/a1").to_path, "/products/a3")
        self.assertEqual(Redirect.objects.get(from_path="/products/a2").to_path, "/products/a3")
        product.slug = "a1"  # برگشت به slug قدیم: ریدایرکتِ از a1 نباید بماند
        product.save()
        self.assertFalse(Redirect.objects.filter(from_path="/products/a1").exists())
        self.assertFalse(Redirect.objects.filter(from_path=models_f("to_path")).exists())

    def test_category_and_blog_slug_changes(self):
        cat = Category.objects.create(slug="c-old", name="C")
        cat.slug = "c-new"
        cat.save()
        post = BlogPost.objects.create(slug="p-old", title="t", excerpt="e", category="بررسی", author="a")
        post.slug = "p-new"
        post.save()
        self.assertEqual(Redirect.objects.get(from_path="/category/c-old").to_path, "/category/c-new")
        self.assertEqual(Redirect.objects.get(from_path="/blog/p-old").to_path, "/blog/p-new")

    def test_soft_deleted_product_redirects_to_category_until_slug_reused(self):
        product, _ = _product("gone")
        product.deleted_at = timezone.now()
        product.save()
        self.assertEqual(Redirect.objects.get(from_path="/products/gone").to_path, "/category/g02-cat")
        _product("gone", sku="gone-2")
        self.assertFalse(Redirect.objects.filter(from_path="/products/gone").exists())

    def test_public_list_and_hit_counter(self):
        r = Redirect.objects.create(from_path="/old", to_path="/new")
        Redirect.objects.create(from_path="/off", to_path="/x", is_active=False)
        data = self.client.get("/api/v1/seo/redirects").json()["data"]
        self.assertEqual(data, [{"id": str(r.pk), "from": "/old", "to": "/new", "status": 301}])
        self.assertEqual(self.client.post(f"/api/v1/seo/redirects/{r.pk}/hit").status_code, 204)
        r.refresh_from_db()
        self.assertEqual(r.hits, 1)


def models_f(name):
    from django.db.models import F

    return F(name)


class AdminRedirectTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_create_normalizes_and_rejects_loops(self):
        res = self.client.post("/api/admin/redirects/", {"fromPath": "old-page/", "toPath": "/new"}, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(Redirect.objects.get().from_path, "/old-page")
        loop = self.client.post("/api/admin/redirects/", {"fromPath": "/new", "toPath": "/old-page"}, format="json")
        self.assertEqual(loop.status_code, 400)
        same = self.client.post("/api/admin/redirects/", {"fromPath": "/x", "toPath": "/x"}, format="json")
        self.assertEqual(same.status_code, 400)


class SitemapAndPageViewTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_sitemap_lists_only_public_content(self):
        _product("visible")
        hidden, _ = _product("hidden")
        hidden.status = "INACTIVE"
        hidden.save()
        BlogPost.objects.create(
            slug="pub",
            title="t",
            excerpt="e",
            category="بررسی",
            author="a",
            is_published=True,
            published_at=timezone.now(),
        )
        BlogPost.objects.create(slug="draft", title="t", excerpt="e", category="بررسی", author="a")
        data = self.client.get("/api/v1/seo/sitemap").json()["data"]
        self.assertEqual([p["slug"] for p in data["products"]], ["visible"])
        self.assertEqual([p["slug"] for p in data["posts"]], ["pub"])

    @patch("apps.public_api.seo_views.record_page_view")
    def test_pageview_hashes_visitor_and_skips_bots(self, task):
        res = self.client.post(
            "/api/v1/analytics/pageview", {"path": "/products/x?v=1"}, format="json", HTTP_USER_AGENT="Mozilla/5.0"
        )
        self.assertEqual(res.status_code, 204)
        kwargs = task.delay.call_args.kwargs
        self.assertEqual((kwargs["path"], kwargs["product_slug"]), ("/products/x", "x"))
        self.assertEqual(len(kwargs["visitor_hash"]), 64)
        self.assertNotIn("127.0.0.1", str(kwargs))
        task.reset_mock()
        self.client.post("/api/v1/analytics/pageview", {"path": "/"}, format="json", HTTP_USER_AGENT="Googlebot/2.1")
        task.delay.assert_not_called()
        self.assertEqual(
            self.client.post("/api/v1/analytics/pageview", {"path": "no-slash"}, format="json").status_code, 400
        )


class TorobFeedTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_one_item_per_variant_with_store_price_and_stock(self):
        product, v1 = _product("torob-1", stock=3, price=20_000_000)
        v2 = ProductVariant.objects.create(product=product, sku="torob-1-2", final_price=25_000_000)
        Inventory.objects.create(variant=v2)
        feed = self.client.get("/feeds/torob").json()
        by_sku = {p["page_unique"]: p for p in feed["products"]}
        self.assertEqual(set(by_sku), {"torob-1-1", "torob-1-2"})
        a, b = by_sku["torob-1-1"], by_sku["torob-1-2"]
        self.assertEqual((a["availability"], a["current_price"]), ("instock", 20_000_000))
        self.assertEqual((b["availability"], b["current_price"]), ("outofstock", 0))
        self.assertTrue(a["page_url"].endswith(f"/products/torob-1?v={v1.pk}"))
        self.assertIn("استوک", a["title"])
        self.assertEqual(a["product_group_id"], b["product_group_id"])


class HttpCacheTests(APITestCase):
    def test_etag_304_for_anonymous_public_get_and_private_otherwise(self):
        first = self.client.get("/api/v1/blog")
        self.assertIn("public", first["Cache-Control"])
        again = self.client.get("/api/v1/blog", HTTP_IF_NONE_MATCH=first["ETag"])
        self.assertEqual(again.status_code, 304)
        authed = self.client.get("/api/v1/blog", HTTP_AUTHORIZATION="Bearer x")
        self.assertIn(authed.status_code, (200, 401))
        self.assertEqual(authed["Cache-Control"], "private, no-store")


class ClientIpTests(APITestCase):
    @override_settings(BFF_SHARED_SECRET="s3cret", TRUST_X_REAL_IP=False)
    def test_bff_header_trusted_only_with_secret(self):
        rf = RequestFactory()
        good = rf.get("/", HTTP_X_CLIENT_IP="5.6.7.8", HTTP_X_BFF_SECRET="s3cret", REMOTE_ADDR="10.0.0.1")
        forged = rf.get("/", HTTP_X_CLIENT_IP="5.6.7.8", HTTP_X_BFF_SECRET="nope", REMOTE_ADDR="10.0.0.1")
        spoof_real_ip = rf.get("/", HTTP_X_REAL_IP="9.9.9.9", REMOTE_ADDR="10.0.0.1")
        self.assertEqual(client_ip(good), "5.6.7.8")
        self.assertEqual(client_ip(forged), "10.0.0.1")
        self.assertEqual(client_ip(spoof_real_ip), "10.0.0.1")
        with override_settings(TRUST_X_REAL_IP=True):
            self.assertEqual(client_ip(spoof_real_ip), "9.9.9.9")
