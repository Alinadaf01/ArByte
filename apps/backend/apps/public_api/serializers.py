"""D-03 §1/§3 — plain dict builders mirroring
apps/api/src/modules/catalog/catalog.service.ts's own private helpers
field-for-field (buildAxesAndVariants, buildKeySpecs, buildSpecGroups,
buildProductCard, toBrandRef/toCategoryRef, toCategoryCard). Returns
snake_case-keyed dicts on purpose — DRF's CamelCaseJSONRenderer (already
global, see config/settings.py) converts them to camelCase on the way out,
same as every apps/admin_api response already relies on."""

from apps.catalog.key_specs import MAX_KEY_SPECS
from apps.catalog.pricing import live_price

from .availability import compute_availability
from .media import public_media_url
from .variant import build_variant_label, select_card_variant

_NULL_SEO = {"title": None, "description": None, "canonical": None}


def spec_value_of(spec) -> str:
    if spec.value_id and spec.value.value:
        return spec.value.value
    if spec.custom_value:
        return spec.custom_value
    if spec.numeric_value is not None:
        return str(spec.numeric_value)
    return ""


def build_axes_and_variants(variant_rows: list, global_threshold: int) -> tuple[list[dict], list[dict]]:
    axis_order: list[str] = []
    axis_meta: dict[str, dict] = {}

    for v in variant_rows:
        for spec in v.specifications.all():
            if not spec.definition.is_variant_axis:
                continue
            value = spec_value_of(spec)
            if not value:
                continue
            def_id = str(spec.definition_id)
            if def_id not in axis_meta:
                axis_order.append(def_id)
                # dict, not set — mirrors Nest's `new Set<string>()` +
                # `Array.from(...)`, which preserves JS Set insertion order;
                # a plain Python set() has no such guarantee (hash order),
                # which showed up as a real ordering diff in contract:parity.
                axis_meta[def_id] = {"name": spec.definition.name_fa, "values": {}}
            axis_meta[def_id]["values"][value] = None

    axis_refs_for_label = [{"specDefId": def_id} for def_id in axis_order]

    variants: list[dict] = []
    for v in variant_rows:
        axis_values: dict[str, str] = {}
        for spec in v.specifications.all():
            if not spec.definition.is_variant_axis:
                continue
            value = spec_value_of(spec)
            if value:
                axis_values[str(spec.definition_id)] = value
        inventory = getattr(v, "inventory", None)
        live_final, live_compare = live_price(v)
        variants.append(
            {
                "id": str(v.id),
                "sku": v.sku,
                "label": build_variant_label(axis_values, axis_refs_for_label),
                "axisValues": axis_values,
                "price": {
                    "final": live_final,
                    "compareAt": live_compare,
                },
                "availability": compute_availability(inventory, v.is_preorder, global_threshold),
            }
        )

    variant_axes = [
        {"specDefId": def_id, "name": axis_meta[def_id]["name"], "values": list(axis_meta[def_id]["values"])}
        for def_id in axis_order
    ]

    return variants, variant_axes


def build_key_specs(product_specs, variant_specs=()) -> list[dict]:
    """AUDIT §۱۲.۴ — مشخصات کلیدی یک واریانت، به ترتیب صریح `key_spec_order`.

    مشخصه‌ی همان واریانت (مثلاً رم پیکربندی انتخاب‌شده) بر مقدار مشترک محصول
    مقدم است؛ تعریف بدون `key_spec_order` هرگز کلیدی نیست (نه «اولین N مورد»).
    """
    by_definition: dict[int, object] = {}
    for spec in list(product_specs) + list(variant_specs):
        if spec.definition.key_spec_order is not None and spec_value_of(spec):
            by_definition[spec.definition_id] = spec
    ranked = sorted(
        by_definition.values(),
        key=lambda spec: (spec.definition.key_spec_order, spec.definition.sort_order, spec.definition_id),
    )
    return [{"name": spec.definition.name_fa, "value": spec_value_of(spec)} for spec in ranked[:MAX_KEY_SPECS]]


def _variant_specs(variant_rows: list, variant_id: str) -> list:
    row = next((v for v in variant_rows if str(v.id) == variant_id), None)
    return list(row.specifications.all()) if row else []


