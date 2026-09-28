"""D-03 §3 — ports packages/contracts/src/format/search-text.ts +
digits.ts (toLatinDigits half) character-for-character. Used by
GET /catalog/search to match Nest's normalize-then-substring behavior
exactly (no DB-level LIKE/ILIKE — see CatalogService.search()'s own
comment on why: small catalog, JS filtering is safe)."""

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
