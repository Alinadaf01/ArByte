"""Persian text helpers for PDF documents. Numerals stay Latin per the brand
book (BACKEND-TASK.md §3.6: "اعداد لاتین طبق برند بوک") — only words and
month names are Persian."""

PERSIAN_MONTHS = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]

_ONES = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"]
_TEENS = [
    "ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده",
    "شانزده", "هفده", "هجده", "نوزده",
]
_TENS = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"]
_HUNDREDS = [
    "", "صد", "دویست", "سیصد", "چهارصد", "پانصد",
    "ششصد", "هفتصد", "هشتصد", "نهصد",
]
_SCALES = ["", "هزار", "میلیون", "میلیارد", "تریلیون"]


def _three_digit_words(n: int) -> str:
    parts = []
    hundreds, rem = divmod(n, 100)
    if hundreds:
        parts.append(_HUNDREDS[hundreds])
    if 10 <= rem < 20:
        parts.append(_TEENS[rem - 10])
    else:
        tens, ones = divmod(rem, 10)
        if tens:
            parts.append(_TENS[tens])
        if ones:
            parts.append(_ONES[ones])
    return " و ".join(parts)


def amount_in_words(amount: int) -> str:
    """Persian words for a non-negative integer Toman amount, e.g. 1250000
    -> "یک میلیون و دویست و پنجاه هزار". Caller appends the unit ("تومان")."""
    if amount == 0:
        return "صفر"
    if amount < 0:
        raise ValueError("amount_in_words does not support negative amounts")

    groups = []
    remaining = amount
    while remaining > 0:
        groups.append(remaining % 1000)
        remaining //= 1000
    if len(groups) > len(_SCALES):
        raise ValueError("amount too large for amount_in_words")

    parts = []
    for i in range(len(groups) - 1, -1, -1):
        group = groups[i]
        if group == 0:
            continue
        words = _three_digit_words(group)
        scale = _SCALES[i]
        parts.append(f"{words} {scale}" if scale else words)
    return " و ".join(parts)


def format_toman(amount: int) -> str:
    return f"{amount:,} تومان"


def format_jalali_date(dt) -> str:
    """e.g. "10 مرداد 1405" — mirrors the frontend's formatJalaliDate."""
    import jdatetime

    j = jdatetime.date.fromgregorian(date=dt.date() if hasattr(dt, "date") else dt)
    return f"{j.day} {PERSIAN_MONTHS[j.month - 1]} {j.year}"
