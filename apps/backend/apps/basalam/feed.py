"""خروجی محصول متناسب با Salam API باسلام (developers.basalam.com) — شکل
داده دقیقاً مطابق POST /v1/vendors/{vendor_id}/products مستندشده (name,
primary_price به تومان, stock, sku, brief/description). فعلاً فقط خروجی/
اکسپورت است، نه ارسال زنده (apps/orders/providers الگو را دارد اما ارسال
واقعی عکس نیاز به آپلود جدا از طریق POST /v1/files دارد که تا اعتبارنامه‌ی
واقعی باسلام نرسد معنا ندارد -- همان احتیاط بله‌پی/ترب‌پی)."""

from apps.catalog.models import ProductVariant
from apps.public_api.availability import GLOBAL_LOW_STOCK_THRESHOLD
from apps.public_api.serializers import build_product_detail
from apps.public_api.services import PUBLIC_PRODUCT_Q, _product_queryset


def _public_variants():
    return (
        ProductVariant.objects.filter(deleted_at__isnull=True)
        .filter(product__in=_product_queryset().filter(PUBLIC_PRODUCT_Q).values("pk"))
        .select_related("inventory")
        .order_by("id")
    )


def build_items() -> list[dict]:
    variant_rows = list(_public_variants())
    if not variant_rows:
        return []
    products = {
        p.pk: p
        for p in _product_queryset().filter(pk__in={v.product_id for v in variant_rows}).select_related("brand")
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
    name_parts = [product.name]
    if variant["label"]:
        name_parts.append(variant["label"])
    image = detail["images"][0]["url"] if detail["images"] else None
    inventory = getattr(row, "inventory", None)
    stock = max(inventory.available_quantity, 0) if inventory and inventory.available_quantity else 0
    return {
        "sku": row.sku,
        "name": " ".join(name_parts),
        "brief": product.short_description or "",
        "description": product.short_description or product.name,
        "primary_price": int(variant["price"]["final"]),
        "stock": stock,
        "image_url": image,
        "brand": product.brand.name if product.brand else "",
        "is_available": variant["availability"]["status"] in ("IN_STOCK", "LOW_STOCK"),
    }
