"""AUDIT-1 §12.5–§12.7 — کاتالوگ/جستجو با داده‌ی ناقص هرگز 500 نمی‌دهد.

محصول بدون واریانت، بدون تصویر، با برند حذف‌شده/غیرفعال و جستجوی بی‌نتیجه
همه باید پاسخ معتبر (حالت خالی یا ۴۰۴) بدهند — نه خطای سرور.
"""

from django.utils import timezone

from apps.catalog.models import Product

from .tests import PublicApiSeededTestCase


class CatalogNullSafetyTests(PublicApiSeededTestCase):
    def _clone(self, slug: str, name: str) -> Product:
        source = Product.objects.filter(status="ACTIVE", deleted_at__isnull=True).order_by("id").first()
        clone = Product.objects.get(pk=source.pk)
        clone.pk = None
        clone.id = None
        clone.slug = slug
        clone.name = name
        clone.save()
        return clone  # بدون واریانت و بدون تصویر

    def _get(self, url: str):
        response = self.client.get(url)
        self.assertLess(response.status_code, 500, f"{url} → {response.status_code}: {getattr(response, 'data', '')}")
        return response

    def _all_public_reads(self, product: Product):
        self._get("/api/v1/catalog/products")
        self._get(f"/api/v1/catalog/products?category={product.category.slug}")
        self._get(f"/api/v1/catalog/filters?category={product.category.slug}")
        self._get(f"/api/v1/catalog/search?q={product.name}")
        self._get(f"/api/v1/catalog/products/{product.slug}")
        self._get(f"/api/v1/catalog/categories/{product.category.slug}")
        self._get("/api/v1/content/homepage")
        self._get("/api/v1/seo/sitemap")
        self._get("/feeds/torob")

    def test_product_without_variants_or_images(self):
        product = self._clone("audit-no-variants", "Audit NoVariant Laptop")
        self._all_public_reads(product)
        detail = self._get(f"/api/v1/catalog/products/{product.slug}")
        if detail.status_code == 200:
            self.assertEqual(detail.data["data"]["variants"], [])
            self.assertEqual(detail.data["data"]["images"], [])

    def test_product_whose_brand_is_soft_deleted_or_inactive(self):
        product = self._clone("audit-dead-brand", "Audit DeadBrand Laptop")
        brand = product.brand
        brand.is_active = False
        brand.deleted_at = timezone.now()
        brand.save()
        self._all_public_reads(product)

    def test_search_edge_queries(self):
        for q in ["zzzz-no-such-thing", "   ", "%", "'\"<script>", "ای", "MSI"]:
            response = self._get(f"/api/v1/catalog/search?q={q}")
            if response.status_code == 200:
                self.assertIsInstance(response.data["data"], list)

    def test_search_empty_result_is_valid_empty_state(self):
        response = self._get("/api/v1/catalog/search?q=zzzz-no-such-thing")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"], [])
        self.assertEqual(response.data["meta"]["pagination"]["total"], 0)


class PublicMediaUrlTests(PublicApiSeededTestCase):
    """AUDIT-1 §12.7 — تصویر خالی هرگز به فروشگاه نمی‌رسد (next/image با src خالی می‌شکند)."""

    def test_normalizer(self):
        from django.test import override_settings

        from .media import public_media_url

        with override_settings(BACKEND_BASE_URL="https://api.arbyte.ir", FRONTEND_BASE_URL="https://arbyte.ir"):
            self.assertIsNone(public_media_url(None))
            self.assertIsNone(public_media_url("   "))
            self.assertEqual(public_media_url("https://api.arbyte.ir/media/p/1.webp"), "/media/p/1.webp")
            self.assertEqual(public_media_url("https://arbyte.ir/media/p/1.webp"), "/media/p/1.webp")
            self.assertEqual(public_media_url("media/p/1.webp"), "/media/p/1.webp")
            self.assertEqual(public_media_url("/media/p/1.webp"), "/media/p/1.webp")

    def test_empty_image_url_becomes_null_card_image(self):
        product = (
            Product.objects.filter(status="ACTIVE", deleted_at__isnull=True, images__isnull=False).distinct().first()
        )
        product.images.update(url="")
        detail = self._get(f"/api/v1/catalog/products/{product.slug}")
        self.assertEqual(detail.data["data"]["images"], [])
        listing = self._get(f"/api/v1/catalog/search?q={product.name}")
        card = next(c for c in listing.data["data"] if c["slug"] == product.slug)
        self.assertIsNone(card["image"])

    def _get(self, url: str):
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200, url)
        return response


class VariantlessProductIsNotPublicTests(PublicApiSeededTestCase):
    """AUDIT-1 §12.6 — محصول بدون واریانت زنده در هیچ خروجی عمومی نیست (نه ۵۰۰)."""

    def test_hidden_everywhere(self):
        product = CatalogNullSafetyTests._clone(self, "audit-hidden", "Audit Hidden Laptop")
        self.assertEqual(self.client.get(f"/api/v1/catalog/products/{product.slug}").status_code, 404)
        search = self.client.get("/api/v1/catalog/search?q=Audit Hidden")
        self.assertEqual(search.data["data"], [])
        listing = self.client.get(f"/api/v1/catalog/products?category={product.category.slug}&perPage=60")
        self.assertNotIn(product.slug, [c["slug"] for c in listing.data["data"]])
        sitemap = self.client.get("/api/v1/seo/sitemap")
        self.assertNotIn(product.slug, str(sitemap.data))
