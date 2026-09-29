import secrets

from django.conf import settings as django_settings
from django.db import transaction
from django.utils import timezone

from .models import Cart, CartItem, Order, OrderItem, Payment, PaymentReceipt


@transaction.atomic
def merge_guest_cart_into_user(session_key: str, user) -> None:
    """Called from OtpVerifyView (apps.public_api.auth_views) — 'merge on
    login' means at login, not a separate endpoint the frontend has to
    remember to call (D-04 §۱/§۳)."""
    if not session_key:
        return
    guest_cart = Cart.objects.filter(user=None, session_key=session_key).first()
    if not guest_cart:
        return

    from apps.public_api.cart_service import MAX_ITEM_QUANTITY, available_quantity_for

    user_cart, _ = Cart.objects.get_or_create(user=user)
    for guest_item in guest_cart.items.select_related("variant__inventory"):
        variant = guest_item.variant
        existing = CartItem.objects.filter(cart=user_cart, variant=variant).first()
        merged_quantity = (existing.quantity if existing else 0) + guest_item.quantity
        cap = min(MAX_ITEM_QUANTITY, available_quantity_for(variant))
        merged_quantity = min(merged_quantity, cap)
        if merged_quantity <= 0:
            continue
        if existing:
            existing.quantity = merged_quantity
            existing.unit_price_snapshot = variant.final_price
            existing.save(update_fields=["quantity", "unit_price_snapshot"])
        else:
            CartItem.objects.create(
                cart=user_cart, variant=variant, quantity=merged_quantity, unit_price_snapshot=variant.final_price
            )

    guest_cart.delete()


class CheckoutError(Exception):
    """خطای عمومی چک‌اوت — کد آن مستقیم روی یک ErrorCode قرارداد نگاشت
    می‌شود (لایه‌ی view، apps/public_api/order_views.py)."""

    def __init__(self, code: str, message: str, field: str | None = None):
        self.code = code
        self.message = message
        self.field = field
        super().__init__(message)


class PriceChangedError(Exception):
    """D-05 §۲ — قیمت حداقل یک آیتم از وقتی به سبد افزوده شد عوض شده؛
    سفارش ساخته نمی‌شود، فرانت باید سبد را دوباره نشان دهد."""

    def __init__(self, changes: list[dict]):
        self.changes = changes
        super().__init__("قیمت برخی اقلام تغییر کرده است.")


class InsufficientStockCheckoutError(Exception):
    def __init__(self, shortages: list[dict]):
        self.shortages = shortages
        super().__init__("موجودی برخی اقلام کافی نیست.")


def validate_coupon(code: str, user, subtotal: int) -> tuple["Coupon", int]:  # noqa: F821
    """D-05 §۴ — طبق Prisma: کوپن به کل سبد اعمال می‌شود (بدون محدودسازی
    دسته/محصول — نسخه‌ی قبلی وایب این محدودیت را داشت، حذف شد تا دقیقاً با
    قرارداد یکی باشد، ر.ک. apps/content/models.py's Coupon docstring)."""
    from apps.content.models import Coupon

    try:
        coupon = Coupon.objects.get(code__iexact=code, is_active=True)
    except Coupon.DoesNotExist:
        raise CheckoutError("COUPON_INVALID", "کد تخفیف معتبر نیست.", field="couponCode") from None

    now = timezone.now()
    if coupon.start_date and now < coupon.start_date:
        raise CheckoutError("COUPON_INVALID", "این کد هنوز فعال نشده است.", field="couponCode")
    if coupon.end_date and now > coupon.end_date:
        raise CheckoutError("COUPON_INVALID", "این کد منقضی شده است.", field="couponCode")
    if coupon.is_exhausted():
        raise CheckoutError("COUPON_USAGE_LIMIT_REACHED", "سقف استفاده از این کد پر شده است.", field="couponCode")
    if coupon.minimum_order_amount and subtotal < coupon.minimum_order_amount:
        raise CheckoutError(
            "COUPON_MIN_ORDER_NOT_MET",
            f"حداقل مبلغ سفارش برای این کد {coupon.minimum_order_amount:,} تومان است.",
            field="couponCode",
        )
    if coupon.per_user_limit is not None and user is not None:
        used = coupon.usages.filter(user=user).count()
        if used >= coupon.per_user_limit:
            raise CheckoutError(
                "COUPON_USAGE_LIMIT_REACHED", "شما قبلاً از این کد استفاده کرده‌اید.", field="couponCode"
            )

    if coupon.type == "PERCENT":
        discount = subtotal * (coupon.percent_basis_points or 0) // 10_000
        if coupon.maximum_discount_amount:
            discount = min(discount, coupon.maximum_discount_amount)
    else:
        discount = min(coupon.amount_toman or 0, subtotal)

    return coupon, discount


