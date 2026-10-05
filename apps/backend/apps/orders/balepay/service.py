"""AUDIT-2 — جریان پرداخت آنلاین در «بله» (ADDENDUM §C).

۱. چک‌اوت → `start_session`: توکن یک‌بارمصرف غیرقابل‌حدس → `ble.ir/<bot>?start=<token>`.
۲. `/start <token>` در ربات → گفت‌وگو به جلسه بسته می‌شود و فاکتور با مبلغِ
   سرور ارسال می‌شود (شماره‌ی تلفن هرگز chat_id فرض نمی‌شود).
۳. PreCheckoutQuery فقط اعتبارسنجی می‌شود — هرگز پرداخت‌شده نمی‌کند.
۴. SuccessfulPayment با payload + مبلغ + گفت‌وگو تطبیق داده می‌شود؛
   `provider_payment_charge_id` یکتا ذخیره و سهم آنلاین تأیید می‌شود.
۵. ربات لینک «بازگشت به آربایت» را می‌فرستد.

update_id تکراری (BaleUpdate) و charge id تکراری هرگز دوباره پردازش نمی‌شوند.
"""

import logging
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from .. import payment_state
from ..models import BalePaySession, BaleUpdate, Order, Payment
from . import client
from .config import load_config

logger = logging.getLogger(__name__)

SESSION_TTL = timedelta(hours=2)
OPEN_STATUSES = ("CREATED", "INVOICE_SENT", "PRECHECKOUT_OK")


class BalePayError(Exception):
    def __init__(self, code: str, message: str, status: int = 409):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def order_url(order: Order) -> str:
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}/orders/{order.order_number}"


def deep_link(bot_username: str, token: str) -> str:
    return f"https://ble.ir/{bot_username}?start={token}"


# ---------------------------------------------------------------- session


@transaction.atomic
def start_session(order: Order) -> BalePaySession:
    """جلسه‌ی تازه برای سهم آنلاینِ پرداخت‌نشده؛ جلسه‌های باز قبلی منقضی می‌شوند."""
    config = load_config()
    if not config.ready:
        raise BalePayError("GATEWAY_ERROR", "پرداخت آنلاین در حال حاضر فعال نیست.")
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.status != "AWAITING_PAYMENT" and order.status != "PAYMENT_REVIEW":
        raise BalePayError("ORDER_NOT_MODIFIABLE", "این سفارش دیگر قابل پرداخت نیست.")
    payment = next(
        (p for p in payment_state.active_payments(order) if p.is_online and p.status in ("UNPAID", "FAILED")),
        None,
    )
    if payment is None:
        raise BalePayError("CONFLICT", "پرداخت آنلاین پرداخت‌نشده‌ای برای این سفارش وجود ندارد.")
    if payment.amount > payment_state.online_limit_toman():
        # سقف ممکن است بعد از ثبت سفارش در پنل پایین آمده باشد — سرور دوباره اجبار می‌کند.
        raise BalePayError("ONLINE_PAYMENT_LIMIT_EXCEEDED", "مبلغ بیشتر از سقف پرداخت آنلاین است.")
    payment.bale_sessions.filter(status__in=OPEN_STATUSES).update(
        status="EXPIRED", failure_reason="جلسه‌ی تازه ساخته شد"
    )
    if payment.status == "FAILED":
        payment.status = "UNPAID"
        payment.save(update_fields=["status", "updated_at"])
    return BalePaySession.objects.create(
        payment=payment,
        amount_rial=payment.amount * payment_state.TOMAN_TO_RIAL,
        expires_at=timezone.now() + SESSION_TTL,
    )


# ---------------------------------------------------------------- webhook


def handle_update(update: dict) -> None:
    """ورودی وب‌هوک (پس از بررسی secret در view). خطاها لاگ و بلعیده می‌شوند
    تا بله همان update را بی‌پایان دوباره نفرستد؛ وضعیت در DB می‌ماند."""
    update_id = update.get("update_id")
    if not isinstance(update_id, int):
        return
    kind = next((k for k in ("pre_checkout_query", "message") if k in update), "other")
    try:
        with transaction.atomic():
            BaleUpdate.objects.create(update_id=update_id, kind=kind)
    except IntegrityError:
        return  # تکراری — قبلاً پردازش شده

    config = load_config()
    try:
        if "pre_checkout_query" in update:
            _handle_pre_checkout(config, update["pre_checkout_query"])
            return
        message = update.get("message") or {}
        if "successful_payment" in message:
            _handle_successful_payment(config, message)
            return
        text = (message.get("text") or "").strip()
        if text.startswith("/start"):
            _handle_start(config, message, text)
    except client.BaleApiError as exc:
        logger.warning("bale update %s: %s", update_id, exc)


