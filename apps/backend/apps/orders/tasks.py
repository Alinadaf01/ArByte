"""D-05 §۲ — «سفارش پرداخت‌نشده بعد از مدت تنظیم‌پذیر (پیش‌فرض ۲۴ ساعت
برای کارت‌به‌کارت) → CANCELLED + RELEASE موجودی، با Celery beat»."""

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone


@shared_task
def cancel_stale_unpaid_orders() -> int:
    """AWAITING_PAYMENT که از حد مجاز قدیمی‌تر شده را لغو می‌کند — بدون
    برخورد با PAYMENT_REVIEW (رسید در حال بررسی است، خودکار لغو نمی‌شود)."""
    from .models import Order
    from .order_status import InvalidOrderTransition, transition_to

    cutoff = timezone.now() - timezone.timedelta(hours=settings.ORDER_AUTO_CANCEL_AFTER_HOURS)
    stale_orders = Order.objects.filter(status="AWAITING_PAYMENT", created_at__lt=cutoff)

    cancelled = 0
    for order in stale_orders:
        try:
            with transaction.atomic():
                transition_to(order, "CANCELLED", note="PAYMENT_TIMEOUT")
            cancelled += 1
        except InvalidOrderTransition:
            continue
    return cancelled
