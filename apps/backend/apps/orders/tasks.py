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
    now = timezone.now()
    # AUDIT-2 — هرگز سفارشی که پولی از آن گرفته شده (بخش آنلاینِ ترکیبی) یا پرداختش
    # در «بله» در جریان/در انتظار تطبیق است، خودکار لغو نمی‌شود.
    stale_orders = (
        Order.objects.filter(status="AWAITING_PAYMENT", created_at__lt=cutoff, payment_status="UNPAID")
        .exclude(payments__status="CONFIRMED")
        .exclude(payments__bale_sessions__status__in=("PRECHECKOUT_OK", "PAID", "NEEDS_REVIEW"))
        .exclude(
            payments__bale_sessions__status__in=("CREATED", "INVOICE_SENT"),
            payments__bale_sessions__expires_at__gt=now,
        )
        .distinct()
    )

    cancelled = 0
    for order in stale_orders:
        try:
            with transaction.atomic():
                transition_to(order, "CANCELLED", note="PAYMENT_TIMEOUT")
            cancelled += 1
        except InvalidOrderTransition:
            continue
    return cancelled
