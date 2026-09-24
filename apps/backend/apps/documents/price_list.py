from itertools import groupby

from django.db.models import QuerySet

from .context import base_context
from .persian import format_toman
from .tasks import render_pdf_async

_UNCATEGORIZED = "سایر"


def build_price_list_context(variants: QuerySet, *, generated_by_name: str) -> dict:
    """For wholesale customers or printing — generated straight from the
    database, so it's never stale (BACKEND-TASK.md §3.6-ب: 'از همان دیتابیس
    تولید می‌شود، پس هرگز قدیمی نیست'). Grouped by category (§5: 'گروه‌بندی
    بر اساس دسته‌بندی، مناسب برای مشتریان عمده') rather than one flat table,
    so a wholesale buyer can find their product line without scanning the
    whole catalog.

    D-02 §۲ — takes a ProductVariant queryset, not Product: price/sku live
    on the variant now, and a product with multiple configurations needs a
    row per configuration, not one row per product."""
    ctx = base_context(doc_title="لیست قیمت", generated_by_name=generated_by_name)
    ordered = sorted(
        variants.select_related("product__category"),
        key=lambda v: v.product.category.name if v.product.category_id else _UNCATEGORIZED,
    )
    ctx["groups"] = [
        {
            "category": category_name,
            "rows": [
                {
                    "sku": variant.sku,
                    "name": variant.product.name + (f" ({variant.name})" if variant.name else ""),
                    "price": format_toman(variant.final_price),
                }
                for variant in group
            ],
        }
        for category_name, group in groupby(
            ordered, key=lambda v: v.product.category.name if v.product.category_id else _UNCATEGORIZED
        )
    ]
    return ctx


def render_price_list_pdf(variants: QuerySet, *, generated_by_name: str) -> bytes:
    context = build_price_list_context(variants, generated_by_name=generated_by_name)
    return render_pdf_async("documents/price_list.html", context)
