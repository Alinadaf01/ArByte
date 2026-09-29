"""D-04 §3 — سبد سمت سرور، روی واریانت. مهمان با هدر X-Cart-Session، کاربر
واردشده با Authorization. قیمت/برچسب همیشه لحظه‌ای از واریانت خوانده می‌شود،
هرگز از کلاینت پذیرفته نمی‌شود (packages/contracts/src/cart/index.ts، §۸.۵۵)."""

import secrets

from apps.catalog.models import ProductVariant
from apps.catalog.pricing import live_price
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
    final_price, compare_at = live_price(variant)
    return {
        "id": str(item.id),
        "variant": {
            "id": str(variant.id),
            "productId": str(product.id),
            "productName": product.name,
            "productSlug": product.slug,
            "label": _variant_label(variant),
            "image": primary_image.url if primary_image else None,
            "price": {"final": final_price, "compareAt": compare_at},
        },
        "quantity": item.quantity,
        "lineTotal": final_price * item.quantity,
    }


def to_cart_response(cart: Cart) -> dict:
    """E-02 §۳ — علاوه بر ردیف‌ها، خلاصه‌ی کامل (تخفیف/ارسال/جمع نهایی) از
    سرور — فرانت هرگز این‌ها را خودش حساب نمی‌کند (قانون ۴). کوپن/روش ارسالِ
    ذخیره‌شده روی سبد هر بار زنده دوباره اعتبارسنجی می‌شود؛ اگر دیگر معتبر
    نبود (منقضی/غیرفعال‌شده)، به‌جای خطا روی GET، خاموش از سبد پاک می‌شود."""
    items = [
        to_cart_item(item)
        for item in cart.items.select_related("variant__product", "variant__inventory").order_by("id")
    ]
    subtotal = sum(i["lineTotal"] for i in items)

    discount_total = 0
    coupon_data = None
    if cart.coupon_id:
        from apps.orders.services import CheckoutError, validate_coupon

        try:
            coupon, discount_total = validate_coupon(cart.coupon.code, cart.user, subtotal)
            coupon_data = {"code": coupon.code, "discountAmount": discount_total}
        except CheckoutError:
            Cart.objects.filter(pk=cart.pk).update(coupon=None)
            cart.coupon = None

    shipping_cost = 0
    shipping_method_data = None
    if cart.shipping_method_id and cart.shipping_method.is_active:
        method = cart.shipping_method
        free_above = method.free_above
        shipping_cost = 0 if free_above is not None and subtotal >= free_above else method.cost
        shipping_method_data = {"id": str(method.id), "name": method.name}
    elif cart.shipping_method_id:
        # روش ارسال بعداً از ادمین غیرفعال شده — همان الگوی کوپن، خاموش پاک شود.
        Cart.objects.filter(pk=cart.pk).update(shipping_method=None)
        cart.shipping_method = None

    final_total = max(subtotal - discount_total + shipping_cost, 0)

    return {
        "id": str(cart.id),
        "items": items,
        "itemCount": sum(i["quantity"] for i in items),
        "subtotal": subtotal,
        "discountTotal": discount_total,
        "coupon": coupon_data,
        "shippingCost": shipping_cost,
        "shippingMethod": shipping_method_data,
        "finalTotal": final_total,
    }


def apply_coupon(cart: Cart, code: str) -> Cart:
    """اعتبارسنجی همان منطق checkout() (validate_coupon) — سقف هر کاربر فقط
    وقتی cart.user موجود باشد چک می‌شود؛ سبد مهمان صرفاً آن بخش را رد می‌کند،
    نه کل اعتبارسنجی را (چک نهایی واقعی هنوز در checkout() است)."""
    from apps.orders.services import validate_coupon

    items = cart.items.select_related("variant").order_by("id")
    subtotal = sum(live_price(item.variant)[0] * item.quantity for item in items)
    validate_coupon(code, cart.user, subtotal)  # raises CheckoutError if invalid — propagates to view

    from apps.content.models import Coupon

    coupon = Coupon.objects.get(code__iexact=code, is_active=True)
    cart.coupon = coupon
    cart.save(update_fields=["coupon", "updated_at"])
    return cart


def remove_coupon(cart: Cart) -> Cart:
    cart.coupon = None
    cart.save(update_fields=["coupon", "updated_at"])
    return cart


def set_shipping_method(cart: Cart, shipping_method_id) -> Cart:
    from apps.settings.models import ShippingMethod

    try:
        method = ShippingMethod.objects.get(pk=shipping_method_id, is_active=True)
    except (ShippingMethod.DoesNotExist, ValueError, TypeError):
        raise ApiError("NOT_FOUND", status=404, message="روش ارسال پیدا نشد.") from None
    cart.shipping_method = method
    cart.save(update_fields=["shipping_method", "updated_at"])
    return cart


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
        # D-05 §۲ — عکس‌فوری قیمت هم روی هر افزودن تازه می‌شود؛ منظور از
        # PRICE_CHANGED «از وقتی این آیتم آخرین‌بار به سبد نگاه شد» است.
        existing.quantity = new_quantity
        existing.unit_price_snapshot = live_price(variant)[0]
        existing.save(update_fields=["quantity", "unit_price_snapshot"])
        return existing
    return CartItem.objects.create(
        cart=cart, variant=variant, quantity=new_quantity, unit_price_snapshot=live_price(variant)[0]
    )


def update_item_quantity(cart: Cart, item_id, quantity: int) -> CartItem:
    try:
        item = CartItem.objects.select_related("variant__inventory").get(pk=item_id, cart=cart)
    except (CartItem.DoesNotExist, ValueError, TypeError):
        raise ApiError("NOT_FOUND", status=404) from None
    _check_quantity_against_stock(item.variant, quantity)
    item.quantity = quantity
    item.unit_price_snapshot = live_price(item.variant)[0]
    item.save(update_fields=["quantity", "unit_price_snapshot"])
    return item


def remove_item(cart: Cart, item_id) -> None:
    CartItem.objects.filter(cart=cart, pk=item_id).delete()
