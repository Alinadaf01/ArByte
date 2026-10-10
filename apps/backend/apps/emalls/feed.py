"""راهنمای ایجاد صفحه معرفی محصولات به ایمالز (سند کاربر، attachment_1256625)
— GET/POST با `page`/`item_per_page`، بدون احراز هویت. هر آیتم یک واریانت
قابل‌فروش (نه فقط محصول) تا ایمالز پیکربندی‌های مختلف یک محصول را هم مثل
ترب ببیند — از همان منابع فروشگاه (build_product_detail، live_price با
کمپین، compute_availability)، زنده از دیتابیس، بدون کش."""

from django.conf import settings

from apps.catalog.models import ProductVariant
from apps.public_api.availability import GLOBAL_LOW_STOCK_THRESHOLD
from apps.public_api.serializers import build_product_detail
from apps.public_api.services import PUBLIC_PRODUCT_Q, _product_queryset

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 500
_AVAILABLE = ("IN_STOCK", "LOW_STOCK")


def _absolute(path_or_url: str) -> str:
    if path_or_url.startswith(("http://", "https://")):
        return path_or_url
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}/{path_or_url.lstrip('/')}"


def _public_variants():
    """واریانت‌های قابل‌فروش محصولات عمومی؛ حذف/پنهان‌شده هرگز در خروجی نیست."""
    return (
        ProductVariant.objects.filter(deleted_at__isnull=True)
        .filter(product__in=_product_queryset().filter(PUBLIC_PRODUCT_Q).values("pk"))
        .order_by("id")
    )


def _int_param(params, name: str, default: int) -> int:
    raw = params.get(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


def parse_pagination(params) -> tuple[int, int]:
    page = max(1, _int_param(params, "page", 1))
    item_per_page = _int_param(params, "item_per_page", DEFAULT_PAGE_SIZE)
    item_per_page = min(max(1, item_per_page), MAX_PAGE_SIZE)
    return page, item_per_page


def build_items(variant_rows: list) -> list[dict]:
    if not variant_rows:
        return []
    products = {
        p.pk: p
        for p in _product_queryset()
        .filter(pk__in={v.product_id for v in variant_rows})
        .select_related("brand", "category")
    }
    details = {pk: build_product_detail(p, GLOBAL_LOW_STOCK_THRESHOLD) for pk, p in products.items()}

    items = []
    for row in variant_rows:
        product = products.get(row.product_id)
        if product is None:
            continue
        detail = details[row.product_id]
        variant = next((v for v in detail["variants"] if v["id"] == str(row.pk)), None)
        if variant is None:
            continue
        items.append(_item(product, detail, variant, row))
    return items


def _item(product, detail: dict, variant: dict, row) -> dict:
    final = int(variant["price"]["final"])
    compare_at = variant["price"].get("compareAt")
    image = detail["images"][0]["url"] if detail["images"] else None

    item = {
        "id": str(row.pk),
        "title": " ".join(p for p in (product.name, variant["label"]) if p),
        "price": final,
        "category": detail["category"]["name"],
        "image": _absolute(image) if image else "",
        "is_available": variant["availability"]["status"] in _AVAILABLE,
        "url": _absolute(f"/products/{product.slug}?v={row.pk}"),
    }
    if compare_at and compare_at > final:
        item["old_price"] = int(compare_at)
    if product.warranty_months:
        item["guarantee"] = f"{product.warranty_months} ماه {product.warranty_provider or 'گارانتی'}"
    return item


def run(page: int, item_per_page: int) -> dict:
    qs = _public_variants()
    total = qs.count()
    pages_count = max(1, -(-total // item_per_page))  # سقف تقسیم بدون import اضافه
    rows = list(qs[(page - 1) * item_per_page : page * item_per_page])
    return {
        "success": True,
        "products": build_items(rows),
        "total_items": total,
        "pages_count": pages_count,
        "item_per_page": item_per_page,
        "page_num": page,
    }
