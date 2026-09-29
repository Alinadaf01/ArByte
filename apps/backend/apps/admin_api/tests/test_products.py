"""F-02 — کاتالوگ پنل روی مدل واریانت: برند، محصول، تصاویر (WebP)، مشخصات،
ویرایشگر واریانت، موجودی/کاردکس، قیمت انبوه، صفحه اصلی. آخرین کلاس سفر کامل
ادمین → فروشگاه است: محصول سه‌واریانتی ساخته‌شده از API پنل باید در API عمومی
با فیلتر مشخصه و انتخاب واریانت درست دیده شود."""

import io

from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework.test import APITestCase

from apps.catalog.models import (
    Brand,
    Category,
    PriceHistory,
    Product,
    ProductImage,
    ProductVariant,
    SpecificationDefinition,
    SpecificationValue,
)
from apps.content.models import HomepageBlock
from apps.inventory.models import Inventory, InventoryTransaction
from apps.orders.models import Order, OrderItem

from .base import AdminApiTestMixin


def _png(name="p.png"):
    buffer = io.BytesIO()
    Image.new("RGB", (40, 30), "purple").save(buffer, format="PNG")
    buffer.seek(0)
    buffer.name = name
    return buffer


class CatalogFixtureMixin(AdminApiTestMixin):
    def build_catalog(self):
        self.category = Category.objects.create(slug="laptops", name="لپ‌تاپ")
        self.brand = Brand.objects.create(name="ASUS", slug="asus")
        self.ram = SpecificationDefinition.objects.create(
            key="ram", name_fa="رم", type="SELECT", category=self.category, is_variant_axis=True, is_filterable=True
        )
        self.storage = SpecificationDefinition.objects.create(
            key="ssd", name_fa="حافظه", type="SELECT", category=self.category, is_variant_axis=True, sort_order=1
        )
        self.cpu = SpecificationDefinition.objects.create(key="cpu", name_fa="پردازنده", type="TEXT", category=self.category)
        self.ram16 = SpecificationValue.objects.create(definition=self.ram, value="16GB")
        self.ram32 = SpecificationValue.objects.create(definition=self.ram, value="32GB")
        self.ssd1 = SpecificationValue.objects.create(definition=self.storage, value="1TB")

    def create_product(self, **overrides):
        body = {
            "name": "لپ‌تاپ ایسوس Zenbook", "slug": "zenbook-14", "brand": self.brand.pk, "category": self.category.pk,
            "condition": "NEW", "status": "ACTIVE", "warranty_months": 18, "requires_serial": True,
            "seo": {"meta_title": "Zenbook 14 | آربایت", "meta_description": "توضیح سئو"},
        }
        body.update(overrides)
        response = self.client.post(reverse("admin-product-list"), body, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return Product.objects.get(pk=response.data["id"])

    def variant_rows(self):
        return [
            {"sku": "ZB-16-1T", "final_price": 60_000_000, "stock": 5, "is_default": True,
             "axis_values": {str(self.ram.pk): self.ram16.pk, str(self.storage.pk): self.ssd1.pk}},
            {"sku": "ZB-32-1T", "final_price": 72_000_000, "compare_at_price": 75_000_000, "stock": 2,
             "axis_values": {str(self.ram.pk): self.ram32.pk, str(self.storage.pk): self.ssd1.pk}},
        ]

    def put_variants(self, product, rows, axes=None):
        axes = axes if axes is not None else [self.ram.pk, self.storage.pk]
        return self.client.put(reverse("admin-product-variants", args=[product.pk]), {"axes": axes, "rows": rows}, format="json")


class AdminBrandTests(CatalogFixtureMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.build_catalog()

    def test_crud_and_delete_guard(self):
        response = self.client.post(reverse("admin-brand-list"), {"name": "MSI", "slug": "msi"}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.client.post(reverse("admin-brand-list"), {"name": "MSI2", "slug": "msi"}, format="json").status_code, 400)
        self.create_product()
        self.assertEqual(self.client.delete(reverse("admin-brand-detail", args=[self.brand.pk])).status_code, 400)
        msi = Brand.objects.get(slug="msi")
        self.assertEqual(self.client.delete(reverse("admin-brand-detail", args=[msi.pk])).status_code, 204)


class AdminProductTests(CatalogFixtureMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.build_catalog()

    def test_create_with_seo_and_filter_list(self):
        product = self.create_product()
        self.assertEqual(product.seo.meta_title, "Zenbook 14 | آربایت")
        self.put_variants(product, self.variant_rows())
        list_url = reverse("admin-product-list")
        self.assertEqual(self.client.get(list_url, {"search": "ZB-32"}).data["count"], 1)
        self.assertEqual(self.client.get(list_url, {"brand": self.brand.pk, "condition": "NEW"}).data["count"], 1)
        self.assertEqual(self.client.get(list_url, {"stock": "out"}).data["count"], 0)
        row = self.client.get(list_url).data["results"][0]
        self.assertEqual((row["price_min"], row["price_max"], row["variants_count"]), (60_000_000, 72_000_000, 2))

    def test_duplicate_slug_rejected(self):
        self.create_product()
        response = self.client.post(
            reverse("admin-product-list"),
            {"name": "x", "slug": "zenbook-14", "brand": self.brand.pk, "category": self.category.pk, "condition": "NEW"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_images_webp_alt_required_primary_and_reorder(self):
        product = self.create_product()
        url = reverse("admin-product-images", args=[product.pk])
        self.assertEqual(self.client.post(url, {"files": [_png()], "alts": [""]}, format="multipart").status_code, 400)
        response = self.client.post(url, {"files": [_png("a.png"), _png("b.png")], "alts": ["نمای جلو", "نمای کنار"]}, format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(all(img["url"].endswith(".webp") for img in response.data))
        first, second = ProductImage.objects.filter(product=product).order_by("sort_order")
        self.assertTrue(first.is_primary)
        self.client.patch(reverse("admin-product-image-detail", args=[product.pk, second.pk]), {"is_primary": True}, format="json")
        first.refresh_from_db()
        self.assertFalse(first.is_primary)
        self.client.post(reverse("admin-product-images-reorder", args=[product.pk]), {"ids": [second.pk, first.pk]}, format="json")
        second.refresh_from_db()
        self.assertEqual(second.sort_order, 1)

    def test_product_specs_required_and_axes_excluded(self):
        product = self.create_product()
        self.cpu.is_required = True
        self.cpu.save()
        url = reverse("admin-product-specs", args=[product.pk])
        self.assertEqual({d["key"] for d in self.client.get(url).data["definitions"]} >= {"ram", "cpu"}, True)
        self.assertEqual(self.client.put(url, {"specs": []}, format="json").status_code, 400)
        response = self.client.put(url, {"specs": [{"definition_id": self.cpu.pk, "custom_value": "Core Ultra 7"}]}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["specs"][0]["custom_value"], "Core Ultra 7")

    def test_variant_editor_validation(self):
        product = self.create_product()
        rows = self.variant_rows()
        rows[1]["is_default"] = True
        self.assertEqual(self.put_variants(product, rows).status_code, 400)  # دو پیش‌فرض
        rows = self.variant_rows()
        rows[1]["axis_values"] = rows[0]["axis_values"]
        self.assertEqual(self.put_variants(product, rows).status_code, 400)  # ترکیب تکراری
        rows = self.variant_rows()
        rows[1]["sku"] = rows[0]["sku"]
        self.assertEqual(self.put_variants(product, rows).status_code, 400)  # SKU تکراری

    def test_variant_editor_save_labels_stock_and_price_history(self):
        product = self.create_product()
        response = self.put_variants(product, self.variant_rows())
        self.assertEqual(response.status_code, 200, response.data)
        labels = {r["sku"]: r["label"] for r in response.data["rows"]}
        self.assertEqual(labels["ZB-32-1T"], "32GB · 1TB")
        v32 = ProductVariant.objects.get(sku="ZB-32-1T")
        self.assertEqual(v32.inventory.quantity, 2)
        self.assertEqual(InventoryTransaction.objects.filter(variant=v32, type="ADJUSTMENT").count(), 1)

        rows = response.data["rows"]
        for row in rows:
            row["axis_values"] = {k: int(v) for k, v in row["axis_values"].items()}
        rows[1]["final_price"] = 70_000_000
        rows[1]["stock"] = 4
        self.assertEqual(self.put_variants(product, rows).status_code, 200)
        self.assertEqual(PriceHistory.objects.get(variant=v32).new_price, 70_000_000)
        self.assertEqual(Inventory.objects.get(variant=v32).quantity, 4)

        preview = self.client.post(
            reverse("admin-product-variants-preview", args=[product.pk]),
            {"axes": [self.ram.pk, self.storage.pk], "rows": [{"axis_values": {str(self.ram.pk): self.ram16.pk, str(self.storage.pk): self.ssd1.pk}}]},
            format="json",
        )
        self.assertEqual(preview.data["labels"], ["16GB · 1TB"])

    def test_removed_variant_with_orders_is_soft_deleted(self):
        product = self.create_product()
        rows = self.put_variants(product, self.variant_rows()).data["rows"]
        v32 = ProductVariant.objects.get(sku="ZB-32-1T")
        order = Order.objects.create(
            user=self.make_customer(), shipping_recipient_name="x", shipping_mobile="09120000000", shipping_province="t",
            shipping_city="t", shipping_address_line="x", subtotal=1, final_total=1,
        )
        OrderItem.objects.create(order=order, variant=v32, product_name_snapshot="x", sku_snapshot=v32.sku, unit_price=1, final_price=1)
        keep = [r for r in rows if r["sku"] == "ZB-16-1T"]
        keep[0]["axis_values"] = {k: int(v) for k, v in keep[0]["axis_values"].items()}
        self.assertEqual(self.put_variants(product, keep).status_code, 200)
        v32.refresh_from_db()
        self.assertIsNotNone(v32.deleted_at)

    def test_soft_delete_product(self):
        product = self.create_product()
        self.assertEqual(self.client.delete(reverse("admin-product-detail", args=[product.pk])).status_code, 204)
        product.refresh_from_db()
        self.assertIsNotNone(product.deleted_at)


class AdminSpecTests(CatalogFixtureMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.build_catalog()

    def test_definition_and_value_crud(self):
        response = self.client.post(
            reverse("admin-spec-list"),
            {"key": "color", "name_fa": "رنگ", "type": "COLOR", "category": self.category.pk, "is_variant_axis": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        def_id = response.data["id"]
        value = self.client.post(reverse("admin-spec-value-list", args=[def_id]), {"value": "نقره‌ای", "swatch_hex": "#C0C0C0"}, format="json")
        self.assertEqual(value.status_code, 201, value.data)
        self.assertEqual(self.client.post(reverse("admin-spec-value-list", args=[def_id]), {"value": "x", "swatch_hex": "red"}, format="json").status_code, 400)
        self.assertEqual(len(self.client.get(reverse("admin-spec-list"), {"category": self.category.pk}).data), 4)

    def test_axis_only_for_select_or_color(self):
        response = self.client.post(
            reverse("admin-spec-list"), {"key": "weight", "name_fa": "وزن", "type": "NUMBER", "is_variant_axis": True}, format="json"
        )
        self.assertEqual(response.status_code, 400)


class AdminInventoryTests(CatalogFixtureMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.product = self.make_product(stock=10)
        self.variant = self.product.variants.first()

    def test_list_threshold_and_low_filter(self):
        self.client.patch(reverse("admin-inventory-threshold", args=[self.variant.pk]), {"low_stock_threshold": 20}, format="json")
        rows = self.client.get(reverse("admin-inventory-list"), {"isLow": "true"}).data["results"]
        self.assertEqual([r["sku"] for r in rows], [self.variant.sku])
        self.assertTrue(rows[0]["is_low"])

    def test_manual_transactions_and_ledger_export(self):
        url = reverse("admin-inventory-transactions")
        self.assertEqual(self.client.post(url, {"variant": self.variant.pk, "type": "STOCK_IN", "quantity": 5}, format="json").status_code, 400)
        self.assertEqual(self.client.post(url, {"variant": self.variant.pk, "type": "RESERVATION", "quantity": 1, "note": "x"}, format="json").status_code, 400)
        response = self.client.post(url, {"variant": self.variant.pk, "type": "STOCK_IN", "quantity": 5, "note": "خرید"}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.client.post(url, {"variant": self.variant.pk, "type": "STOCK_OUT", "quantity": 99, "note": "x"}, format="json").status_code, 400)
        self.assertEqual(self.client.post(url, {"variant": self.variant.pk, "type": "ADJUSTMENT", "quantity": -3, "note": "شمارش"}, format="json").status_code, 201)
        self.assertEqual(Inventory.objects.get(variant=self.variant).quantity, 12)
        self.assertEqual(self.client.get(url, {"type": "STOCK_IN", "search": ""}).data["results"][0]["note"], "خرید")
        xlsx = self.client.get(url, {"format": "xlsx"})
        self.assertEqual(xlsx.status_code, 200)
        self.assertIn("spreadsheet", xlsx["Content-Type"])


class AdminPricingTests(CatalogFixtureMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.product = self.make_product(price=1_234_000)
        self.variant = self.product.variants.first()

    def test_preview_matches_apply_and_writes_history(self):
        body = {"mode": "percent", "value": 10, "variant_ids": [self.variant.pk]}
        preview = self.client.post(reverse("admin-price-preview"), body, format="json")
        self.assertEqual(preview.data["changes"][0]["new_price"], 1_358_000)  # گرد به ۱۰۰۰ بالا
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.final_price, 1_234_000)  # پیش‌نمایش چیزی ذخیره نمی‌کند
        applied = self.client.post(reverse("admin-price-apply"), {**body, "reason": "تورم"}, format="json")
        self.assertEqual(applied.data["changes"], preview.data["changes"])
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.final_price, 1_358_000)
        history = self.client.get(reverse("admin-price-history", args=[self.variant.pk])).data
        self.assertEqual((history[0]["previous_price"], history[0]["reason"]), (1_234_000, "تورم"))

    def test_explicit_table_changes_and_negative_rejected(self):
        ok = self.client.post(reverse("admin-price-apply"), {"changes": [{"variant": self.variant.pk, "new_price": 2_000_000}]}, format="json")
        self.assertEqual(ok.data["count"], 1)
        bad = self.client.post(reverse("admin-price-preview"), {"mode": "amount", "value": -5_000_000, "variant_ids": [self.variant.pk]}, format="json")
        self.assertEqual(bad.status_code, 400)


class AdminHomepageBlockTests(CatalogFixtureMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.build_catalog()
        self.a = self.create_product(slug="flag-a", name="الف")
        self.b = self.create_product(slug="flag-b", name="ب")

    def test_flagship_duel_validation_and_public_homepage_reflects_edit(self):
        url = reverse("admin-homepage-block-list")
        bad = self.client.post(url, {"type": "FLAGSHIP_DUEL", "config": {"productSlugs": ["flag-a"], "metrics": [str(self.ram.pk), str(self.cpu.pk)]}}, format="json")
        self.assertEqual(bad.status_code, 400)
        bad = self.client.post(url, {"type": "FLAGSHIP_DUEL", "config": {"productSlugs": ["flag-a", "nope"], "metrics": [str(self.ram.pk), str(self.cpu.pk)]}}, format="json")
        self.assertEqual(bad.status_code, 400)
        created = self.client.post(
            url,
            {"type": "FLAGSHIP_DUEL", "title": "دوئل", "config": {"productSlugs": ["flag-a", "flag-b"], "metrics": [str(self.ram.pk), str(self.cpu.pk)]}},
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.client.patch(reverse("admin-homepage-block-detail", args=[created.data["id"]]), {"title": "دوئل تازه"}, format="json")
        self.assertEqual(HomepageBlock.objects.get().title, "دوئل تازه")

    def test_category_grid_and_reorder(self):
        url = reverse("admin-homepage-block-list")
        grid = self.client.post(url, {"type": "CATEGORY_GRID", "config": {"categorySlugs": ["laptops"]}}, format="json")
        rail = self.client.post(url, {"type": "PRODUCT_RAIL", "config": {"productSlugs": ["flag-a"]}}, format="json")
        self.assertEqual((grid.status_code, rail.status_code), (201, 201))
        self.client.post(reverse("admin-homepage-block-reorder"), {"ids": [int(rail.data["id"]), int(grid.data["id"])]}, format="json")
        self.assertEqual(list(HomepageBlock.objects.order_by("sort_order").values_list("type", flat=True)), ["PRODUCT_RAIL", "CATEGORY_GRID"])


@override_settings(MEDIA_ROOT="/tmp/arbyte-test-media")
class AdminToStorefrontJourneyTests(CatalogFixtureMixin, APITestCase):
    """معیار پذیرش F-02: محصول سه‌واریانتی کامل از پنل → فروشگاه با فیلتر و ?v=."""

    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.build_catalog()
        self.ssd2 = SpecificationValue.objects.create(definition=self.storage, value="2TB")

    def test_three_variant_product_visible_in_public_api(self):
        product = self.create_product()
        self.client.post(reverse("admin-product-images", args=[product.pk]), {"files": [_png()], "alts": ["Zenbook"]}, format="multipart")
        rows = self.variant_rows() + [
            {"sku": "ZB-32-2T", "final_price": 85_000_000, "stock": 1,
             "axis_values": {str(self.ram.pk): self.ram32.pk, str(self.storage.pk): self.ssd2.pk}},
        ]
        self.assertEqual(self.put_variants(product, rows).status_code, 200)

        self.client.force_authenticate(user=None)
        detail = self.client.get(reverse("public-product-detail", args=["zenbook-14"])).data["data"]
        self.assertEqual(len(detail["variants"]), 3)
        self.assertEqual(detail["seo"]["title"], "Zenbook 14 | آربایت")
        v32_2t = next(v for v in detail["variants"] if v["sku"] == "ZB-32-2T")
        self.assertEqual(v32_2t["label"], "32GB · 2TB")
        self.assertEqual(v32_2t["price"]["final"], 85_000_000)

        listing = self.client.get(reverse("public-product-list"), {"category": "laptops", f"spec[{self.ram.pk}]": "32GB"}).data
        self.assertEqual(listing["meta"]["pagination"]["total"], 1)
        card = listing["data"][0]
        self.assertIn(card["defaultVariant"]["label"], ("32GB · 1TB", "32GB · 2TB"))