def build_spec_groups(specs) -> list[dict]:
    items = [{"name": spec.definition.name_fa, "value": spec_value_of(spec)} for spec in specs]
    items = [item for item in items if item["value"]]
    if not items:
        return []
    return [{"groupName": "مشخصات فنی", "items": items}]


def to_brand_ref(product) -> dict:
    return {"id": str(product.brand_id), "name": product.brand.name, "slug": product.brand.slug}


def to_category_ref(product) -> dict:
    return {"id": str(product.category_id), "name": product.category.name, "slug": product.category.slug}


def build_product_card(product, global_threshold: int, spec_filters: dict[str, str] | None = None) -> dict:
    variant_rows = list(product.variants.all())
    variants, _ = build_axes_and_variants(variant_rows, global_threshold)
    actual_default = next((v for v in variant_rows if v.is_default), None)
    actual_default_id = str(actual_default.id) if actual_default else variants[0]["id"]
    chosen = select_card_variant(variants, actual_default_id, spec_filters)
    product_specs = list(product.specifications.all())

    images = [img for img in product.images.all() if public_media_url(img.url)]
    primary_image = next((img for img in images if img.is_primary), images[0] if images else None)

    return {
        "id": str(product.id),
        "slug": product.slug,
        "name": product.name,
        "brand": to_brand_ref(product),
        "category": to_category_ref(product),
        "condition": product.condition,
        "image": (
            {"url": public_media_url(primary_image.url), "alt": primary_image.alt_text, "order": primary_image.sort_order}
            if primary_image
            else None
        ),
        "keySpecs": build_key_specs(product_specs, _variant_specs(variant_rows, chosen["id"])),
        "defaultVariant": {
            "id": chosen["id"],
            "label": chosen["label"],
            "price": chosen["price"]["final"],
            "availability": chosen["availability"],
        },
        "hasMultipleVariants": len(variants) > 1,
        "variantCount": len(variants),
    }


def build_product_detail(product, global_threshold: int) -> dict:
    variant_rows = list(product.variants.all())
    variants, variant_axes = build_axes_and_variants(variant_rows, global_threshold)
    actual_default = next((v for v in variant_rows if v.is_default), None)
    default_variant_id = str(actual_default.id) if actual_default else variants[0]["id"]
    product_specs = list(product.specifications.all())

    images = [
        {"url": url, "alt": img.alt_text, "order": img.sort_order}
        for img in product.images.all()
        if (url := public_media_url(img.url))
    ]

    return {
        "id": str(product.id),
        "slug": product.slug,
        "name": product.name,
        "brand": to_brand_ref(product),
        "category": to_category_ref(product),
        "condition": product.condition,
        "images": images,
        "shortDescription": product.short_description,
        "description": product.description,
        "defaultVariantId": default_variant_id,
        "variantAxes": variant_axes,
        "variants": [
            {**variant, "keySpecs": build_key_specs(product_specs, _variant_specs(variant_rows, variant["id"]))}
            for variant in variants
        ],
        "specifications": build_spec_groups(product_specs),
        "seo": _seo_of(product),
        # G-01 — خلاصه‌ی نظرهای تأییدشده (JSON-LD AggregateRating فقط با ≥۳ نظر).
        "rating": _rating_of(product),
    }


def _rating_of(product) -> dict:
    from .content_views import rating_summary

    return rating_summary(product)


def _seo_of(product) -> dict:
    """F-02 — ردیف SeoMetadata محصول (پنل ادمین)؛ نبودش همان null قبلی."""
    from django.core.exceptions import ObjectDoesNotExist

    try:
        seo = product.seo
    except ObjectDoesNotExist:
        return _NULL_SEO
    return {"title": seo.meta_title, "description": seo.meta_description, "canonical": seo.canonical}


def to_category_card(category, min_price: int | None = None) -> dict:
    return {
        "id": str(category.id),
        "name": category.name,
        "slug": category.slug,
        "image": (
            {"url": url, "alt": category.name} if (url := public_media_url(category.image_main)) else None
        ),
        "productCount": category.product_count,
        "description": category.description,
        "minPrice": min_price,
    }
