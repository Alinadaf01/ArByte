"""D-03 §1/§3 — ports CatalogService + ContentService
(apps/api/src/modules/catalog/catalog.service.ts,
apps/api/src/modules/content/content.service.ts) onto the Django models.
Same public/active filter criteria, same sort/filter/search semantics, same
"fetch small catalog fully, filter in Python" style Nest itself already
uses for search()/getFilters()."""

from django.db.models import Count, Min, Prefetch, Q
from django.utils import timezone

from apps.catalog.models import (
    Category,
    Product,
    ProductImage,
    ProductSpecification,
    ProductVariant,
    SpecificationDefinition,
)
from apps.catalog.pricing import live_price
from apps.content.models import HomepageBlock

from .availability import GLOBAL_LOW_STOCK_THRESHOLD
from .errors import not_found
from .search import normalize_search_text
from .serializers import build_product_card, build_product_detail, to_brand_ref, to_category_card

PUBLIC_CATEGORY_PRODUCT_Q = Q(status="ACTIVE", deleted_at__isnull=True, is_visible_on_site=True, is_visible_in_category=True)


def _public_product_q(prefix: str = "") -> Q:
    """Same criteria as PUBLIC_CATEGORY_PRODUCT_Q, but usable inside
    Category.objects.annotate(Count("products", filter=...)) — Count's
    filter kwargs must be prefixed with the relation name ("products__...")
    to reach Product's fields from a Category queryset, unlike a plain
    Product.objects.filter(...) where the bare field names apply directly."""
    return Q(**{f"{prefix}status": "ACTIVE", f"{prefix}deleted_at__isnull": True, f"{prefix}is_visible_on_site": True, f"{prefix}is_visible_in_category": True})

_ORDERED_SPEC_FIELDS = ("definition", "value")


def _spec_queryset(*, product__isnull=None, variant__isnull=None):
    # Both Nest and Django's own product-level/variant-level spec relations
    # had no explicit order — contract:parity caught this as a real diff
    # (keySpecs/spec-group order drifted between the two independently
    # seeded databases). SpecificationDefinition.sort_order already exists
    # for exactly this ("display order"), so it's the correct deterministic
    # tie-breaker, not just a workaround.
    qs = ProductSpecification.objects.select_related(*_ORDERED_SPEC_FIELDS).order_by("definition__sort_order")
    if product__isnull is not None:
        qs = qs.filter(product__isnull=product__isnull)
    if variant__isnull is not None:
        qs = qs.filter(variant__isnull=variant__isnull)
    return qs


_PRODUCT_PREFETCH = [
    Prefetch("images", queryset=ProductImage.objects.order_by("sort_order")),
    Prefetch("specifications", queryset=_spec_queryset(product__isnull=False)),
    Prefetch(
        "variants",
        queryset=ProductVariant.objects.filter(deleted_at__isnull=True)
        .select_related("inventory")
        .prefetch_related(Prefetch("specifications", queryset=_spec_queryset(variant__isnull=False)))
        .order_by("id"),
    ),
]


def _product_queryset():
    return Product.objects.select_related("brand", "category", "seo").prefetch_related(*_PRODUCT_PREFETCH)


def get_category_tree() -> list[dict]:
    rows = list(
        Category.objects.filter(is_active=True, deleted_at__isnull=True)
        .exclude(slug="")
        .order_by("sort_order")
        .values("id", "name", "slug", "parent_id", "image_main")
    )
    by_parent: dict[int | None, list[dict]] = {}
    for row in rows:
        by_parent.setdefault(row["parent_id"], []).append(row)

    def build(parent_id):
        return [
            {
                "id": str(row["id"]),
                "name": row["name"],
                "slug": row["slug"],
                "image": row["image_main"],
                "children": build(row["id"]),
            }
            for row in by_parent.get(parent_id, [])
        ]

    return build(None)


def _category_card_queryset():
    return Category.objects.annotate(
        product_count=Count("products", filter=_public_product_q("products__"), distinct=True)
    )


