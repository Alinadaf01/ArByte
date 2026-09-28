"""D-03 §2/§3 — hand-rolled query-param validation matching
packages/contracts/src/catalog/product.ts + common/pagination.ts's Zod
schemas field-for-field (Django/DRF has no first-class Zod equivalent, so
this mirrors the same constraints by hand: strict allow-lists, perPage
caps, VALIDATION_ERROR + fieldErrors on anything invalid — never silently
ignored, per the task doc)."""

import re

from .errors import validation_error
from .search import to_latin_digits

SLUG_REGEX = re.compile(r"^[a-z0-9-]+$")
PRODUCT_SORT_VALUES = ("newest", "price_asc", "price_desc", "popular", "featured")
PRODUCT_CONDITION_VALUES = ("NEW", "OPEN_BOX", "STOCK", "LIKE_NEW")
AVAILABILITY_VALUES = ("IN_STOCK", "PREORDER")

# D-04 — packages/contracts/src/validators.ts's MOBILE_REGEX/OTP_REGEX/POSTAL_CODE_REGEX.
MOBILE_REGEX = re.compile(r"^09\d{9}$")
OTP_REGEX = re.compile(r"^\d{4}$")
POSTAL_CODE_REGEX = re.compile(r"^\d{10}$")


def parse_mobile(raw: str | None, field: str = "mobile") -> str:
    normalized = to_latin_digits(raw or "")
    if not MOBILE_REGEX.match(normalized):
        raise validation_error({field: "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد."})
    return normalized


def parse_otp_code(raw: str | None, field: str = "code") -> str:
    normalized = to_latin_digits(raw or "")
    if not OTP_REGEX.match(normalized):
        raise validation_error({field: "کد وارد شده باید ۴ رقم باشد."})
    return normalized


def parse_postal_code(raw: str | None, field: str = "postalCode") -> str:
    normalized = to_latin_digits(raw or "")
    if not POSTAL_CODE_REGEX.match(normalized):
        raise validation_error({field: "کد پستی باید ۱۰ رقم باشد."})
    return normalized


def parse_non_empty_string(raw, field: str, *, max_length: int | None = None) -> str:
    if not isinstance(raw, str) or not raw.strip():
        raise validation_error({field: f"{field} الزامی است."})
    if max_length is not None and len(raw) > max_length:
        raise validation_error({field: f"{field} نمی‌تواند بیشتر از {max_length} نویسه باشد."})
    return raw


def _parse_positive_int(raw: str | None, field: str, *, default: int, max_value: int | None = None) -> int:
    if raw is None or raw == "":
        return default
    try:
        value = int(raw)
    except ValueError:
        raise validation_error({field: f"{field} باید عدد صحیح باشد."}) from None
    if value <= 0:
        raise validation_error({field: f"{field} باید مثبت باشد."})
    if max_value is not None and value > max_value:
        raise validation_error({field: f"{field} نمی‌تواند بیشتر از {max_value} باشد."})
    return value


def _parse_slug(raw: str, field: str) -> str:
    if not raw or len(raw) > 200 or not SLUG_REGEX.match(raw):
        raise validation_error({field: "اسلاگ فقط می‌تواند شامل حروف انگلیسی کوچک، عدد و خط تیره باشد."})
    return raw


def _parse_money(raw: str, field: str) -> int:
    try:
        value = int(raw)
    except ValueError:
        raise validation_error({field: f"{field} باید عدد صحیح باشد."}) from None
    if value <= 0:
        raise validation_error({field: f"{field} باید مثبت باشد."})
    return value


def parse_spec_filters(query_params) -> dict[str, str] | None:
    """`spec[<specDefId>]=<value>` query params — PHP-bracket style, sent
    verbatim by apps/web (catalog.ts). DRF/Django's QueryDict doesn't parse
    this natively; each bracketed key is its own literal param name."""
    filters: dict[str, str] = {}
    pattern = re.compile(r"^spec\[(.+)]$")
    for key in query_params:
        match = pattern.match(key)
        if match:
            filters[match.group(1)] = query_params[key]
    return filters or None


def parse_product_list_query(query_params) -> dict:
    page = _parse_positive_int(query_params.get("page"), "page", default=1)
    per_page = _parse_positive_int(query_params.get("perPage"), "perPage", default=24, max_value=60)

    category = query_params.get("category")
    if category is not None:
        category = _parse_slug(category, "category")

    brand_raw = query_params.get("brand")
    brand = None
    if brand_raw:
        brand = [_parse_slug(s, "brand") for s in brand_raw.split(",") if s]
        brand = brand or None

    condition = query_params.get("condition")
    if condition is not None and condition not in PRODUCT_CONDITION_VALUES:
        raise validation_error({"condition": "condition نامعتبر است."})

    min_price = query_params.get("minPrice")
    min_price = _parse_money(min_price, "minPrice") if min_price is not None else None
    max_price = query_params.get("maxPrice")
    max_price = _parse_money(max_price, "maxPrice") if max_price is not None else None

    availability = query_params.get("availability")
    if availability is not None and availability not in AVAILABILITY_VALUES:
        raise validation_error({"availability": "availability نامعتبر است."})

    sort = query_params.get("sort", "featured")
    if sort not in PRODUCT_SORT_VALUES:
        raise validation_error({"sort": "sort نامعتبر است."})

    return {
        "page": page,
        "perPage": per_page,
        "category": category,
        "brand": brand,
        "condition": condition,
        "minPrice": min_price,
        "maxPrice": max_price,
        "spec": parse_spec_filters(query_params),
        "availability": availability,
        "sort": sort,
    }


def parse_search_query(query_params) -> dict:
    page = _parse_positive_int(query_params.get("page"), "page", default=1)
    per_page = _parse_positive_int(query_params.get("perPage"), "perPage", default=24, max_value=60)
    q = query_params.get("q")
    if not q:
        raise validation_error({"q": "q الزامی است."})
    return {"page": page, "perPage": per_page, "q": q}


def parse_filters_query(query_params) -> dict:
    category = query_params.get("category")
    if category is not None:
        category = _parse_slug(category, "category")
    return {"category": category}