@transaction.atomic
def checkout(
    *,
    user,
    address,
    payment_method: str,
    shipping_method_id: str | None = None,
    coupon_code: str | None = None,
    idempotency_key: str | None = None,
    invoice_type: str = "PERSONAL",
    company_name: str | None = None,
    national_id: str | None = None,
    economic_code: str | None = None,
    registration_number: str | None = None,
) -> Order:
    """D-05 §۲ / E-02 §۴ — یک تراکنش: قفل Inventory، بررسی موجودی/قیمت،
    ساخت سفارش با snapshot، رزرو موجودی (نه STOCK_OUT — آن در order_status.py
    موقع SHIPPED اتفاق می‌افتد)، خالی‌کردن سبد. قیمت همیشه از واریانت زنده
    خوانده می‌شود؛ `unit_price_snapshot` فقط برای تشخیص PRICE_CHANGED است.

    `idempotency_key`: اگر سفارشی قبلاً با همین (user, key) ساخته شده، همان
    برگردانده می‌شود — بدون لمس دوباره‌ی سبد/موجودی (کلیک دوم روی «ثبت سفارش»
    در شبکه‌ی کند نباید سفارش تکراری بسازد). `shipping_method_id`/`coupon_code`
    وقتی صریح داده نشوند، به انتخاب ذخیره‌شده روی خودِ سبد برمی‌گردند (همان
    چیزی که کاربر در صفحه‌ی سبد انتخاب کرده) — چک‌اوت هرگز مقدار حاضری از
    کلاینت را بدون اعتبارسنجی زنده نمی‌پذیرد."""
    from apps.inventory.models import InsufficientStockError, Inventory
    from apps.settings.models import ShippingMethod

    from . import order_status
    from .models import CouponUsage

    if idempotency_key:
        existing = Order.objects.filter(user=user, idempotency_key=idempotency_key).first()
        if existing:
            return existing

    if invoice_type not in {"PERSONAL", "CORPORATE"}:
        raise CheckoutError("VALIDATION_ERROR", "نوع فاکتور نامعتبر است.", field="invoiceType")
    if invoice_type == "CORPORATE":
        if not company_name or not national_id:
            raise CheckoutError(
                "VALIDATION_ERROR", "برای فاکتور حقوقی، نام شرکت و شناسه ملی الزامی است.", field="companyName"
            )
    else:
        company_name = None
        national_id = None
        economic_code = None
        registration_number = None

    cart = Cart.objects.filter(user=user).first()
    if not cart or not cart.items.exists():
        raise CheckoutError("CART_EMPTY", "سبد خرید شما خالی است.")

    shipping_method = None
    if shipping_method_id:
        shipping_method = ShippingMethod.objects.filter(pk=shipping_method_id, is_active=True).first()
    if not shipping_method and cart.shipping_method_id and cart.shipping_method.is_active:
        shipping_method = cart.shipping_method
    if not shipping_method:
        shipping_method = ShippingMethod.objects.filter(is_active=True).order_by("order", "cost").first()
    if not shipping_method:
        raise CheckoutError("VALIDATION_ERROR", "روش ارسالی در دسترس نیست.", field="shippingMethodId")

    items = list(
        cart.items.select_related("variant__product", "variant__inventory").order_by("id")
    )

    # ترتیب پایدار (بر اساس pk واریانت) برای جلوگیری از deadlock وقتی دو
    # سفارش هم‌زمان چند واریانت مشترک دارند (D-02 §۲: همان الگوی reserve()).
    variant_ids = sorted({item.variant_id for item in items})
    Inventory.objects.select_for_update().filter(variant_id__in=variant_ids).select_related("variant")

    from apps.public_api.cart_service import available_quantity_for

    price_changes: list[dict] = []
    shortages: list[dict] = []
    order_items_data = []
    subtotal = 0
    for item in items:
        variant = item.variant
        live_price = variant.final_price
        if live_price != item.unit_price_snapshot:
            price_changes.append(
                {"variantId": str(variant.id), "oldPrice": item.unit_price_snapshot, "newPrice": live_price}
            )
        available = available_quantity_for(variant)
        if item.quantity > available:
            shortages.append({"variantId": str(variant.id), "available": available})
        final_price = live_price * item.quantity
        subtotal += final_price
        order_items_data.append(
            {
                "variant": variant,
                "unit_price": live_price,
                "quantity": item.quantity,
                "final_price": final_price,
            }
        )

    if price_changes:
        raise PriceChangedError(price_changes)
    if shortages:
        raise InsufficientStockCheckoutError(shortages)

    effective_coupon_code = coupon_code or (cart.coupon.code if cart.coupon_id else None)
    coupon = None
    discount = 0
    if effective_coupon_code:
        coupon, discount = validate_coupon(effective_coupon_code, user, subtotal)

    shipping_cost = shipping_method.cost
    if shipping_method.free_above is not None and subtotal >= shipping_method.free_above:
        shipping_cost = 0

    final_total = subtotal - discount + shipping_cost

    order = Order.objects.create(
        user=user,
        shipping_recipient_name=address.receiver_name,
        shipping_mobile=address.receiver_phone,
        shipping_province=address.province,
        shipping_city=address.city,
        shipping_address_line=address.line,
        shipping_postal_code=address.postal_code,
        subtotal=subtotal,
        discount_total=discount,
        shipping_cost=shipping_cost,
        shipping_method_name=shipping_method.name,
        final_total=final_total,
        invoice_type=invoice_type,
        company_name=company_name,
        national_id=national_id,
        economic_code=economic_code,
        registration_number=registration_number,
        idempotency_key=idempotency_key,
    )

    for data in order_items_data:
        variant = data["variant"]
        product = variant.product
        OrderItem.objects.create(
            order=order,
            variant=variant,
            product_name_snapshot=product.name,
            # نام واریانت (مثلاً «32GB/1TB»)، نه SKU — SKU جای خودش را در
            # sku_snapshot دارد و همه‌ی مصرف‌کننده‌ها (فاکتور، برگه‌ی بسته‌بندی،
            # variantLabel API، کارت گارانتی) این را برچسب واریانت می‌خوانند.
            variant_name_snapshot=variant.name or None,
            sku_snapshot=variant.sku,
            unit_price=data["unit_price"],
            quantity=data["quantity"],
            final_price=data["final_price"],
        )
        try:
            Inventory.objects.reserve(variant, data["quantity"], reference=order.order_number, user=user)
        except InsufficientStockError:
            # بین قفل بالا و همین لحظه رقیبی جلو زد — همان مسیر INSUFFICIENT_STOCK.
            raise InsufficientStockCheckoutError(
                [{"variantId": str(variant.id), "available": available_quantity_for(variant)}]
            ) from None

    if coupon:
        CouponUsage.objects.create(coupon=coupon, user=user, order=order, discount_amount=discount)

    Payment.objects.create(
        order=order,
        method=payment_method,
        amount=final_total,
        status="UNPAID",
    )

    cart.items.all().delete()
    cart.coupon = None
    cart.shipping_method = None
    cart.save(update_fields=["coupon", "shipping_method", "updated_at"])

    order_status.transition_to(order, "AWAITING_PAYMENT", user=user)
    return order