def get_top_level_category_cards() -> list[dict]:
    rows = list(
        _category_card_queryset()
        .filter(is_active=True, deleted_at__isnull=True, parent__isnull=True)
        .exclude(slug="")
        .order_by("sort_order")
    )
    min_prices = {
        row["category_id"]: row["min_price"]
        for row in Product.objects.filter(PUBLIC_CATEGORY_PRODUCT_Q, category_id__in=[r.id for r in rows])
        .values("category_id")
        .annotate(min_price=Min("variants__final_price", filter=Q(variants__deleted_at__isnull=True)))
        if row["min_price"] is not None
    }
    return [to_category_card(row, min_prices.get(row.id)) for row in rows]


def get_category_cards_by_slugs(slugs: list[str]) -> list[dict]:
    if not slugs:
        return []
    rows = {
        row.slug: row
        for row in _category_card_queryset().filter(slug__in=slugs, is_active=True, deleted_at__isnull=True)
    }
    return [to_category_card(rows[slug]) for slug in slugs if slug in rows]


def get_category_by_slug(slug: str) -> dict:
    try:
        category = (
            Category.objects.select_related("parent")
            .prefetch_related(
                Prefetch(
                    "children",
                    queryset=_category_card_queryset().filter(is_active=True, deleted_at__isnull=True).order_by("sort_order"),
                )
            )
            .get(slug=slug, is_active=True, deleted_at__isnull=True)
        )
    except Category.DoesNotExist:
        raise not_found("دسته‌بندی پیدا نشد.") from None

    return {
        "id": str(category.id),
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "imageMain": category.image_main,
        "imageBanner": category.image_banner,
        "parent": (
            {"id": str(category.parent_id), "name": category.parent.name, "slug": category.parent.slug}
            if category.parent_id
            else None
        ),
        "children": [to_category_card(child) for child in category.children.all()],
        "seo": {"title": None, "description": None, "canonical": None},
    }


def get_product_cards_by_slugs(slugs: list[str]) -> list[dict]:
    if not slugs:
        return []
    products = {
        p.slug: p
        for p in _product_queryset().filter(
            slug__in=slugs, status="ACTIVE", deleted_at__isnull=True, is_visible_on_site=True
        )
    }
    return [build_product_card(products[slug], GLOBAL_LOW_STOCK_THRESHOLD) for slug in slugs if slug in products]


def _variant_matches(variant: ProductVariant, query: dict) -> bool:
    price = live_price(variant)[0]
    if query.get("minPrice") is not None and price < query["minPrice"]:
        return False
    if query.get("maxPrice") is not None and price > query["maxPrice"]:
        return False
    if query.get("spec"):
        variant_axis_values = {}
        for spec in variant.specifications.all():
            if spec.value_id and spec.value.value:
                variant_axis_values[str(spec.definition_id)] = spec.value.value
        for spec_def_id, value in query["spec"].items():
            if variant_axis_values.get(spec_def_id) != value:
                return False
    availability = query.get("availability")
    if availability == "PREORDER" and not variant.is_preorder:
        return False
    if availability == "IN_STOCK":
        if variant.is_preorder:
            return False
        inventory = getattr(variant, "inventory", None)
        available = inventory.available_quantity if inventory else 0
        if not available or available <= 0:
            return False
    return True


def list_products(query: dict) -> tuple[list[dict], int]:
    qs = _product_queryset().filter(
        status="ACTIVE", deleted_at__isnull=True, is_visible_on_site=True, is_visible_in_category=True
    )
    if query.get("category"):
        qs = qs.filter(category__slug=query["category"])
    if query.get("brand"):
        qs = qs.filter(brand__slug__in=query["brand"])
    if query.get("condition"):
        qs = qs.filter(condition=query["condition"])

    products = [p for p in qs if any(_variant_matches(v, query) for v in p.variants.all())]

    rows = [
        {"card": build_product_card(p, GLOBAL_LOW_STOCK_THRESHOLD, query.get("spec")), "priority": p.priority, "created_at": p.created_at}
        for p in products
    ]

    sort = query.get("sort", "featured")
    if sort == "price_asc":
        rows.sort(key=lambda r: r["card"]["defaultVariant"]["price"])
    elif sort == "price_desc":
        rows.sort(key=lambda r: r["card"]["defaultVariant"]["price"], reverse=True)
    elif sort in ("popular", "featured"):
        rows.sort(key=lambda r: (r["priority"], r["created_at"]), reverse=True)
    else:  # newest / default
        rows.sort(key=lambda r: r["created_at"], reverse=True)

    total = len(rows)
    start = (query["page"] - 1) * query["perPage"]
    items = [r["card"] for r in rows[start : start + query["perPage"]]]
    return items, total


