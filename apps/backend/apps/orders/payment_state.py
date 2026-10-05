"""AUDIT-2 — سه روش پرداخت و تنها منبع وضعیت پرداخت سفارش.

- «پرداخت آنلاین» (بله‌پی) فقط تا سقف `SiteSettings.online_payment_limit_rial`.
- «واریز مستقیم به حساب» (کارت‌به‌کارت + رسید + تأیید ادمین).
- «پرداخت ترکیبی»: فقط وقتی جمع سفارش از سقف بیشتر است؛ آنلاین = سقف، باقی واریز.

هر سفارش چند `Payment` دارد (ترکیب سفارش)؛ `reconcile_order_payments` از روی
همان‌ها `Order.payment_status` و گذار `Order.status` را تعیین می‌کند. سفارش فقط
وقتی PAID است که مجموع پرداخت‌های تأییدشده به جمع سفارش برسد — پرداخت آنلاینِ
بخشی هرگز کل سفارش را پرداخت‌شده نمی‌کند.
"""

from dataclasses import dataclass

from django.db import transaction
from django.utils import timezone

from .models import Order, Payment

# فاکتور بله ریالی است؛ پول داخل سایت تومان. تبدیل فقط همین‌جا.
TOMAN_TO_RIAL = 10

PLAN_ONLINE = "ONLINE"
PLAN_BANK = "BANK_TRANSFER"
PLAN_COMBINED = "COMBINED"

METHOD_ONLINE = "GATEWAY"
METHOD_BANK = "MANUAL_CARD_TO_CARD"

# روش‌های قبلی قرارداد → طرح جدید (کلاینت قدیمی تا جلسه‌ی ۳ همان‌ها را می‌فرستد).
LEGACY_METHOD_TO_PLAN = {METHOD_BANK: PLAN_BANK, METHOD_ONLINE: PLAN_ONLINE}

_PAYMENT_PHASE = {"AWAITING_PAYMENT", "PAYMENT_REVIEW"}


class PaymentPlanError(Exception):
    def __init__(self, code: str, message: str, status: int = 409):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def online_limit_rial() -> int:
    from apps.settings.models import SiteSettings

    return SiteSettings.load().online_payment_limit_rial


def online_limit_toman() -> int:
    return online_limit_rial() // TOMAN_TO_RIAL


def online_enabled() -> bool:
    from .balepay.config import load_config

    return load_config().ready


def bank_enabled() -> bool:
    from .services import card_to_card_enabled

    return card_to_card_enabled()


@dataclass(frozen=True)
class PlanOption:
    plan: str
    available: bool
    reason: str = ""
    online_amount: int = 0
    bank_amount: int = 0


def plan_options(total: int) -> list[PlanOption]:
    """گزینه‌های چک‌اوت برای جمع سفارش — همیشه سمت سرور حساب می‌شود."""
    limit = online_limit_toman()
    online_ok, bank_ok = online_enabled(), bank_enabled()
    over_limit = total > limit
    options = []

    if not online_ok:
        options.append(PlanOption(PLAN_ONLINE, False, "پرداخت آنلاین در حال حاضر فعال نیست."))
    elif over_limit:
        options.append(PlanOption(PLAN_ONLINE, False, "پرداخت آنلاین برای مبالغ تا سقف مجاز در دسترس است."))
    else:
        options.append(PlanOption(PLAN_ONLINE, True, online_amount=total))

    options.append(
        PlanOption(PLAN_BANK, bank_ok, "" if bank_ok else "واریز مستقیم در حال حاضر فعال نیست.", bank_amount=total)
    )

    if online_ok and bank_ok and over_limit:
        options.append(PlanOption(PLAN_COMBINED, True, online_amount=limit, bank_amount=total - limit))
    else:
        reason = "فقط برای مبالغ بیشتر از سقف پرداخت آنلاین." if not over_limit else "در حال حاضر فعال نیست."
        options.append(PlanOption(PLAN_COMBINED, False, reason))
    return options


def split_for_plan(plan: str, total: int) -> list[tuple[str, int]]:
    """[(method, amount)] برای ساخت Paymentها؛ نامعتبر = PaymentPlanError (سرور اجبار می‌کند)."""
    option = next((o for o in plan_options(total) if o.plan == plan), None)
    if option is None:
        raise PaymentPlanError("VALIDATION_ERROR", "روش پرداخت نامعتبر است.", status=400)
    if not option.available:
        code = (
            "ONLINE_PAYMENT_LIMIT_EXCEEDED"
            if plan == PLAN_ONLINE and online_enabled() and total > online_limit_toman()
            else "GATEWAY_ERROR"
        )
        raise PaymentPlanError(code, option.reason)
    if plan == PLAN_ONLINE:
        return [(METHOD_ONLINE, total)]
    if plan == PLAN_BANK:
        return [(METHOD_BANK, total)]
    return [(METHOD_ONLINE, option.online_amount), (METHOD_BANK, option.bank_amount)]


def create_payments(order: Order, plan: str) -> list[Payment]:
    payments = []
    for method, amount in split_for_plan(plan, order.final_total):
        payments.append(
            Payment.objects.create(
                order=order,
                method=method,
                provider="BALEPAY" if method == METHOD_ONLINE else "NONE",
                gateway="BALEPAY" if method == METHOD_ONLINE else None,
                amount=amount,
                status="UNPAID",
            )
        )
    order.payment_plan = plan
    order.save(update_fields=["payment_plan", "updated_at"])
    return payments