# ---------- کارت‌به‌کارت (§۳) ----------

MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024  # ۵ مگابایت
ALLOWED_RECEIPT_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}


def card_to_card_enabled() -> bool:
    """D-05 §۳ — «خالی = روش کارت‌به‌کارت غیرفعال». اطلاعات حساب مقصد
    (SiteSettings) را ادمین باید پر کند؛ مقدار واقعی اینجا گذاشته نمی‌شود."""
    from apps.settings.models import SiteSettings

    s = SiteSettings.load()
    return bool(s.card_to_card_active and s.card_to_card_holder_name and s.card_to_card_number and s.card_to_card_sheba)


@transaction.atomic
def upload_receipt(*, order: Order, user, file, amount: int) -> PaymentReceipt:
    if order.status != "AWAITING_PAYMENT":
        raise CheckoutError("ORDER_NOT_MODIFIABLE", "این سفارش در وضعیتی نیست که بتوان رسید بارگذاری کرد.")
    if file.size > MAX_RECEIPT_SIZE_BYTES:
        raise CheckoutError("UPLOAD_TOO_LARGE", "حجم فایل بیش از حد مجاز است.")
    if file.content_type not in ALLOWED_RECEIPT_CONTENT_TYPES:
        raise CheckoutError("UPLOAD_INVALID_TYPE", "نوع فایل مجاز نیست.")

    from . import order_status

    payment = order.payments.filter(method="MANUAL_CARD_TO_CARD").order_by("-created_at").first()
    if not payment:
        payment = Payment.objects.create(
            order=order, method="MANUAL_CARD_TO_CARD", amount=order.final_total, status="UNPAID"
        )
    receipt = PaymentReceipt.objects.create(payment=payment, user=user, file=file, amount=amount)

    order_status.sync_payment_status(order, "RECEIPT_UPLOADED")
    payment.status = "RECEIPT_UPLOADED"
    payment.save(update_fields=["status", "updated_at"])
    order_status.transition_to(order, "PAYMENT_REVIEW", user=user)
    return receipt