def get_product_by_slug(slug: str) -> dict:
    try:
        product = _product_queryset().get(
            slug=slug, status="ACTIVE", deleted_at__isnull=True, is_visible_on_site=True
        )
    except Product.DoesNotExist:
        raise not_found("محصول پیدا نشد.") from None
    return build_product_detail(product, GLOBAL_LOW_STOCK_THRESHOLD)


def get_filters(category_slug: str | None = None) -> dict:
    category_id = None
    if category_slug:
        try:
            category = Category.objects.get(slug=category_slug, is_active=True, deleted_at__isnull=True)
        except Category.DoesNotExist:
            raise not_found("دسته‌بندی پیدا نشد.") from None
        category_id = category.id

    base_q = PUBLIC_CATEGORY_PRODUCT_Q & (Q(category_id=category_id) if category_id else Q())

    definitions = (
        list(SpecificationDefinition.objects.filter(category_id=category_id, is_filterable=True).order_by("sort_order"))
        if category_id
        else []
    )

    products = (
        Product.objects.filter(base_q)
        .select_related("brand")
        .prefetch_related(
            Prefetch("specifications", queryset=_spec_queryset(product__isnull=False)),
            Prefetch(
                "variants",
                queryset=ProductVariant.objects.filter(deleted_at__isnull=True).prefetch_related(
                    Prefetch(
                        "specifications",
                        queryset=_spec_queryset(variant__isnull=False),
                    )
                ),
            ),
        )
    )

    price_min = float("inf")
    price_max = float("-inf")
    brand_map: dict[str, dict] = {}
    brand_counts: dict[str, int] = {}
    # dict, not set — Python's set() iteration order is hash-based (and
    # randomized per-process via PYTHONHASHSEED), unlike a dict which
    # preserves insertion order; a plain set() here made `conditions`
    # non-deterministic across server restarts, not just a Nest-parity gap.
    condition_seen: dict[str, None] = {}
    spec_values: dict[str, dict[str, set]] = {}
    spec_numeric_range: dict[str, dict[str, float]] = {}

    for p in products:
        condition_seen[p.condition] = None
        brand_id = str(p.brand_id)
        brand_map[brand_id] = to_brand_ref(p)
        brand_counts[brand_id] = brand_counts.get(brand_id, 0) + 1

        all_specs = list(p.specifications.all())
        for v in p.variants.all():
            price = live_price(v)[0]
            price_min = min(price_min, price)
            price_max = max(price_max, price)
            all_specs.extend(v.specifications.all())

        for spec in all_specs:
            def_id = str(spec.definition_id)
            if spec.value_id and spec.value.value:
                by_value = spec_values.setdefault(def_id, {})
                by_value.setdefault(spec.value.value, set()).add(p.id)
            if spec.numeric_value is not None:
                n = float(spec.numeric_value)
                current = spec_numeric_range.get(def_id)
                if current is None:
                    spec_numeric_range[def_id] = {"min": n, "max": n}
                else:
                    current["min"] = min(current["min"], n)
                    current["max"] = max(current["max"], n)

    specs = []
    for definition in definitions:
        def_id = str(definition.id)
        entry = {"specDefId": def_id, "name": definition.name_fa, "type": definition.type, "unit": definition.unit}
        if definition.type == "NUMBER":
            entry["numericRange"] = spec_numeric_range.get(def_id)
        else:
            by_value = spec_values.get(def_id, {})
            entry["options"] = [{"value": value, "count": len(ids)} for value, ids in by_value.items()]
        specs.append(entry)

    return {
        "specs": specs,
        "priceRange": {
            "min": price_min if price_min != float("inf") else 0,
            "max": price_max if price_max != float("-inf") else 0,
        },
        "brands": [{**brand, "count": brand_counts.get(brand["id"], 0)} for brand in brand_map.values()],
        "conditions": list(condition_seen),
    }


