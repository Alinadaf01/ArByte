from django.db.models import QuerySet

from .context import base_context
from .tasks import render_pdf_async


def build_stocktake_context(variants: QuerySet, *, generated_by_name: str) -> dict:
    """Physical inventory count sheet — system stock plus a blank column for
    the manual count (BACKEND-TASK.md §3.6-ب: 'صورت موجودی انبار ... ستون
    خالی برای شمارش دستی'). D-02 §۲ — stock lives on Inventory (keyed by
    variant), not Product.stock_count anymore."""
    ctx = base_context(doc_title="صورت موجودی انبار", generated_by_name=generated_by_name)
    ctx["rows"] = [
        {
            "sku": variant.sku,
            "name": variant.product.name + (f" ({variant.name})" if variant.name else ""),
            "category": variant.product.category.name if variant.product.category_id else "",
            "system_stock": variant.inventory.quantity if hasattr(variant, "inventory") else 0,
        }
        for variant in variants.select_related("product__category", "inventory")
    ]
    return ctx


def render_stocktake_pdf(variants: QuerySet, *, generated_by_name: str) -> bytes:
    context = build_stocktake_context(variants, generated_by_name=generated_by_name)
    return render_pdf_async("documents/stocktake.html", context)