@transaction.atomic
def approve_receipt(*, receipt: PaymentReceipt, admin_user) -> None:
    from . import order_status

    if receipt.status == "APPROVED":
        raise CheckoutError("PAYMENT_ALREADY_CONFIRMED", "پرداخت این سفارش قبلاً تأیید شده است.")
    receipt.status = "APPROVED"
    receipt.reviewed_by = admin_user
    receipt.reviewed_at = timezone.now()
    receipt.save(update_fields=["status", "reviewed_by", "reviewed_at"])

    payment = receipt.payment
    payment.status = "CONFIRMED"
    payment.save(update_fields=["status", "updated_at"])

    order = payment.order
    order_status.sync_payment_status(order, "CONFIRMED")
    order_status.transition_to(order, "PAID", user=admin_user)


@transaction.atomic
def reject_receipt(*, receipt: PaymentReceipt, admin_user, reason: str) -> None:
    from . import order_status

    receipt.status = "REJECTED"
    receipt.reviewed_by = admin_user
    receipt.reviewed_at = timezone.now()
    receipt.rejection_reason = reason
    receipt.save(update_fields=["status", "reviewed_by", "reviewed_at", "rejection_reason"])

    payment = receipt.payment
    payment.status = "UNPAID"
    payment.save(update_fields=["status", "updated_at"])

    order = payment.order
    order_status.sync_payment_status(order, "UNPAID")
    order_status.transition_to(order, "AWAITING_PAYMENT", user=admin_user, note=f"رسید رد شد: {reason}")


