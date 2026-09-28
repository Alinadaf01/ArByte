"""D-04 §3 — سبد سمت سرور، روی واریانت. مهمان با هدر X-Cart-Session، کاربر
واردشده با Authorization. قیمت/برچسب همیشه لحظه‌ای از واریانت خوانده می‌شود،
هرگز از کلاینت پذیرفته نمی‌شود (packages/contracts/src/cart/index.ts، §۸.۵۵)."""

import secrets

from apps.catalog.models import ProductVariant
from apps.orders.models import Cart, CartItem

from .errors import ApiError
from .serializers import spec_value_of
from .variant import build_variant_label

CART_SESSION_HEADER = "X-Cart-Session"
MAX_ITEM_QUANTITY = 5


def available_quantity_for(variant: ProductVariant) -> int:
    """Preorder variants are always purchasable regardless of stock — same
    rule as apps/public_api/availability.py's compute_availability()."""
    if variant.is_preorder:
        return MAX_ITEM_QUANTITY
    inventory = getattr(variant, "inventory", None)
    if inventory is None:
        return 0
    return max(inventory.available_quantity or 0, 0)


def resolve_cart(request) -> tuple[Cart, str | None]:
    """Returns (cart, session_key). session_key is non-None only for guest
    carts — the caller must echo it back via the X-Cart-Session response
    header (CORS_EXPOSE_HEADERS already allows it, config/settings.py)."""
    if request.user and request.user.is_authenticated:
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return cart, None

    session_key = request.headers.get(CART_SESSION_HEADER) or ""
    cart = Cart.objects.filter(user__isnull=True, session_key=session_key).first() if session_key else None
    if not cart:
        session_key = secrets.token_urlsafe(24)
        cart = Cart.objects.create(session_key=session_key)
    return cart, session_key


def _variant_label(variant: ProductVariant) -> str:
    specs = (
        variant.specifications.filter(definition__is_variant_axis=True)
        .select_related("definition", "value")
        .order_by("definition__sort_order")
    )
    axis_values: dict[str, str] = {}
    axis_refs: list[dict] = []
    for spec in specs:
        value = spec_value_of(spec)
        if value:
            axis_values[str(spec.definition_id)] = value
            axis_refs.append({"specDefId": str(spec.definition_id)})
    return build_variant_label(axis_values, axis_refs)


def to_cart_item(item: CartItem) -> dict:
    variant = item.variant
    product = variant.product
    primary_image = product.images.filter(is_primary=True).first() or product.images.order_by("sort_order").first()
    return {
        "id": str(item.id),
        "variant": {
            "id": str(variant.id),
            "productId": str(product.id),
            "productName": product.name,
            "productSlug": product.slug,
            "label": _variant_label(variant),
            "image": primary_image.url if primary_image else None,
            "price": {"final": variant.final_price, "compareAt": variant.compare_at_price},
        },
        "quantity": item.quantity,
        "lineTotal": variant.final_price * item.quantity,
    }


def to_cart_response(cart: Cart) -> dict:
    items = [
        to_cart_item(item)
        for item in cart.items.select_related("variant__product", "variant__inventory").order_by("id")
    ]
    return {
        "id": str(cart.id),
        "items": items,
        "itemCount": sum(i["quantity"] for i in items),
        "subtotal": sum(i["lineTotal"] for i in items),
    }


def _get_live_variant(variant_id) -> ProductVariant:
    try:
        return ProductVariant.objects.select_related("inventory", "product").get(
            pk=variant_id, deleted_at__isnull=True
        )
    except (ProductVariant.DoesNotExist, ValueError, TypeError):
        raise ApiError("VARIANT_NOT_FOUND", status=404) from None


def _check_quantity_against_stock(variant: ProductVariant, quantity: int) -> None:
    if quantity < 1 or quantity > MAX_ITEM_QUANTITY:
        raise ApiError(
            "VALIDATION_ERROR", status=400, field_errors={"quantity": "تعداد باید بین ۱ تا ۵ باشد."}
        )
    available = available_quantity_for(variant)
    if available <= 0:
        raise ApiError("VARIANT_UNAVAILABLE", status=409)
    if quantity > available:
        raise ApiError("INSUFFICIENT_STOCK", status=409)


def add_item(cart: Cart, variant_id, quantity: int) -> CartItem:
    variant = _get_live_variant(variant_id)
    existing = CartItem.objects.filter(cart=cart, variant=variant).first()
    new_quantity = (existing.quantity if existing else 0) + quantity
    _check_quantity_against_stock(variant, new_quantity)
    if existing:
        existing.quantity = new_quantity
        existing.save(update_fields=["quantity"])
        return existing
    return CartItem.objects.create(cart=cart, variant=variant, quantity=new_quantity)


def update_item_quantity(cart: Cart, item_id, quantity: int) -> CartItem:
    try:
        item = CartItem.objects.select_related("variant__inventory").get(pk=item_id, cart=cart)
    except (CartItem.DoesNotExist, ValueError, TypeError):
        raise ApiError("NOT_FOUND", status=404) from None
    _check_quantity_against_stock(item.variant, quantity)
    item.quantity = quantity
    item.save(update_fields=["quantity"])
    return item


def remove_item(cart: Cart, item_id) -> None:
    CartItem.objects.filter(cart=cart, pk=item_id).delete()