def search(query: dict) -> tuple[list[dict], int]:
    needle = normalize_search_text(query["q"])
    candidates = _product_queryset().filter(
        status="ACTIVE", deleted_at__isnull=True, is_visible_on_site=True, is_visible_in_search=True
    ).order_by("-priority", "-created_at")

    products = [
        p
        for p in candidates
        if needle in normalize_search_text(p.name) or needle in normalize_search_text(p.brand.name)
    ]
    cards = [build_product_card(p, GLOBAL_LOW_STOCK_THRESHOLD) for p in products]
    total = len(cards)
    start = (query["page"] - 1) * query["perPage"]
    items = cards[start : start + query["perPage"]]
    return items, total


# ---- content (homepage) ----


def _read_string(config: dict | None, key: str) -> str | None:
    if not config:
        return None
    value = config.get(key)
    return value if isinstance(value, str) else None


def _read_string_array(config: dict | None, key: str) -> list[str]:
    if not config:
        return []
    value = config.get(key)
    return [v for v in value if isinstance(v, str)] if isinstance(value, list) else []


def _resolve_flagship_duel(config: dict | None) -> dict | None:
    product_slugs = _read_string_array(config, "productSlugs")
    metric_def_ids = _read_string_array(config, "metrics")

    products = get_product_cards_by_slugs(product_slugs)
    product_a = next((p for p in products if p["slug"] == product_slugs[0]), None) if len(product_slugs) > 0 else None
    product_b = next((p for p in products if p["slug"] == product_slugs[1]), None) if len(product_slugs) > 1 else None
    if not product_a or not product_b:
        return None
    if not metric_def_ids:
        return {"products": [product_a, product_b], "metrics": []}

    definitions = {str(d.id): d for d in SpecificationDefinition.objects.filter(id__in=metric_def_ids)}
    a_id, b_id = int(product_a["id"]), int(product_b["id"])
    specs = list(
        ProductSpecification.objects.filter(definition_id__in=metric_def_ids, product_id__in=[a_id, b_id])
    )

    def value_for(product_id: int, def_id: str) -> str:
        row = next((s for s in specs if str(s.definition_id) == def_id and s.product_id == product_id), None)
        return (row.custom_value or "") if row else ""

    metrics = [
        {
            "label": definitions[def_id].name_fa if def_id in definitions else "",
            "values": [value_for(a_id, def_id), value_for(b_id, def_id)],
        }
        for def_id in metric_def_ids
    ]
    return {"products": [product_a, product_b], "metrics": metrics}


def _resolve_block(row: HomepageBlock) -> dict | None:
    base = {
        "id": str(row.id),
        "sortOrder": row.sort_order,
        "title": row.title,
        "subtitle": row.subtitle,
        "ctaLabel": row.cta_label,
        "ctaUrl": row.cta_url,
        "imageDesktop": row.image_desktop,
        "imageMobile": row.image_mobile,
        "imageAlt": row.image_alt,
    }
    config = row.config or {}

    if row.type == "HERO":
        return {**base, "type": "HERO", "framesManifest": _read_string(config, "framesManifest")}
    if row.type == "CATEGORY_GRID":
        categories = get_category_cards_by_slugs(_read_string_array(config, "categorySlugs"))
        return {**base, "type": "CATEGORY_GRID", "categories": categories}
    if row.type == "FLAGSHIP_DUEL":
        resolved = _resolve_flagship_duel(config)
        if resolved is None:
            return None
        return {**base, "type": "FLAGSHIP_DUEL", **resolved}
    if row.type == "PRODUCT_RAIL":
        products = get_product_cards_by_slugs(_read_string_array(config, "productSlugs"))
        return {**base, "type": "PRODUCT_RAIL", "products": products}
    return {**base, "type": row.type}


def get_homepage() -> dict:
    now = timezone.now()
    rows = HomepageBlock.objects.filter(Q(is_active=True) & (Q(starts_at__isnull=True) | Q(starts_at__lte=now))).order_by(
        "sort_order"
    )
    active = [row for row in rows if not row.ends_at or row.ends_at > now]
    blocks = [b for b in (_resolve_block(row) for row in active) if b is not None]
    return {"blocks": blocks}
