"""D-03 §1/§3 — plain dict builders mirroring
apps/api/src/modules/catalog/catalog.service.ts's own private helpers
field-for-field (buildAxesAndVariants, buildKeySpecs, buildSpecGroups,
buildProductCard, toBrandRef/toCategoryRef, toCategoryCard). Returns
snake_case-keyed dicts on purpose — DRF's CamelCaseJSONRenderer (already
global, see config/settings.py) converts them to camelCase on the way out,
same as every apps/admin_api response already relies on."""

from .availability import compute_availability
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
        variants.append(
            {
                "id": str(v.id),
                "sku": v.sku,
                "label": build_variant_label(axis_values, axis_refs_for_label),
                "axisValues": axis_values,
                "price": {
                    "final": v.final_price,
                    "compareAt": v.compare_at_price,
                },
                "availability": compute_availability(inventory, v.is_preorder, global_threshold),
            }
        )

    variant_axes = [
        {"specDefId": def_id, "name": axis_meta[def_id]["name"], "values": list(axis_meta[def_id]["values"])}
        for def_id in axis_order
    ]

    return variants, variant_axes


def build_key_specs(specs) -> list[dict]:
    items = []
    for spec in list(specs)[:4]:
        value = spec_value_of(spec)
        if value:
            items.append({"name": spec.definition.name_fa, "value": value})
    return items


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

    images = list(product.images.all())
    primary_image = next((img for img in images if img.is_primary), images[0] if images else None)

    return {
        "id": str(product.id),
        "slug": product.slug,
        "name": product.name,
        "brand": to_brand_ref(product),
        "category": to_category_ref(product),
        "condition": product.condition,
        "image": (
            {"url": primary_image.url, "alt": primary_image.alt_text, "order": primary_image.sort_order}
            if primary_image
            else None
        ),
        "keySpecs": build_key_specs(product.specifications.all()),
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

    images = [
        {"url": img.url, "alt": img.alt_text, "order": img.sort_order} for img in product.images.all()
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
        "variants": variants,
        "specifications": build_spec_groups(product.specifications.all()),
        "seo": _NULL_SEO,
    }


def to_category_card(category, min_price: int | None = None) -> dict:
    return {
        "id": str(category.id),
        "name": category.name,
        "slug": category.slug,
        "image": {"url": category.image_main, "alt": category.name} if category.image_main else None,
        "productCount": category.product_count,
        "description": category.description,
        "minPrice": min_price,
    }