def _chat_id(message: dict) -> int | None:
    chat = message.get("chat") or {}
    value = chat.get("id")
    return value if isinstance(value, int) else None


def _send(config, chat_id: int, text: str, url: str | None = None) -> None:
    payload = {"chat_id": chat_id, "text": text}
    if url:
        payload["reply_markup"] = {"inline_keyboard": [[{"text": "بازگشت به آربایت", "url": url}]]}
    client.call(config.bot_token, "sendMessage", payload)


def _handle_start(config, message: dict, text: str) -> None:
    chat_id = _chat_id(message)
    if chat_id is None:
        return
    token = text.split(maxsplit=1)[1].strip() if " " in text else ""
    if not token:
        _send(config, chat_id, "برای پرداخت، از صفحه‌ی سفارش در سایت آربایت روی «باز کردن بله» بزنید.")
        return

    with transaction.atomic():
        session = (
            BalePaySession.objects.select_for_update().select_related("payment__order").filter(token=token).first()
        )
        problem = _session_problem(session, chat_id)
        if problem:
            invalid = True
        else:
            invalid = False
            session.chat_id = chat_id
            session.save(update_fields=["chat_id", "updated_at"])

    if invalid:
        _send(config, chat_id, problem)
        return

    order = session.payment.order
    client.call(
        config.bot_token,
        "sendInvoice",
        {
            "chat_id": chat_id,
            "title": f"سفارش {order.order_number}",
            "description": f"پرداخت آنلاین سفارش {order.order_number} در آربایت",
            "payload": session.invoice_payload,
            "provider_token": config.provider_token,
            "prices": [{"label": "مبلغ قابل پرداخت", "amount": session.amount_rial}],
        },
    )
    BalePaySession.objects.filter(pk=session.pk, status="CREATED").update(
        status="INVOICE_SENT", updated_at=timezone.now()
    )


def _session_problem(session: BalePaySession | None, chat_id: int) -> str:
    if session is None:
        return "این لینک پرداخت معتبر نیست. از صفحه‌ی سفارش در سایت دوباره اقدام کنید."
    if session.chat_id is not None and session.chat_id != chat_id:
        return "این لینک پرداخت قبلاً در حساب دیگری باز شده است."
    if session.status not in OPEN_STATUSES or session.expires_at <= timezone.now():
        return "این لینک پرداخت منقضی شده است. از صفحه‌ی سفارش در سایت دوباره اقدام کنید."
    payment = session.payment
    if payment.status not in ("UNPAID", "FAILED") or payment.order.status == "CANCELLED":
        return "این پرداخت دیگر باز نیست. وضعیت سفارش را در سایت ببینید."
    return ""


def _payload_session(payload: str | None, *, lock: bool = False) -> BalePaySession | None:
    if not payload:
        return None
    qs = BalePaySession.objects.select_related("payment__order")
    if lock:
        qs = qs.select_for_update()
    return qs.filter(invoice_payload=payload).first()


def _currency_ok(currency) -> bool:
    return currency in (None, "", "IRR")


def _handle_pre_checkout(config, query: dict) -> None:
    """فقط اعتبارسنجی؛ PreCheckout یعنی «مشتری دارد پرداخت می‌کند»، نه پرداخت."""
    session = _payload_session(query.get("invoice_payload"))
    sender = (query.get("from") or {}).get("id")
    error = ""
    if session is None:
        error = "فاکتور معتبر نیست."
    elif session.chat_id is None or sender != session.chat_id:
        error = "این فاکتور متعلق به گفت‌وگوی دیگری است."
    elif query.get("total_amount") != session.amount_rial or not _currency_ok(query.get("currency")):
        error = "مبلغ فاکتور با سفارش نمی‌خواند."
    else:
        error = _session_problem(session, sender)

    payload = {"pre_checkout_query_id": query.get("id"), "ok": not error}
    if error:
        payload["error_message"] = error
    client.call(config.bot_token, "answerPreCheckoutQuery", payload)
    if not error:
        BalePaySession.objects.filter(pk=session.pk, status__in=("CREATED", "INVOICE_SENT")).update(
            status="PRECHECKOUT_OK", updated_at=timezone.now()
        )


