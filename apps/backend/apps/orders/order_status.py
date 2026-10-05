"""D-05 §۱ — عیناً packages/contracts/src/order/status-transitions.ts's
ORDER_STATUS_TRANSITIONS. تنها راه مجاز تغییر Order.status از اینجا
می‌گذرد؛ گذار نامعتبر InvalidOrderTransition می‌اندازد (روی
apps/public_api/errors.py's ApiError("INVALID_STATUS_TRANSITION") map
می‌شود، نه اینجا — این ماژول از پوسته‌ی HTTP مستقل است، هم‌الگوی
apps/api/src/orders/order-status.service.ts در سمت Nest)."""

from django.db import transaction
from django.utils import timezone

ORDER_STATUS_TRANSITIONS: dict[str, tuple[str, ...]] = {
    "PENDING": ("AWAITING_PAYMENT", "CANCELLED"),
    "AWAITING_PAYMENT": ("PAYMENT_REVIEW", "CANCELLED"),
    # PAYMENT_REVIEW -> AWAITING_PAYMENT یعنی رسید رد شد، کاربر باید دوباره پرداخت کند.
    "PAYMENT_REVIEW": ("PAID", "AWAITING_PAYMENT", "CANCELLED"),
    "PAID": ("PROCESSING", "CANCELLED"),
    "PROCESSING": ("READY_TO_SHIP", "CANCELLED"),
    "READY_TO_SHIP": ("SHIPPED",),
    "SHIPPED": ("DELIVERED",),
    # پایانی — مرجوعی از طریق موجودیت Return است، نه تغییر Order.status.
    "DELIVERED": (),
    "CANCELLED": (),
}

# وضعیت‌هایی که رزرو موجودی هنوز باز است (RELEASE لازم دارند اگر لغو شوند).
_RESERVED_STATUSES = {"PENDING", "AWAITING_PAYMENT", "PAYMENT_REVIEW", "PAID", "PROCESSING", "READY_TO_SHIP"}

# پیامک هر گذار — SmsTemplate.key معادل (apps/notifications). E-03 §۲: فقط
# چهار الگوی واقعی («سه گیرنده‌ی مشتری + یک مدیر») فعال‌اند؛ گذارهای دیگر
# (PROCESSING، READY_TO_SHIP، DELIVERED، CANCELLED) دیگر پیامک نمی‌فرستند —
# هفت قالب قبلی D-05 در دیتابیس غیرفعال ماندند (migration
# 0005_e03_kavenegar_templates)، نه اینجا حذف شدند.
_SMS_TEMPLATE_BY_TRANSITION: dict[tuple[str, str], str] = {
    ("PAYMENT_REVIEW", "PAID"): "order_confirmed",
    ("READY_TO_SHIP", "SHIPPED"): "order_shipped",
}


class InvalidOrderTransition(Exception):
    pass


class MissingSerialNumbers(Exception):
    """E-03 §۳ — گذار به READY_TO_SHIP بدون سریال برای قلمی که
    requires_serial=True دارد. `order_item_ids` برای پیام خطای دقیق در
    لایه‌ی view (کدام قلم‌ها کم دارند)."""

    def __init__(self, order_item_ids: list[int]):
        self.order_item_ids = order_item_ids
        super().__init__("برای برخی اقلام این سفارش هنوز سریال ثبت نشده است.")


def is_valid_transition(from_status: str, to_status: str) -> bool:
    return to_status in ORDER_STATUS_TRANSITIONS.get(from_status, ())


def _missing_serial_item_ids(order) -> list[int]:
    missing = []
    for item in order.items.select_related("variant__product").prefetch_related("units"):
        if not item.variant or not item.variant.product.requires_serial:
            continue
        serialed_count = sum(1 for u in item.units.all() if u.serial_number)
        if serialed_count < item.quantity:
            missing.append(item.id)
    return missing


