"""E-04 §۰ — سه سند مشتری‌محور (فاکتور/بسته‌بندی/گارانتی) ارقام فارسی
می‌خواهند (سند تسک: «ارقام فارسی برای مبالغ و تاریخ‌ها؛ تاریخ شمسی») —
برخلاف apps/documents/persian.py's format_toman/format_jalali_date که عمداً
لاتین می‌مانند (گزارش‌های داخلی ادمین وایب، برند بوک §۳.۶، خارج از دامنه‌ی
این تسک). دو سطح عمداً ناهم‌خوان‌اند، یکی نیستند -- همان الگوی
apps/notifications/formatting.py در برابر همان persian.py."""

from .persian import PERSIAN_MONTHS, amount_in_words

_DIGIT_MAP = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def to_persian_digits(text: str) -> str:
    return text.translate(_DIGIT_MAP)


def format_jalali_date_fa(dt) -> str:
    """e.g. "۱۰ مرداد ۱۴۰۵"."""
    import jdatetime

    j = jdatetime.date.fromgregorian(date=dt.date() if hasattr(dt, "date") else dt)
    return to_persian_digits(f"{j.day} {PERSIAN_MONTHS[j.month - 1]} {j.year}")


def format_toman_fa(amount: int) -> str:
    grouped = f"{amount:,}".replace(",", "٬")
    return to_persian_digits(grouped) + " تومان"


def amount_in_words_fa(amount: int) -> str:
    return f"{amount_in_words(amount)} تومان"


def add_months(dt, months: int):
    """E-04 §۳ — پایان گارانتی = شروع + N ماه (تقویم میلادی، چون
    `warranty_months` عدد صحیح است و `jdatetime` جمع مستقیم ماه ندارد)."""
    from dateutil.relativedelta import relativedelta

    return dt + relativedelta(months=months)
