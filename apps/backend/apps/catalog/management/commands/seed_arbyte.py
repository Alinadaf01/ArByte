"""D-02 §۴ — همان کاتالوگ Nest را idempotent seed می‌کند: apps/web روی داده‌ی
Nest ساخته و تست شده (۵ دسته، ۱۸ محصول، پرچم‌دارها، واریانت‌ها، مشخصات،
بلوک‌های صفحه اصلی)، پس Django باید دقیقاً همان را داشته باشد وگرنه تست
برابری D-03 معنا ندارد.

منبع: apps/backend/fixtures/arbyte-catalog.json — با
`pnpm --filter @arbyte/api export-catalog` از دیتابیس Nest (بعد از
`pnpm db:seed`) ساخته می‌شود. کلید طبیعی همه‌جا (slug/sku/key)، بدون
نگاشت id-به-id با Prisma.

⚠️ تصاویر همان مسیرهای apps/web/public/... می‌مانند — رشته‌ی ساده، نه
آپلود فایل (D-02 §۱).
"""

import json
import os
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import (
    Brand,
    Category,
    Product,
    ProductImage,
    ProductSpecification,
    ProductVariant,
    SpecificationDefinition,
    SpecificationValue,
)
from apps.content.models import HomepageBlock
from apps.inventory.models import Inventory
from apps.users.models import User

FIXTURE_PATH = Path(settings.BASE_DIR) / "fixtures" / "arbyte-catalog.json"