@transaction.atomic
def transition_to(order, to_status: str, *, user=None, note: str = "") -> None:
    """تنها راه مجاز تغییر Order.status. CANCELLED از هر وضعیتِ رزرو-باز
    مجاز است (نه فقط جدول بالا که فقط از دو-سه وضعیت مشخص اجازه می‌دهد —
    در واقع جدول *همه‌ی* آن‌ها را صریح فهرست کرده، پس این تابع فقط خودِ
    جدول را می‌خواند، تفسیر اضافه ندارد)."""
    from apps.inventory.models import Inventory
    from apps.notifications.services import NotificationService

    from_status = order.status
    if not is_valid_transition(from_status, to_status):
        raise InvalidOrderTransition(f"{from_status} -> {to_status} مجاز نیست.")

    if to_status == "READY_TO_SHIP":
        missing = _missing_serial_item_ids(order)
        if missing:
            raise MissingSerialNumbers(missing)

    if to_status == "CANCELLED" and from_status in _RESERVED_STATUSES:
        for item in order.items.select_related("variant").filter(variant__isnull=False):
            Inventory.objects.release(item.variant, item.quantity, reference=order.order_number, user=user)

    now = timezone.now()
    update_fields = ["status", "updated_at"]
    order.status = to_status
    notify_admin = False

    if to_status == "PAYMENT_REVIEW" and order.admin_notified_at is None:
        # E-03 §۲ — «هر کدام زودتر، یک بار». تنها راه رسیدن به PAID از
        # PAYMENT_REVIEW می‌گذرد، پس همیشه همین‌جا اولین بار اتفاق می‌افتد؛
        # پرچم admin_notified_at جلوی تکرار را می‌گیرد اگر رسید رد شد و
        # سفارش دوباره به PAYMENT_REVIEW برگشت.
        order.admin_notified_at = now
        update_fields.append("admin_notified_at")
        notify_admin = True
    if to_status == "PAID":
        order.paid_at = now
        update_fields.append("paid_at")
        # AUDIT §۱۲.۱۴ — واحدهای سریال/کارت گارانتی در همین تراکنش ساخته می‌شوند.
        from .fulfilment import ensure_units

        ensure_units(order)
    elif to_status == "SHIPPED":
        for item in order.items.select_related("variant").filter(variant__isnull=False):
            Inventory.objects.release(item.variant, item.quantity, reference=order.order_number, user=user)
            Inventory.objects.stock_out(item.variant, item.quantity, reference=order.order_number, user=user)
        order.shipped_at = now
        update_fields.append("shipped_at")
        # Shipment باید قبل از این فراخوانی با اطلاعات رهگیری ساخته شده باشد
        # (لایه‌ی ادمین) — نبودش یعنی خطای برنامه بالاتر، نه یک حالت عادی
        # این‌جا که باید بی‌صدا نادیده گرفته شود.
        order.shipment.shipped_at = now
        order.shipment.save(update_fields=["shipped_at"])
    elif to_status == "DELIVERED":
        order.delivered_at = now
        update_fields.append("delivered_at")
        order.shipment.delivered_at = now
        order.shipment.save(update_fields=["delivered_at"])
    elif to_status == "CANCELLED":
        order.cancel_reason = note or order.cancel_reason
        update_fields.append("cancel_reason")

    order.save(update_fields=update_fields)
    order.status_history.create(from_status=from_status, to_status=to_status, changed_by=user, note=note)

    template_key = _SMS_TEMPLATE_BY_TRANSITION.get((from_status, to_status))
    if template_key:
        context = _sms_context_for(template_key, order)
        transaction.on_commit(
            lambda: NotificationService.send_sms(order.shipping_mobile, template_key, context)
        )
    if notify_admin:
        transaction.on_commit(lambda: _notify_admins_new_order(order))


def _sms_context_for(template_key: str, order) -> dict:
    from apps.notifications.formatting import first_name_fa

    if template_key == "order_confirmed":
        return {
            "orderNumber": order.order_number,
            "firstName": first_name_fa(order.shipping_recipient_name),
        }
    if template_key == "order_shipped":
        shipment = getattr(order, "shipment", None)
        return {
            "orderNumber": order.order_number,
            "trackingCode": shipment.tracking_number if shipment else "",
            "postalCode": order.shipping_postal_code or "",
            "carrierName": shipment.provider if shipment else "",
        }
    return {"orderNumber": order.order_number}


def _notify_admins_new_order(order) -> None:
    from apps.notifications.formatting import format_money_fa, full_name_fa
    from apps.notifications.services import NotificationService
    from apps.settings.models import SiteSettings

    context = {
        "orderNumber": order.order_number,
        "amount": format_money_fa(order.final_total),
        "customerName": full_name_fa(order.shipping_recipient_name),
    }
    for phone in SiteSettings.load().owner_notification_phone_list:
        NotificationService.send_sms(phone, "order_new_admin", context)


def sync_payment_status(order, payment_status: str) -> None:
    """تصمیم ب (T-003) — تنها راه تغییر Order.payment_status. هرگز مستقیم
    `order.payment_status = ...` نکنید؛ فراخوان‌ها (receipt/گیت‌وی) این را
    صدا می‌زنند، نه برعکس (Order.status هرگز از این تابع تغییر نمی‌کند)."""
    order.payment_status = payment_status
    order.save(update_fields=["payment_status", "updated_at"])
