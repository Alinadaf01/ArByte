"""D-03 §3 — ports packages/contracts/src/format/search-text.ts +
digits.ts (toLatinDigits half) character-for-character. Used by
GET /catalog/search to match Nest's normalize-then-substring behavior
exactly. AUDIT §۱۲.۱۰: همان نرمال‌سازی در SQL هم هست (normalized_search_text)."""

import re

_PERSIAN_TO_LATIN_DIGITS = str.maketrans(
    "۰۱۲۳۴۵۶۷۸۹" "٠١٢٣٤٥٦٧٨٩",
    "0123456789" "0123456789",
)

_ARABIC_YEH = re.compile("ي")
_ARABIC_KAF = re.compile("ك")
# Arabic diacritics (fatha/damma/kasra/tanwin/shadda/sukun/superscript alef)
# U+064B-U+0652, U+0670, + tatweel U+0640 — same set as DIACRITICS_AND_TATWEEL.
_DIACRITICS_AND_TATWEEL = re.compile("[ً-ْٰـ]")
# ZWNJ (نیم‌فاصله, U+200C) + any whitespace — stripped entirely, not collapsed.
_ZWNJ_AND_WHITESPACE = re.compile("[‌\\s]")


def to_latin_digits(text: str) -> str:
    return text.translate(_PERSIAN_TO_LATIN_DIGITS)


def normalize_search_text(text: str) -> str:
    text = to_latin_digits(text)
    text = _ARABIC_YEH.sub("ی", text)
    text = _ARABIC_KAF.sub("ک", text)
    text = _DIACRITICS_AND_TATWEEL.sub("", text)
    text = _ZWNJ_AND_WHITESPACE.sub("", text)
    return text.lower()


# AUDIT §۱۲.۱۰ — همان normalize_search_text در SQL. translate() در Postgres
# نویسه‌ای را که در «to» جفت ندارد حذف می‌کند (اعراب، کشیده، نیم‌فاصله و همه‌ی
# نویسه‌های \s پایتون)؛ هم‌ارزی با نسخه‌ی پایتونی تست دارد.
_SQL_FROM = "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩يك"
_SQL_TO = "01234567890123456789یک"
_SQL_DELETE = (
    "".join(chr(c) for c in range(0x064B, 0x0653))
    + "ٰـ‌"
    + "".join(chr(c) for c in range(0x110000) if re.match(r"\s", chr(c)))
)


def normalized_search_text(field: str):
    from django.db.models import CharField, Func, Value
    from django.db.models.functions import Lower

    translated = Func(field, Value(_SQL_FROM + _SQL_DELETE), Value(_SQL_TO), function="translate", output_field=CharField())
    return Lower(translated)
