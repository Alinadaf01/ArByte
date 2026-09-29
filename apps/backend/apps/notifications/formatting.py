"""E-03 §۲ — متن پیامک لایه‌ی نمایش است (قانون ۹: ارقام فارسی فقط در لایه‌ی
نمایش)، برخلاف apps/documents/persian.py's format_toman (فاکتور PDF، عمداً
لاتین طبق برند بوک §۳.۶) — این دو تابع قصداً کد جدا دارند، یکی نیستند."""

_DIGIT_MAP = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def to_persian_digits(text: str) -> str:
    return text.translate(_DIGIT_MAP)


def format_money_fa(amount: int) -> str:
    grouped = f"{amount:,}".replace(",", "٬")
    return to_persian_digits(grouped)


def full_name_fa(full_name: str | None, fallback: str = "مشتری") -> str:
    return full_name.strip() if full_name and full_name.strip() else fallback


def first_name_fa(full_name: str | None, fallback: str = "مشتری") -> str:
    return full_name_fa(full_name, fallback).split()[0]