# ---------- درگاه (§۳) ----------


def initiate_payment(*, order: Order, provider_code: str) -> tuple[Payment, str]:
    """Creates/reuses the Payment row only after the gateway itself accepts
    the request — a failed request() call must never leave an orphan Payment
    with no reference behind it."""
    from apps.settings.models import ApiCredential

    from .providers import PAYMENT_PROVIDERS, PaymentProviderError, get_provider

    if order.status != "AWAITING_PAYMENT":
        raise CheckoutError("ORDER_NOT_MODIFIABLE", "این سفارش دیگر قابل پرداخت نیست.")

    provider_class = PAYMENT_PROVIDERS.get(provider_code)
    if not provider_class or not ApiCredential.objects.filter(
        service=provider_class.service, is_active=True
    ).exists():
        raise CheckoutError("GATEWAY_ERROR", "این درگاه در حال حاضر پیکربندی نشده است.", field="provider")

    try:
        provider = get_provider(provider_code)
    except PaymentProviderError as exc:
        raise CheckoutError("GATEWAY_ERROR", str(exc), field="provider") from exc

    callback_token = secrets.token_hex(16)
    callback_url = f"{django_settings.BACKEND_BASE_URL}/api/v1/payments/callback/{provider_code}"

    try:
        result = provider.request(order, callback_url)
    except PaymentProviderError as exc:
        raise CheckoutError("GATEWAY_ERROR", str(exc), field="provider") from exc

    payment = Payment.objects.create(
        order=order,
        method="GATEWAY",
        provider="BALEPAY" if provider_code == "BALEPAY" else "NONE",
        gateway=provider_code,
        amount=order.final_total,
        provider_ref=result.authority or callback_token,
        status="UNDER_REVIEW",
    )
    from . import order_status

    order_status.sync_payment_status(order, "UNDER_REVIEW")
    # تنها راه رسیدن به PAID از PAYMENT_REVIEW می‌گذرد (order_status.py's
    # ORDER_STATUS_TRANSITIONS) — درگاه هم مثل رسید کارت‌به‌کارت باید اول
    # وارد «در حال بررسی» شود، بعد وب‌هوک تأییدش کند.
    order_status.transition_to(order, "PAYMENT_REVIEW")
    return payment, result.redirect_url


@transaction.atomic
def verify_payment(*, provider_code: str, provider_ref: str, amount: int, callback_data: dict) -> Payment:
    """Idempotent by construction: a Payment already CONFIRMED short-circuits
    before any network call — a duplicate/retried callback can never confirm
    an order twice."""
    from . import order_status
    from .providers import PaymentProviderError, get_provider

    try:
        payment = Payment.objects.select_for_update().get(gateway=provider_code, provider_ref=provider_ref)
    except Payment.DoesNotExist:
        raise CheckoutError("NOT_FOUND", "تراکنش یافت نشد.") from None

    if payment.status == "CONFIRMED":
        return payment

    if payment.amount != amount:
        raise CheckoutError("GATEWAY_AMOUNT_MISMATCH", "مبلغ پرداختی با مبلغ سفارش مطابقت ندارد.")

    try:
        provider = get_provider(provider_code)
        result = provider.verify(callback_data, payment)
    except PaymentProviderError as exc:
        payment.provider_payload = {"error": str(exc)}
        payment.save(update_fields=["provider_payload", "updated_at"])
        return payment

    order = payment.order
    if result.success:
        payment.status = "CONFIRMED"
        payment.provider_ref = result.ref_id or payment.provider_ref
        payment.provider_payload = result.raw_response
        payment.save(update_fields=["status", "provider_ref", "provider_payload", "updated_at"])
        order_status.sync_payment_status(order, "CONFIRMED")
        order_status.transition_to(order, "PAID")
    else:
        payment.provider_payload = result.raw_response
        payment.save(update_fields=["provider_payload", "updated_at"])
    return payment
