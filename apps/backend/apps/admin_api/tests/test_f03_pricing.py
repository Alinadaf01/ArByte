"""F-03 — موتور قیمت (هر ترکیب اولویت سود)، بازمحاسبه با پیش‌نمایش، ورود
اکسل (۵۰۰ ردیف، ردیف خراب، SKU تکراری، اجرای دوباره)، کمپین (برابری قیمت
فهرست/جزئیات/سبد/سفارش)."""

import io
from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from openpyxl import Workbook
from rest_framework.test import APIClient, APITestCase

from apps.catalog import pricing
from apps.catalog.models import (
    Brand,
    Category,
    ImportJob,
    PriceHistory,
    PriceRule,
    Product,
    ProductVariant,
    Supplier,
    SupplierProduct,
)
from apps.content.models import Campaign, CampaignProduct
from apps.inventory.models import Inventory
from apps.orders.models import Order
from apps.orders.testing import enable_payments
from apps.public_api.jwt_tokens import issue_tokens
from apps.settings.models import ShippingMethod
from apps.users.models import Address

from .base import AdminApiTestMixin


class PriceEngineTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.parent = Category.objects.create(slug="computers", name="کامپیوتر")
        self.category = Category.objects.create(slug="laptops", name="لپ‌تاپ", parent=self.parent)
        self.brand = Brand.objects.create(name="HP", slug="hp")
        self.product = Product.objects.create(slug="hp-x", name="HP X", brand=self.brand, category=self.category, condition="NEW")
        self.variant = ProductVariant.objects.create(
            product=self.product, sku="HPX-1", is_default=True, final_price=1, price_model="SUPPLIER_PLUS_PROFIT", supplier_price=10_000_000
        )
        self.supplier = Supplier.objects.create(name="همکار الف")
        PriceRule.objects.create(profit_type="PERCENT", profit_percent_basis_points=1000)  # سراسری ۱۰٪

    def price(self):
        self.variant.refresh_from_db()
        return pricing.compute_price(ProductVariant.objects.select_related("product__category__parent").get(pk=self.variant.pk))

    def test_global_rule_and_round_up(self):
        self.variant.supplier_price = 10_000_123
        self.variant.save()
        self.assertEqual(self.price()[:1], (11_001_000,))  # ۱۱٬۰۰۰٬۱۳۵ → بالا به ۱۰۰۰
        self.assertEqual(self.price()[2], "global")

    def test_parent_category_then_category_rule(self):
        PriceRule.objects.create(category=self.parent, profit_type="AMOUNT", profit_amount_toman=700_000)
        self.assertEqual(self.price()[0], 10_700_000)
        PriceRule.objects.create(category=self.category, profit_type="AMOUNT", profit_amount_toman=500_000)
        self.assertEqual(self.price(), (10_500_000, 10_000_000, "category"))

    def test_supplier_rule_uses_cheapest_available_supplier(self):
        other = Supplier.objects.create(name="همکار ب")
        SupplierProduct.objects.create(supplier=self.supplier, variant=self.variant, price=9_000_000)
        SupplierProduct.objects.create(supplier=other, variant=self.variant, price=8_000_000, is_available=False)
        PriceRule.objects.create(category=self.category, profit_type="AMOUNT", profit_amount_toman=500_000)
        PriceRule.objects.create(supplier=self.supplier, profit_type="PERCENT", profit_percent_basis_points=2000)
        self.assertEqual(self.price(), (10_800_000, 9_000_000, "supplier"))

    def test_variant_override_wins(self):
        PriceRule.objects.create(supplier=self.supplier, profit_type="PERCENT", profit_percent_basis_points=2000)
        SupplierProduct.objects.create(supplier=self.supplier, variant=self.variant, price=9_000_000)
        self.variant.profit_type, self.variant.profit_amount_toman = "AMOUNT", 1_000_000
        self.variant.save()
        self.assertEqual(self.price(), (10_000_000, 9_000_000, "variant"))

    def test_fixed_and_missing_data(self):
        self.variant.price_model = "FIXED"
        self.variant.save()
        self.assertIsNone(self.price()[0])
        self.variant.price_model, self.variant.supplier_price = "SUPPLIER_PLUS_PROFIT", None
        self.variant.save()
        self.assertEqual(self.price()[2], "no-supplier-price")
        PriceRule.objects.all().delete()
        self.variant.supplier_price = 1
        self.variant.save()
        self.assertEqual(self.price()[2], "no-rule")

    def test_supplier_price_change_recalculates_with_history_via_admin(self):
        self.client.force_authenticate(user=self.make_superuser())
        response = self.client.post(
            reverse("admin-supplier-product-list"), {"supplier": self.supplier.pk, "variant": self.variant.pk, "price": 12_000_000}, format="json"
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.variant.refresh_from_db()
        self.assertEqual((self.variant.final_price, self.variant.supplier_price), (13_200_000, 12_000_000))
        self.assertEqual(PriceHistory.objects.get(variant=self.variant).reason, "تغییر قیمت همکار")

    def test_recalculate_all_preview_then_apply(self):
        self.client.force_authenticate(user=self.make_superuser())
        preview = self.client.post(reverse("admin-price-recalculate"), {"apply": False}, format="json").data
        self.assertEqual(preview["changes"][0]["new_price"], 11_000_000)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.final_price, 1)
        applied = self.client.post(reverse("admin-price-recalculate"), {"apply": True}, format="json").data
        self.assertEqual(applied["changes"], preview["changes"])
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.final_price, 11_000_000)

    def test_rule_validation_and_permission(self):
        self.client.force_authenticate(user=self.make_superuser())
        bad = self.client.post(reverse("admin-price-rule-list"), {"supplier": self.supplier.pk, "category": self.category.pk, "profit_type": "AMOUNT", "profit_amount_toman": 1}, format="json")
        self.assertEqual(bad.status_code, 400)
        dup = self.client.post(reverse("admin-price-rule-list"), {"profit_type": "AMOUNT", "profit_amount_toman": 1}, format="json")
        self.assertEqual(dup.status_code, 400)  # سراسری فعال از قبل هست
        from apps.users.models import User

        no_role = User.objects.create_user(phone="09121112233", password="x-pass-123", is_staff=True, is_verified=True)
        self.client.force_authenticate(user=no_role)
        self.assertEqual(self.client.get(reverse("admin-supplier-list")).status_code, 403)

    def test_supplier_price_never_in_public_api(self):
        SupplierProduct.objects.create(supplier=self.supplier, variant=self.variant, price=9_000_000)
        client = APIClient()
        body = client.get(reverse("public-product-detail", args=["hp-x"])).content.decode()
        self.assertNotIn("supplier", body.lower())
        self.assertNotIn("profit", body.lower())


