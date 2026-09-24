from itertools import groupby

from django.db.models import QuerySet

from .context import base_context
from .persian import format_toman
from .tasks import render_pdf_async

_UNCATEGORIZED = "سایر"


def build_price_list_context(products: QuerySet, *, generated_by_name: str) -> dict:
    """For wholesale customers or printing — generated straight from the
    database, so it's never stale (BACKEND-TASK.md §3.6-ب: 'از همان دیتابیس
    تولید می‌شود، پس هرگز قدیمی نیست'). Grouped by category (§5: 'گروه‌بندی
    بر اساس دسته‌بندی، مناسب برای مشتریان عمده') rather than one flat table,
    so a wholesale buyer can find their product line without scanning the
    whole catalog."""
    ctx = base_context(doc_title="لیست قیمت", generated_by_name=generated_by_name)
    ordered = sorted(
        products.select_related("category"),
        key=lambda p: p.category.name if p.category_id else _UNCATEGORIZED,
    )
    ctx["groups"] = [
        {
            "category": category_name,
            "rows": [
                {"sku": product.sku, "name": product.name, "price": format_toman(product.price)}
                for product in group
            ],
        }
        for category_name, group in groupby(
            ordered, key=lambda p: p.category.name if p.category_id else _UNCATEGORIZED
        )
    ]
    return ctx


def render_price_list_pdf(products: QuerySet, *, generated_by_name: str) -> bytes:
    context = build_price_list_context(products, generated_by_name=generated_by_name)
    return render_pdf_async("documents/price_list.html", context)