def _handle_successful_payment(config, message: dict) -> None:
    paid = message["successful_payment"] or {}
    chat_id = _chat_id(message)
    charge_id = str(paid.get("provider_payment_charge_id") or "").strip()
    reply = None

    with transaction.atomic():
        session = _payload_session(paid.get("invoice_payload"), lock=True)
        if session is None:
            logger.error("bale successful_payment with unknown payload (charge %s)", charge_id or "-")
            return
        if session.status == "PAID":
            if session.provider_payment_charge_id != charge_id:
                _flag(session, f"پرداخت دوم برای همین فاکتور (charge {charge_id or '-'})", keep_status=True)
            return  # همان پرداخت، تکراری — بی‌اثر

        problems = []
        if not charge_id:
            problems.append("provider_payment_charge_id خالی است")
        if chat_id is None or chat_id != session.chat_id:
            problems.append("گفت‌وگو با جلسه نمی‌خواند")
        if paid.get("total_amount") != session.amount_rial or not _currency_ok(paid.get("currency")):
            problems.append(f"مبلغ {paid.get('total_amount')} ≠ {session.amount_rial}")
        if (
            charge_id
            and BalePaySession.objects.filter(provider_payment_charge_id=charge_id).exclude(pk=session.pk).exists()
        ):
            problems.append("charge id تکراری")
        if problems:
            # پول ممکن است گرفته شده باشد — هرگز خودکار تأیید نمی‌شود؛ ادمین تطبیق می‌دهد.
            _flag(session, "؛ ".join(problems), charge_id=charge_id if charge_id else None)
            return

        session.status = "PAID"
        session.paid_at = timezone.now()
        session.provider_payment_charge_id = charge_id
        session.telegram_payment_charge_id = str(paid.get("telegram_payment_charge_id") or "")[:100]
        session.save(
            update_fields=[
                "status",
                "paid_at",
                "provider_payment_charge_id",
                "telegram_payment_charge_id",
                "updated_at",
            ]
        )
        payment = session.payment
        if payment.order.status == "CANCELLED":
            _flag(session, "پرداخت برای سفارش لغوشده — بازپرداخت/پیگیری دستی", keep_status=True)
        payment_state.confirm_payment(payment, provider_ref=charge_id, note="پرداخت آنلاین بله")
        order = Order.objects.get(pk=payment.order_id)
        remaining = payment_state.breakdown(order)["remaining"]
        reply = (
            "پرداخت شما ثبت شد. سفارش شما پرداخت‌شده است."
            if remaining == 0
            else f"پرداخت آنلاین ثبت شد. باقی‌مانده‌ی {remaining:,} تومان را از صفحه‌ی سفارش واریز کنید."
        )

    if reply and chat_id is not None:
        _send(config, chat_id, reply, url=order_url(order))


def _flag(session: BalePaySession, reason: str, *, charge_id: str | None = None, keep_status: bool = False) -> None:
    logger.error("bale session %s needs review: %s", session.pk, reason)
    if not keep_status:
        session.status = "NEEDS_REVIEW"
    session.failure_reason = reason[:255]
    fields = ["status", "failure_reason", "updated_at"]
    if charge_id and session.provider_payment_charge_id is None:
        if not BalePaySession.objects.filter(provider_payment_charge_id=charge_id).exists():
            session.provider_payment_charge_id = charge_id
            fields.append("provider_payment_charge_id")
    session.save(update_fields=fields)
    Payment.objects.filter(pk=session.payment_id).update(failure_reason=reason[:255])


# ---------------------------------------------------------------- admin helpers


def test_connection() -> dict:
    """AUDIT §۱۹ — بدون پرداخت واقعی و بدون نشان‌دادن توکن: getMe ربات."""
    config = load_config()
    if not config.bot_token:
        return {"ok": False, "error": "توکن ربات ثبت نشده است."}
    try:
        me = client.call(config.bot_token, "getMe", retries=False)
    except client.BaleApiError as exc:
        return {"ok": False, "error": str(exc)}
    username = str(me.get("username") or "")
    result = {"ok": True, "botUsername": username, "providerTokenSet": bool(config.provider_token)}
    if config.bot_username and username and username.lower() != config.bot_username.lower():
        result["warning"] = f"نام کاربری ثبت‌شده ({config.bot_username}) با ربات ({username}) فرق دارد."
    return result


def webhook_url(secret: str) -> str:
    return f"{settings.BACKEND_BASE_URL.rstrip('/')}/api/bale/webhook/{secret}"
