"""AUDIT §۱۲.۱۳–۱۲.۱۵ — سریال → ارسال → کارت گارانتی، اتمیک.

یک منبع برای همان endpointهای موجود پنل (transition/serials/mark-shipped)؛
endpoint تازه‌ای ساخته نمی‌شود. همه‌ی نوشتن‌ها زیر قفل ردیف سفارش
(`select_for_update`) و در یک تراکنش‌اند: یا کل تغییر ثبت می‌شود یا هیچ.
"""

from django.db import IntegrityError, transaction
from django.db.models import Count
from django.db.models.functions import Upper
from django.utils import timezone

from . import order_status
from .models import Order, OrderItemUnit, Shipment
from .order_status import InvalidOrderTransition


class FulfilmentError(Exception):
    """خطای قابل‌نمایش به ادمین (۴۰۰)، بدون هیچ تغییر نیمه‌کاره."""


def ensure_units(order: Order) -> None:
    """برای هر قلم دقیقاً `quantity` ردیف OrderItemUnit (کمبود ساخته می‌شود).

    قبلاً فقط باز کردن فرم Django admin ردیف می‌ساخت؛ در پنل سفارش تازه
    هیچ واحدی نداشت، کارت سریال نمایش داده نمی‌شد و READY_TO_SHIP برای
    کالای سریال‌دار عملاً قفل بود. فراخواننده باید در تراکنش با قفل سفارش باشد.
    """
    items = order.items.annotate(unit_count=Count("units"))
    missing = [
        OrderItemUnit(order_item=item) for item in items for _ in range(max(0, item.quantity - item.unit_count))
    ]
    for unit in missing:
        unit.save()  # certificate_id پیش‌فرض تصادفی/یکتا هر ردیف — نه bulk_create با default مشترک


@transaction.atomic
def set_serials(order_pk: int, rows: list[dict], *, editable_statuses: set[str]) -> Order:
    """همه‌ی ردیف‌ها اول اعتبارسنجی، بعد با هم ذخیره؛ یکتایی سریال (بدون حساسیت
    به حروف) هم در همین درخواست و هم در کل دیتابیس."""
    order = Order.objects.select_for_update().get(pk=order_pk)
    if order.status not in editable_statuses:
        raise FulfilmentError("سریال فقط در وضعیت پرداخت‌شده یا در حال پردازش قابل ثبت است.")
    ensure_units(order)
    units = {u.pk: u for u in OrderItemUnit.objects.filter(order_item__order=order)}

    changes: dict[int, str | None] = {}
    for row in rows:
        try:
            unit_id = int(row.get("id", 0) or 0)
        except (TypeError, ValueError):
            unit_id = 0
        if unit_id not in units:
            raise FulfilmentError("واحد متعلق به این سفارش نیست.")
        changes[unit_id] = str(row.get("serial_number", "") or "").strip() or None

    final = {pk: changes.get(pk, unit.serial_number or None) for pk, unit in units.items()}
    seen: set[str] = set()
    for serial in filter(None, final.values()):
        if serial.upper() in seen:
            raise FulfilmentError(f"سریال «{serial}» در این سفارش تکراری است.")
        seen.add(serial.upper())
    new_serials = {s.upper() for pk, s in changes.items() if s}
    if new_serials:
        clash = (
            OrderItemUnit.objects.annotate(serial_upper=Upper("serial_number"))
            .filter(serial_upper__in=new_serials)
            .exclude(pk__in=units.keys())
            .values_list("serial_number", flat=True)
            .first()
        )
        if clash:
            raise FulfilmentError(f"سریال «{clash}» قبلاً برای سفارش دیگری ثبت شده است.")

    for pk, serial in changes.items():
        units[pk].serial_number = serial
    try:
        with transaction.atomic():
            OrderItemUnit.objects.bulk_update([units[pk] for pk in changes], ["serial_number"])
    except IntegrityError as exc:  # رقابت هم‌زمان با یک ثبت دیگر — قید یکتای دیتابیس
        raise FulfilmentError("این سریال هم‌زمان برای واحد دیگری ثبت شد؛ دوباره تلاش کنید.") from exc
    return order


@transaction.atomic
def ship_order(order_pk: int, *, provider: str, tracking_number: str, tracking_url: str | None, user, note: str = "") -> Order:
    """Shipment و گذار SHIPPED با هم؛ اگر گذار مجاز نباشد یا سریال کم باشد
    هیچ Shipment نیمه‌کاره‌ای نمی‌ماند (قبلاً Shipment پیش از بررسی گذار
    ساخته/بازنویسی می‌شد)."""
    order = Order.objects.select_for_update().get(pk=order_pk)
    if not order_status.is_valid_transition(order.status, "SHIPPED"):
        raise InvalidOrderTransition(f"{order.status} -> SHIPPED مجاز نیست.")
    Shipment.objects.update_or_create(
        order=order,
        defaults={
            "provider": provider,
            "cost": order.shipping_cost,
            "tracking_number": tracking_number,
            "tracking_url": tracking_url or None,
            "shipped_at": timezone.now(),
        },
    )
    order_status.transition_to(order, "SHIPPED", user=user, note=note)
    return order