class Command(BaseCommand):
    help = "همان کاتالوگ Nest (apps/api/scripts/export-catalog.ts) را از fixtures/arbyte-catalog.json seed می‌کند."

    @transaction.atomic
    def handle(self, *args, **options):
        if not FIXTURE_PATH.exists():
            self.stderr.write(
                self.style.ERROR(
                    f"fixture یافت نشد: {FIXTURE_PATH}\n"
                    "اول از apps/api اجرا کنید: pnpm export-catalog"
                )
            )
            return

        data = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

        brands_by_slug = self._seed_brands(data["brands"])
        categories_by_slug = self._seed_categories(data["categories"])
        defs_by_key, values_by_key_value = self._seed_specification_definitions(
            data["specificationDefinitions"], categories_by_slug
        )
        products_count, variants_count = self._seed_products(
            data["products"], brands_by_slug, categories_by_slug, defs_by_key, values_by_key_value
        )
        blocks_count = self._seed_homepage_blocks(data["homepageBlocks"], defs_by_key)
        self._seed_superuser()

        self.stdout.write(
            self.style.SUCCESS(
                f"seed_arbyte: {len(brands_by_slug)} برند، {len(categories_by_slug)} دسته، "
                f"{len(defs_by_key)} مشخصه، {products_count} محصول، {variants_count} واریانت، "
                f"{blocks_count} بلوک صفحه اصلی"
            )
        )

    def _seed_brands(self, rows: list[dict]) -> dict[str, Brand]:
        result = {}
        for row in rows:
            brand, _ = Brand.objects.update_or_create(
                slug=row["slug"],
                defaults={
                    "name": row["name"],
                    "logo_url": row["logoUrl"],
                    "description": row["description"],
                    "is_active": row["isActive"],
                },
            )
            result[row["slug"]] = brand
        return result

    def _seed_categories(self, rows: list[dict]) -> dict[str, Category]:
        result = {}
        # First pass without parent (a child might be seeded before its
        # parent exists as a Django row); second pass wires parent up.
        for row in rows:
            cat, _ = Category.objects.update_or_create(
                slug=row["slug"],
                defaults={
                    "name": row["name"],
                    "description": row["description"],
                    "image_main": row["imageMain"],
                    "image_banner": row["imageBanner"],
                    "image_thumbnail": row["imageThumbnail"],
                    "sort_order": row["sortOrder"],
                    "is_active": row["isActive"],
                },
            )
            result[row["slug"]] = cat
        for row in rows:
            if row["parentSlug"]:
                cat = result[row["slug"]]
                cat.parent = result[row["parentSlug"]]
                cat.save(update_fields=["parent"])
        return result

    def _seed_specification_definitions(
        self, rows: list[dict], categories_by_slug: dict[str, Category]
    ) -> tuple[dict[str, SpecificationDefinition], dict[tuple[str, str], SpecificationValue]]:
        defs_by_key = {}
        values_by_key_value = {}
        for row in rows:
            defn, _ = SpecificationDefinition.objects.update_or_create(
                key=row["key"],
                defaults={
                    "name_fa": row["nameFa"],
                    "type": row["type"],
                    "unit": row["unit"],
                    "category": categories_by_slug.get(row["categorySlug"]) if row["categorySlug"] else None,
                    "is_required": row["isRequired"],
                    "is_filterable": row["isFilterable"],
                    "is_searchable": row["isSearchable"],
                    "is_variant_axis": row["isVariantAxis"],
                    "sort_order": row["sortOrder"],
                },
            )
            defs_by_key[row["key"]] = defn
            for v in row["values"]:
                value_obj, _ = SpecificationValue.objects.update_or_create(
                    definition=defn,
                    value=v["value"],
                    defaults={"swatch_hex": v["swatchHex"], "sort_order": v["sortOrder"]},
                )
                values_by_key_value[(row["key"], v["value"])] = value_obj
        return defs_by_key, values_by_key_value

    def _seed_product_specs(
        self,
        spec_rows: list[dict],
        defs_by_key: dict[str, SpecificationDefinition],
        values_by_key_value: dict[tuple[str, str], SpecificationValue],
        *,
        product: Product | None = None,
        variant: ProductVariant | None = None,
    ) -> None:
        for s in spec_rows:
            defn = defs_by_key[s["definitionKey"]]
            value_obj = values_by_key_value.get((s["definitionKey"], s["value"])) if s["value"] else None
            ProductSpecification.objects.update_or_create(
                definition=defn,
                product=product,
                variant=variant,
                defaults={
                    "value": value_obj,
                    "custom_value": s["customValue"],
                    "numeric_value": s["numericValue"],
                },
            )

    def _seed_products(
        self,
        rows: list[dict],
        brands_by_slug: dict[str, Brand],
        categories_by_slug: dict[str, Category],
        defs_by_key: dict[str, SpecificationDefinition],
        values_by_key_value: dict[tuple[str, str], SpecificationValue],
    ) -> tuple[int, int]:
        products_count = 0
        variants_count = 0
        for row in rows:
            product, _ = Product.objects.update_or_create(
                slug=row["slug"],
                defaults={
                    "name": row["name"],
                    "brand": brands_by_slug[row["brandSlug"]],
                    "category": categories_by_slug[row["categorySlug"]],
                    "model_number": row["modelNumber"],
                    "gtin": row["gtin"],
                    "part_number": row["partNumber"],
                    "description": row["description"],
                    "short_description": row["shortDescription"],
                    "condition": row["condition"],
                    "status": row["status"],
                    "is_visible_on_site": row["isVisibleOnSite"],
                    "is_visible_in_search": row["isVisibleInSearch"],
                    "is_visible_in_category": row["isVisibleInCategory"],
                    "return_policy_note": row["returnPolicyNote"],
                    "shipping_note": row["shippingNote"],
                    "priority": row["priority"],
                },
            )
            products_count += 1

            # No natural key on ProductImage — replace-in-full keeps re-runs
            # idempotent at the level that matters (end state), simpler than
            # diffing rows that have no stable identity of their own.
            product.images.all().delete()
            for img in row["images"]:
                ProductImage.objects.create(
                    product=product,
                    url=img["url"],
                    alt_text=img["altText"],
                    sort_order=img["sortOrder"],
                    is_primary=img["isPrimary"],
                )

            self._seed_product_specs(row["specifications"], defs_by_key, values_by_key_value, product=product)

            for v in row["variants"]:
                variant, _ = ProductVariant.objects.update_or_create(
                    sku=v["sku"],
                    defaults={
                        "product": product,
                        "name": v["name"],
                        "is_default": v["isDefault"],
                        "price_model": v["priceModel"],
                        "supplier_price": v["supplierPrice"],
                        "profit_type": v["profitType"],
                        "profit_amount_toman": v["profitAmountToman"],
                        "profit_percent_basis_points": v["profitPercentBasisPoints"],
                        "final_price": v["finalPrice"],
                        "compare_at_price": v["compareAtPrice"],
                        "is_preorder": v["isPreorder"],
                    },
                )
                variants_count += 1

                if v["inventory"]:
                    Inventory.objects.update_or_create(
                        variant=variant,
                        defaults={
                            "quantity": v["inventory"]["quantity"],
                            "reserved_quantity": v["inventory"]["reservedQuantity"],
                            "low_stock_threshold": v["inventory"]["lowStockThreshold"],
                        },
                    )

                self._seed_product_specs(v["specifications"], defs_by_key, values_by_key_value, variant=variant)

        return products_count, variants_count

    def _seed_homepage_blocks(self, rows: list[dict], defs_by_key: dict) -> int:
        # No natural key on HomepageBlock either — same replace-in-full
        # reasoning as ProductImage above.
        HomepageBlock.objects.all().delete()
        for row in rows:
            HomepageBlock.objects.create(
                type=row["type"],
                sort_order=row["sortOrder"],
                is_active=row["isActive"],
                title=row["title"],
                subtitle=row["subtitle"],
                cta_label=row["ctaLabel"],
                cta_url=row["ctaUrl"],
                image_desktop=row["imageDesktop"],
                image_mobile=row["imageMobile"],
                image_alt=row["imageAlt"],
                config=self._resolve_block_config(row["type"], row["config"], defs_by_key),
                starts_at=row["startsAt"],
                ends_at=row["endsAt"],
            )
        return len(rows)

    def _resolve_block_config(self, block_type: str, config: dict | None, defs_by_key: dict) -> dict | None:
        # export-catalog.ts already remaps FLAGSHIP_DUEL's `metrics` from
        # Nest's raw specificationDefinitionId (cuid, meaningless here) to
        # the specification's natural `key` — resolve that key to this
        # database's own integer SpecificationDefinition.id, same natural-key
        # pattern as every other relation in this command.
        if block_type != "FLAGSHIP_DUEL" or not config or "metrics" not in config:
            return config
        return {
            **config,
            "metrics": [str(defs_by_key[key].id) for key in config["metrics"]],
        }

    def _seed_superuser(self) -> None:
        phone = os.environ.get("DJANGO_SUPERUSER_PHONE")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")
        if not phone or not password:
            self.stdout.write(
                "DJANGO_SUPERUSER_PHONE/DJANGO_SUPERUSER_PASSWORD تنظیم نشده — "
                "سوپریوزر ساخته نشد (بعداً با manage.py createsuperuser بسازید)."
            )
            return
        if User.objects.filter(is_superuser=True).exists():
            return
        User.objects.create_superuser(phone=phone, password=password)
        self.stdout.write(self.style.SUCCESS(f"سوپریوزر {phone} ساخته شد."))
