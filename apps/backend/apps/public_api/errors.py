"""D-03 §2 — mirrors packages/contracts/src/common/error-codes.ts exactly
(ERROR_CODES + ERROR_MESSAGES). Only the codes this app can actually raise
are used here, but the full table is kept 1:1 so ApiError.code stays a
strict match to ErrorCodeSchema on the frontend."""

ERROR_MESSAGES = {
    "VALIDATION_ERROR": "اطلاعات واردشده معتبر نیست. لطفاً موارد مشخص‌شده را بررسی کنید.",
    "UNAUTHORIZED": "برای این عملیات باید وارد حساب کاربری خود شوید.",
    "FORBIDDEN": "شما دسترسی لازم برای این عملیات را ندارید.",
    "NOT_FOUND": "موردی با این مشخصات پیدا نشد.",
    "CONFLICT": "این عملیات با وضعیت فعلی سیستم سازگار نیست.",
    "RATE_LIMITED": "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
    "OTP_INVALID": "کد واردشده صحیح نیست.",
    "OTP_EXPIRED": "کد واردشده منقضی شده است. کد جدید درخواست کنید.",
    "OTP_MAX_ATTEMPTS": "تعداد تلاش‌های مجاز برای این کد به پایان رسید. کد جدید درخواست کنید.",
    "INSUFFICIENT_STOCK": "موجودی این محصول کافی نیست.",
    "PRICE_CHANGED": "قیمت این محصول تغییر کرده است. لطفاً سبد خرید را بررسی و دوباره تلاش کنید.",
    "CART_EMPTY": "سبد خرید شما خالی است.",
    "ORDER_NOT_MODIFIABLE": "این سفارش دیگر قابل تغییر نیست.",
    "PAYMENT_ALREADY_CONFIRMED": "پرداخت این سفارش قبلاً تأیید شده است.",
    "UPLOAD_TOO_LARGE": "حجم فایل بیش از حد مجاز است.",
    "UPLOAD_INVALID_TYPE": "نوع فایل مجاز نیست.",
    "INTERNAL_ERROR": "خطای غیرمنتظره‌ای رخ داد. تیم فنی مطلع شد؛ لطفاً کمی بعد دوباره تلاش کنید.",
    "SERVICE_UNAVAILABLE": "سرویس موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.",
    "VARIANT_NOT_FOUND": "این پیکربندی محصول پیدا نشد.",
    "VARIANT_UNAVAILABLE": "این پیکربندی محصول در حال حاضر موجود نیست.",
    "INVALID_STATUS_TRANSITION": "این تغییر وضعیت مجاز نیست.",
    "IMPERSONATION_TICKET_INVALID": "بلیت ورود معتبر نیست.",
    "IMPERSONATION_TICKET_EXPIRED": "بلیت ورود منقضی شده است.",
    "IMPERSONATION_TICKET_USED": "این بلیت ورود قبلاً استفاده شده است.",
    "IMPERSONATION_FORBIDDEN_ACTION": "در حالت مشاهده‌ی حساب مشتری، این عملیات مجاز نیست.",
    "GATEWAY_ERROR": "پرداخت با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
    "GATEWAY_TIMEOUT": "درگاه پرداخت پاسخ نداد. لطفاً دوباره تلاش کنید.",
    "GATEWAY_AMOUNT_MISMATCH": "مبلغ پرداختی با مبلغ سفارش مطابقت ندارد.",
    # D-05 §۴/۵ — کدهای جدید این تسک (packages/contracts/src/common/error-codes.ts).
    "COUPON_INVALID": "کد تخفیف معتبر نیست.",
    "COUPON_MIN_ORDER_NOT_MET": "حداقل مبلغ سفارش برای این کد رعایت نشده است.",
    "COUPON_USAGE_LIMIT_REACHED": "سقف استفاده از این کد پر شده است.",
    "RETURN_NOT_ELIGIBLE": "این سفارش قابل مرجوع‌کردن نیست.",
    "RETURN_WINDOW_EXPIRED": "مهلت مرجوعی این سفارش به پایان رسیده است.",
}


class ApiError(Exception):
    """Raised anywhere in apps.public_api to produce the Arbyte error
    envelope `{code, message, fieldErrors?, requestId}` — caught by
    PublicAPIView.handle_exception (see envelope.py)."""

    def __init__(self, code: str, *, status: int, message: str | None = None, field_errors: dict[str, str] | None = None):
        self.code = code
        self.status = status
        self.message = message or ERROR_MESSAGES.get(code, ERROR_MESSAGES["INTERNAL_ERROR"])
        self.field_errors = field_errors
        super().__init__(self.message)


def not_found(message: str | None = None) -> ApiError:
    return ApiError("NOT_FOUND", status=404, message=message)


def validation_error(field_errors: dict[str, str], message: str | None = None) -> ApiError:
    return ApiError("VALIDATION_ERROR", status=400, field_errors=field_errors, message=message)