def active_payments(order: Order) -> list[Payment]:
    return [p for p in order.payments.all().order_by("pk") if p.status != "VOID"]


def breakdown(order: Order) -> dict:
    """ترکیب پرداخت برای پنل و صفحه‌ی سفارش (AUDIT.md §۶)."""
    payments = active_payments(order)
    paid = sum(p.amount for p in payments if p.status == "CONFIRMED")
    return {
        "plan": order.payment_plan,
        "total": order.final_total,
        "paid": paid,
        "remaining": max(order.final_total - paid, 0),
        "onlinePaid": sum(p.amount for p in payments if p.is_online and p.status == "CONFIRMED"),
        "bankPaid": sum(p.amount for p in payments if not p.is_online and p.status == "CONFIRMED"),
    }


@transaction.atomic
def reconcile_order_payments(order: Order, *, user=None, note: str = "") -> None:
    """تنها جای تعیین وضعیت پرداخت سفارش از روی Paymentها."""
    from . import order_status

    order = Order.objects.select_for_update().get(pk=order.pk)
    payments = active_payments(order)
    confirmed = sum(p.amount for p in payments if p.status == "CONFIRMED")
    receipt_pending = any(p.status == "RECEIPT_UPLOADED" for p in payments)
    gateway_review = any(p.status == "UNDER_REVIEW" for p in payments)

    if payments and confirmed >= order.final_total and all(p.status == "CONFIRMED" for p in payments):
        payment_status, target = "CONFIRMED", "PAID"
    elif receipt_pending:
        payment_status = "PARTIALLY_PAID" if confirmed else "RECEIPT_UPLOADED"
        target = "PAYMENT_REVIEW"
    elif gateway_review:  # مسیر قدیمی درگاه‌های redirect (initiate_payment)
        payment_status, target = "UNDER_REVIEW", "PAYMENT_REVIEW"
    else:
        payment_status = "PARTIALLY_PAID" if confirmed else "UNPAID"
        target = "AWAITING_PAYMENT"

    if order.payment_status != payment_status:
        order_status.sync_payment_status(order, payment_status)
    if order.status not in _PAYMENT_PHASE or order.status == target:
        return
    if target == "PAID" and order.status == "AWAITING_PAYMENT":
        # FSM فقط از PAYMENT_REVIEW به PAID می‌رود.
        order_status.transition_to(order, "PAYMENT_REVIEW", user=user, note=note)
    order_status.transition_to(order, target, user=user, note=note)


@transaction.atomic
def confirm_payment(payment: Payment, *, provider_ref: str = "", user=None, note: str = "") -> Payment:
    payment = Payment.objects.select_for_update().get(pk=payment.pk)
    if payment.status == "CONFIRMED":
        return payment
    payment.status = "CONFIRMED"
    payment.paid_at = timezone.now()
    if provider_ref:
        payment.provider_ref = provider_ref
    payment.failure_reason = ""
    payment.save(update_fields=["status", "paid_at", "provider_ref", "failure_reason", "updated_at"])
    reconcile_order_payments(payment.order, user=user, note=note)
    return payment


@transaction.atomic
def move_online_remainder_to_bank(order: Order, *, user=None) -> Payment:
    """پرداخت آنلاین ناموفق (مثلاً سقف روزانه‌ی ۱۵ میلیونی بله در همه‌ی
    پذیرنده‌ها، که سرور ما نمی‌بیند) → باقی‌مانده به واریز مستقیم. سفارش باز
    می‌ماند؛ بخش آنلاینِ پرداخت‌شده دست نمی‌خورد."""
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.status != "AWAITING_PAYMENT":
        raise PaymentPlanError("ORDER_NOT_MODIFIABLE", "این سفارش در وضعیتی نیست که روش پرداختش تغییر کند.")
    if not bank_enabled():
        raise PaymentPlanError("GATEWAY_ERROR", "واریز مستقیم در حال حاضر فعال نیست.")
    unpaid_online = [p for p in active_payments(order) if p.is_online and p.status in ("UNPAID", "FAILED")]
    if not unpaid_online:
        raise PaymentPlanError("CONFLICT", "پرداخت آنلاین پرداخت‌نشده‌ای برای انتقال وجود ندارد.")
    moved = sum(p.amount for p in unpaid_online)
    for p in unpaid_online:
        p.status = "VOID"
        p.failure_reason = "به واریز مستقیم منتقل شد"
        p.save(update_fields=["status", "failure_reason", "updated_at"])
        p.bale_sessions.filter(status__in=("CREATED", "INVOICE_SENT", "PRECHECKOUT_OK")).update(
            status="EXPIRED", failure_reason="به واریز مستقیم منتقل شد"
        )
    bank = next((p for p in active_payments(order) if not p.is_online and p.status == "UNPAID"), None)
    if bank:
        bank.amount += moved
        bank.save(update_fields=["amount", "updated_at"])
    else:
        bank = Payment.objects.create(order=order, method=METHOD_BANK, provider="NONE", amount=moved, status="UNPAID")
    has_online = any(p.is_online for p in active_payments(order))
    order.payment_plan = PLAN_COMBINED if has_online else PLAN_BANK
    order.save(update_fields=["payment_plan", "updated_at"])
    reconcile_order_payments(order, user=user)
    return bank
