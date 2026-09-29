"""D-05 §۵ — ماشین‌حالت `Return` (مستقل از `Order.status`، §۸.۵۲). ساده‌تر
از order_status.py است (بدون پیامک/SMS طبق سند تسک) اما همان اصل: تنها
راه مجاز تغییر status."""

from django.db import transaction

from .order_status import InvalidOrderTransition

RETURN_STATUS_TRANSITIONS: dict[str, tuple[str, ...]] = {
    "REQUESTED": ("APPROVED", "REJECTED"),
    "APPROVED": ("RECEIVED",),
    "RECEIVED": ("REFUNDED",),
    "REJECTED": (),
    "REFUNDED": (),
}


def is_valid_transition(from_status: str, to_status: str) -> bool:
    return to_status in RETURN_STATUS_TRANSITIONS.get(from_status, ())


@transaction.atomic
def transition_to(return_request, to_status: str, *, admin_note: str = "") -> None:
    """RECEIVED یعنی کالا فیزیکی به انبار برگشته — همان لحظه‌ای که موجودی
    واقعاً باید STOCK_IN شود (نه در APPROVED، که فقط تأیید اداری است)."""
    from apps.inventory.models import Inventory

    from_status = return_request.status
    if not is_valid_transition(from_status, to_status):
        raise InvalidOrderTransition(f"{from_status} -> {to_status} مجاز نیست.")

    if to_status == "RECEIVED":
        for return_item in return_request.items.select_related("order_item__variant").exclude(decision="REJECTED"):
            variant = return_item.order_item.variant
            if variant is not None:
                Inventory.objects.stock_in(
                    variant, return_item.quantity, reference=return_request.order.order_number
                )

    return_request.status = to_status
    if admin_note:
        return_request.admin_note = admin_note
    return_request.save(update_fields=["status", "admin_note", "updated_at"])
