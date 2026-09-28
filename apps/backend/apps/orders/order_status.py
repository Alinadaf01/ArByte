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

# پیامک هر گذار — SmsTemplate.key معادل (apps/notifications). گذارهایی که
# اینجا نیستند پیامک نمی‌فرستند (مثلاً PENDING->AWAITING_PAYMENT، چون هنوز
# اتفاق قابل‌اطلاع‌رسانی برای مشتری نیست).
_SMS_TEMPLATE_BY_TRANSITION: dict[tuple[str, str], str] = {
    ("AWAITING_PAYMENT", "PAYMENT_REVIEW"): "order_payment_review",
    ("PAYMENT_REVIEW", "PAID"): "order_paid",
    ("PAID", "PROCESSING"): "order_processing",
    ("PROCESSING", "READY_TO_SHIP"): "order_ready_to_ship",
    ("READY_TO_SHIP", "SHIPPED"): "order_shipped",
    ("SHIPPED", "DELIVERED"): "order_delivered",
    (None, "CANCELLED"): "order_cancelled",
}


class InvalidOrderTransition(Exception):
    pass


def is_valid_transition(from_status: str, to_status: str) -> bool:
    return to_status in ORDER_STATUS_TRANSITIONS.get(from_status, ())


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

    if to_status == "CANCELLED" and from_status in _RESERVED_STATUSES:
        for item in order.items.select_related("variant").filter(variant__isnull=False):
            Inventory.objects.release(item.variant, item.quantity, reference=order.order_number, user=user)

    now = timezone.now()
    update_fields = ["status", "updated_at"]
    order.status = to_status

    if to_status == "PAID":
        order.paid_at = now
        update_fields.append("paid_at")
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

    template_key = _SMS_TEMPLATE_BY_TRANSITION.get((from_status, to_status)) or _SMS_TEMPLATE_BY_TRANSITION.get(
        (None, to_status)
    )
    if template_key:
        transaction.on_commit(
            lambda: NotificationService.send_sms(
                order.shipping_mobile, template_key, {"orderNumber": order.order_number}
            )
        )


def sync_payment_status(order, payment_status: str) -> None:
    """تصمیم ب (T-003) — تنها راه تغییر Order.payment_status. هرگز مستقیم
    `order.payment_status = ...` نکنید؛ فراخوان‌ها (receipt/گیت‌وی) این را
    صدا می‌زنند، نه برعکس (Order.status هرگز از این تابع تغییر نمی‌کند)."""
    order.payment_status = payment_status
    order.save(update_fields=["payment_status", "updated_at"])