def _xlsx(rows: list[list], headers=None) -> SimpleUploadedFile:
    wb = Workbook()
    ws = wb.active
    ws.append(headers or ["کد محصول مادر", "نام محصول", "برند", "دسته", "شرایط کالا", "SKU", "نام واریانت", "قیمت نهایی", "موجودی"])
    for row in rows:
        ws.append(row)
    buffer = io.BytesIO()
    wb.save(buffer)
    return SimpleUploadedFile("products.xlsx", buffer.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


class ExcelImportTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_superuser())
        Category.objects.create(slug="laptops", name="لپ‌تاپ")
        Brand.objects.create(name="ASUS", slug="asus")

    def upload(self, rows, headers=None):
        response = self.client.post(reverse("admin-import-list"), {"file": _xlsx(rows, headers)}, format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def preview(self, job):
        return self.client.post(reverse("admin-import-preview", args=[job["id"]]), {"mapping": job["column_mapping"]}, format="json")

    def run_job(self, job):
        self.assertEqual(self.client.post(reverse("admin-import-run", args=[job["id"]])).status_code, 202)
        return self.client.get(reverse("admin-import-detail", args=[job["id"]])).data

    def test_mapping_suggested_from_headers_and_remembered(self):
        job = self.upload([["P1", "لپ‌تاپ", "ASUS", "لپ‌تاپ", "آکبند", "SKU-1", "", 1000, 1]])
        fields = {p["field"]: p["header"] for p in job["column_mapping"]}
        self.assertEqual(fields["sku"], "SKU")
        self.assertEqual(fields["final_price"], "قیمت نهایی")
        custom = self.upload([["X-9", "۱۲۰۰"]], headers=["کد کالا", "بها"])
        mapping = [{"field": "sku", "header": "کد کالا"}, {"field": "final_price", "header": "بها"}]
        self.client.post(reverse("admin-import-preview", args=[custom["id"]]), {"mapping": mapping}, format="json")
        again = self.upload([["X-10", "10"]], headers=["کد کالا", "بها"])
        self.assertIn({"field": "sku", "header": "کد کالا"}, again["column_mapping"])

    def test_preview_writes_nothing_and_flags_errors(self):
        job = self.upload([
            ["P1", "لپ‌تاپ ۱", "ASUS", "لپ‌تاپ", "آکبند", "SKU-1", "16GB", "50,000,000", 3],
            ["P1", "لپ‌تاپ ۱", "ASUS", "لپ‌تاپ", "آکبند", "SKU-1", "32GB", 60_000_000, 1],  # SKU تکراری
            ["P2", "لپ‌تاپ ۲", "Nope", "لپ‌تاپ", "خراب", "SKU-3", "", "abc", 1],  # برند/شرایط/قیمت خراب
        ])
        data = self.preview(job).data
        self.assertEqual(data["summary"], {"create": 1, "update": 0, "error": 2})
        self.assertIn("تکراری", data["rows"][1]["errors"][0])
        errors = " ".join(data["rows"][2]["errors"])
        for fragment in ("برند «Nope»", "شرایط کالای «خراب»", "قیمت نهایی"):
            self.assertIn(fragment, errors)
        self.assertFalse(ProductVariant.objects.filter(sku="SKU-1").exists())

    def test_500_rows_with_broken_row_then_idempotent_rerun(self):
        rows = [[f"P{i // 2}", f"لپ‌تاپ {i // 2}", "ASUS", "لپ‌تاپ", "استوک", f"SKU-{i}", f"v{i}", 1_000_000 + i * 1000, i % 7] for i in range(500)]
        rows[250][5] = ""  # ردیف خراب
        job = self.upload(rows)
        self.preview(job)
        result = self.run_job(job)
        self.assertEqual((result["status"], result["successful_rows"], result["failed_rows"], result["created"]), ("COMPLETED", 499, 1, 499))
        self.assertEqual(Product.objects.filter(slug__startswith="p").count(), 250)
        self.assertEqual(ProductVariant.objects.get(sku="SKU-7").inventory.quantity, 0)
        self.assertEqual(ProductVariant.objects.get(sku="SKU-8").inventory.quantity, 1)
        errors = self.client.get(reverse("admin-import-errors", args=[job["id"]]))
        self.assertEqual(errors.status_code, 200)

        rows[8][7] = 9_999_000  # تغییر قیمت در اجرای دوباره
        job2 = self.upload(rows)
        self.assertEqual(self.preview(job2).data["summary"]["update"], 499)
        result2 = self.run_job(job2)
        self.assertEqual((result2["updated"], result2["created"]), (499, 0))
        self.assertEqual(ProductVariant.objects.filter(sku__startswith="SKU-").count(), 499)
        self.assertEqual(ProductVariant.objects.get(sku="SKU-8").final_price, 9_999_000)
        self.assertEqual(PriceHistory.objects.filter(reason="ورود اکسل").count(), 1)

    def test_run_requires_preview_and_only_once(self):
        job = self.upload([["P1", "x", "ASUS", "لپ‌تاپ", "آکبند", "SKU-1", "", 1000, 1]])
        ImportJob.objects.filter(pk=job["id"]).update(column_mapping={})
        self.assertEqual(self.client.post(reverse("admin-import-run", args=[job["id"]])).status_code, 400)
        self.preview(job)
        self.run_job(job)
        self.assertEqual(self.client.post(reverse("admin-import-run", args=[job["id"]])).status_code, 400)

    def test_template_download(self):
        response = self.client.get(reverse("admin-import-template"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("spreadsheet", response["Content-Type"])


class CampaignTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.category = Category.objects.create(slug="laptops", name="لپ‌تاپ")
        brand = Brand.objects.create(name="MSI", slug="msi")
        self.product = Product.objects.create(slug="msi-a", name="MSI A", brand=brand, category=self.category, condition="NEW")
        self.variant = ProductVariant.objects.create(product=self.product, sku="MSI-A", is_default=True, final_price=40_000_000)
        Inventory.objects.create(variant=self.variant, quantity=5)
        pricing.reset_campaign_cache()
        self.admin_user = self.make_superuser()

    def make_campaign(self, **kwargs):
        admin = APIClient()
        admin.force_authenticate(user=self.admin_user)
        body = {
            "name": "حراج", "start_at": (timezone.now() - timedelta(hours=1)).isoformat(),
            "end_at": (timezone.now() + timedelta(hours=1)).isoformat(), "discount_type": "PERCENT", "value": 10,
            "category_ids": [self.category.pk],
        }
        body.update(kwargs)
        return admin.post(reverse("admin-campaign-list"), body, format="json")

    def test_validation_and_preview(self):
        self.assertEqual(self.make_campaign(value=150).status_code, 400)
        self.assertEqual(self.make_campaign(category_ids=[]).status_code, 400)
        created = self.make_campaign()
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data["state"], "running")
        admin = APIClient()
        admin.force_authenticate(user=self.admin_user)
        rows = admin.get(reverse("admin-campaign-preview", args=[created.data["id"]])).data["rows"]
        self.assertEqual(rows[0]["campaign_price"], 36_000_000)

    def test_price_parity_list_detail_cart_order(self):
        self.make_campaign()
        client = APIClient()
        detail = client.get(reverse("public-product-detail", args=["msi-a"])).data["data"]["variants"][0]["price"]
        self.assertEqual(detail, {"final": 36_000_000, "compareAt": 40_000_000})
        card = client.get(reverse("public-product-list"), {"category": "laptops"}).data["data"][0]
        self.assertEqual(card["defaultVariant"]["price"], 36_000_000)

        user = self.make_customer()
        token, _ = issue_tokens(user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        cart = client.post("/api/v1/cart/items", {"variantId": self.variant.pk, "quantity": 1}, format="json").data["data"]
        self.assertEqual(cart["items"][0]["variant"]["price"]["final"], 36_000_000)
        self.assertEqual(cart["subtotal"], 36_000_000)
        ShippingMethod.objects.create(name="پست", cost=0, is_active=True, order=0)
        address = Address.objects.create(user=user, province="تهران", city="تهران", line="x", postal_code="1234567890", receiver_name="x", receiver_phone=user.phone)
        enable_payments(limit_rial=10**12)
        response = client.post("/api/v1/orders", {"addressId": address.pk, "paymentMethod": "GATEWAY"}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        order = Order.objects.get(order_number=response.data["data"]["orderNumber"])
        self.assertEqual((order.subtotal, order.items.get().unit_price), (36_000_000, 36_000_000))

    def test_ended_campaign_and_amount_discount(self):
        Campaign.objects.create(name="قدیمی", start_at=timezone.now() - timedelta(days=2), end_at=timezone.now() - timedelta(days=1), rules={"discountType": "PERCENT", "value": 50})
        self.assertEqual(pricing.live_price(self.variant), (40_000_000, None))
        c = Campaign.objects.create(name="مبلغی", start_at=timezone.now() - timedelta(hours=1), end_at=timezone.now() + timedelta(hours=1), rules={"discountType": "AMOUNT", "value": 2_500_000})
        CampaignProduct.objects.create(campaign=c, product=self.product)
        self.assertEqual(pricing.live_price(self.variant), (37_500_000, 40_000_000))
