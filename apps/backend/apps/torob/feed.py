"""AUDIT-6 — Torob API v3 (docs/integrations/torob-api-v3.pdf تنها مرجع).

ترب از ما pull می‌کند: `POST` با بدنه‌ی JSON در یکی از چهار حالت
(page+sort، cursor با sort=product_id_desc، page_urls، page_uniques).
هر آیتم = یک واریانت قابل‌فروش؛ همه‌ی داده از همان منابع فروشگاه
(`build_product_detail`، `live_price` با کمپین، `compute_availability`،
`PUBLIC_PRODUCT_Q`) و زنده از دیتابیس — بدون کش (مستند کش را مجاز نکرده).
"""

import math
import re
from datetime import datetime
from urllib.parse import parse_qs, urlsplit

from django.conf import settings
from django.db.models import DateTimeField, F
from django.db.models.functions import Coalesce, Greatest
from django.utils import timezone

from apps.catalog.models import PRODUCT_CONDITION_CHOICES, ProductVariant
from apps.public_api.availability import GLOBAL_LOW_STOCK_THRESHOLD
from apps.public_api.serializers import build_product_detail
from apps.public_api.services import PUBLIC_PRODUCT_Q, _product_queryset

API_VERSION = "torob_api_v3"
PAGE_SIZE = 100  # مستند: هر صفحه دقیقاً ۱۰۰ محصول (جز صفحه‌ی آخر).
MAX_LOOKUP = 1000  # سقف page_urls/page_uniques در یک درخواست.

SORT_DATE_ADDED = "date_added_desc"
SORT_DATE_UPDATED = "date_updated_desc"
SORT_PRODUCT_ID = "product_id_desc"
PAGE_SORTS = (SORT_DATE_ADDED, SORT_DATE_UPDATED)

_CONDITION = dict(PRODUCT_CONDITION_CHOICES)
_AVAILABLE = ("IN_STOCK", "LOW_STOCK")

# حداکثر طول‌ها از کلاس Product مستند.
MAX_LEN = {
    "page_unique": 200,
    "page_url": 1500,
    "title": 500,
    "subtitle": 500,
    "product_group_id": 200,
    "category_name": 200,
    "short_desc": 500,
    "guarantee": 200,
    "image_link": 1000,
}


class FeedRequestError(Exception):
    """ورودی نامعتبر → 400 با `{"error": ...}` (مستند، بخش خطاها)."""


# ---------------------------------------------------------------- queryset


def _public_variants():
    """واریانت‌های قابل‌فروش محصولات عمومی؛ حذف/پنهان‌شده هرگز در خروجی نیست."""
    return ProductVariant.objects.filter(deleted_at__isnull=True).filter(
        product__in=_product_queryset().filter(PUBLIC_PRODUCT_Q).values("pk")
    )


def _with_updated_at(qs):
    # «تاریخ تغییر اطلاعاتی که در API است»: قیمت/موجودی واریانت، انبار، محصول.
    return qs.annotate(
        torob_updated_at=Greatest(
            F("updated_at"),
            F("product__updated_at"),
            Coalesce(F("inventory__updated_at"), F("updated_at"), output_field=DateTimeField()),
        )
    )


def page_query(sort: str):
    qs = _with_updated_at(_public_variants())
    if sort == SORT_DATE_UPDATED:
        return qs.order_by("-torob_updated_at", "-pk")
    if sort == SORT_PRODUCT_ID:
        return qs.order_by("-pk")
    return qs.order_by("-created_at", "-pk")


# ---------------------------------------------------------------- items


def _absolute(path_or_url: str) -> str:
    if path_or_url.startswith(("http://", "https://")):
        return path_or_url
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}/{path_or_url.lstrip('/')}"


def page_unique_of(variant) -> str:
    """ثابت برای همیشه (مستند: تغییر شناسه = خروج محصول از ترب). نه SKU، که در پنل ویرایش‌پذیر است."""
    return f"{variant.product_id}_{variant.pk}"


def product_url(slug: str, variant_id) -> str:
    return _absolute(f"/products/{slug}?v={variant_id}")


def _iso(value: datetime) -> str:
    return timezone.localtime(value).isoformat()


def _clip(value: str | None, field: str) -> str | None:
    if value is None:
        return None
    value = re.sub(r"\s+", " ", str(value)).strip()
    return value[: MAX_LEN[field]] if value else None


def build_items(variant_rows: list) -> list[dict]:
    """`variant_rows` با annotate `torob_updated_at`؛ ترتیب ورودی حفظ می‌شود."""
    if not variant_rows:
        return []
    products = {
        p.pk: p
        for p in _product_queryset().filter(pk__in={v.product_id for v in variant_rows}).select_related("brand")
    }
    details = {pk: build_product_detail(p, GLOBAL_LOW_STOCK_THRESHOLD) for pk, p in products.items()}

    items = []
    for row in variant_rows:
        product = products.get(row.product_id)
        if product is None:
            continue
        detail = details[row.product_id]
        variant = next((v for v in detail["variants"] if v["id"] == str(row.pk)), None)
        if variant is None:
            continue
        items.append(_item(product, detail, variant, row))
    return items


def _item(product, detail: dict, variant: dict, row) -> dict:
    axis_names = {a["specDefId"]: a["name"] for a in detail["variantAxes"]}
    spec = {item["name"]: item["value"] for group in detail["specifications"] for item in group["items"]}
    spec.update({axis_names.get(k, k): v for k, v in variant["axisValues"].items()})

    condition = "" if product.condition == "NEW" else _CONDITION.get(product.condition, "")
    title = " ".join(p for p in [product.name, variant["label"], f"({condition})" if condition else ""] if p)
    final = int(variant["price"]["final"])
    compare_at = variant["price"].get("compareAt")
    guarantee = None
    if product.warranty_months:
        guarantee = f"{product.warranty_months} ماه {product.warranty_provider or 'گارانتی'}"
    added = row.created_at
    updated = getattr(row, "torob_updated_at", None) or row.updated_at

    return {
        "page_unique": page_unique_of(row),
        "page_url": product_url(product.slug, row.pk),
        "product_group_id": str(product.pk),
        "title": _clip(title, "title"),
        "subtitle": _clip(f"{product.brand.name} {product.model_number or ''}", "subtitle"),
        # موجود نبودن: قیمت آخر می‌ماند (مستند: «صفر یا قیمت قبل از ناموجود شدن»؛ هرگز null).
        "current_price": final,
        "old_price": int(compare_at) if compare_at and compare_at > final else None,
        "availability": variant["availability"]["status"] in _AVAILABLE,
        "category_name": _clip(detail["category"]["name"], "category_name"),
        # اولین تصویر = تصویر اصلی سایت (build_product_detail به ترتیب sort_order).
        "image_links": [_absolute(i["url"]) for i in detail["images"]],
        "short_desc": _clip(product.short_description, "short_desc"),
        "spec": spec,
        "guarantee": _clip(guarantee, "guarantee"),
        "date_added": _iso(added),
        "date_updated": _iso(max(updated, added)),
    }


# ---------------------------------------------------------------- validation


_ISO_TZ = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:?\d{2})$")


def _abs_url(value) -> bool:
    if not isinstance(value, str):
        return False
    parts = urlsplit(value)
    return parts.scheme in ("http", "https") and bool(parts.netloc)


def validate_item(item: dict) -> list[str]:
    """خطاهای یک آیتم در برابر کلاس Product مستند؛ خالی = معتبر."""
    errors = []

    def text(field, *, optional):
        value = item.get(field)
        if value is None:
            if not optional:
                errors.append(f"{field}: required")
            return
        if not isinstance(value, str) or not value:
            errors.append(f"{field}: must be a non-empty string")
        elif len(value) > MAX_LEN[field]:
            errors.append(f"{field}: longer than {MAX_LEN[field]}")

    text("page_unique", optional=False)
    text("page_url", optional=False)
    text("title", optional=False)
    for field in ("subtitle", "product_group_id", "category_name", "short_desc", "guarantee"):
        text(field, optional=True)
    if item.get("page_url") and not _abs_url(item["page_url"]):
        errors.append("page_url: must be absolute")

    price = item.get("current_price")
    if type(price) is not int or price < 0:
        errors.append("current_price: must be a non-negative int (never null)")
    old = item.get("old_price")
    if old is not None and (type(old) is not int or old < 0):
        errors.append("old_price: must be int or null")
    if type(item.get("availability")) is not bool:
        errors.append("availability: must be boolean")

    images = item.get("image_links")
    if not isinstance(images, list):
        errors.append("image_links: must be a list")
    else:
        for link in images:
            if not _abs_url(link) or len(link) > MAX_LEN["image_link"]:
                errors.append(f"image_links: invalid {str(link)[:80]}")

    spec = item.get("spec")
    if not isinstance(spec, dict):
        errors.append("spec: must be a dict ({} when empty)")
    elif not all(isinstance(k, str) and (isinstance(v, str) or type(v) is int) for k, v in spec.items()):
        errors.append("spec: keys must be str, values str|int")

    for field in ("date_added", "date_updated"):
        value = item.get(field)
        if not isinstance(value, str) or not _ISO_TZ.match(value):
            errors.append(f"{field}: must be timezone-aware ISO 8601")
    return errors


def partition_valid(items: list[dict]) -> tuple[list[dict], list[tuple[str, list[str]]]]:
    valid, invalid = [], []
    for item in items:
        problems = validate_item(item)
        if problems:
            invalid.append((str(item.get("page_unique")), problems))
        else:
            valid.append(item)
    return valid, invalid


# ---------------------------------------------------------------- request modes


def _str_list(body: dict, key: str) -> list[str]:
    value = body[key]
    if not isinstance(value, list) or not value or not all(isinstance(v, str) and v for v in value):
        raise FeedRequestError(f"{key} must be a non-empty list of strings")
    if len(value) > MAX_LOOKUP:
        raise FeedRequestError(f"{key} must contain at most {MAX_LOOKUP} items")
    return value


def parse_request(body) -> dict:
    """ورودی دقیقاً یکی از چهار حالت مستند؛ هیچ پیش‌فرضی فرض نمی‌شود."""
    if not isinstance(body, dict) or not body:
        raise FeedRequestError("request body must be a non-empty JSON object")
    modes = [k for k in ("page_urls", "page_uniques") if k in body]
    paging = "page" in body or "sort" in body or "cursor" in body
    if len(modes) + (1 if paging else 0) != 1:
        raise FeedRequestError("send exactly one of page_urls, page_uniques, or page/sort (or sort/cursor)")
    if modes:
        return {"mode": modes[0], "values": _str_list(body, modes[0])}

    if "sort" not in body:
        raise FeedRequestError("sort parameter is not provided")
    sort = body["sort"]
    if sort == SORT_PRODUCT_ID:
        if any(k in body for k in ("page", "limit", "size")):
            raise FeedRequestError("page, limit and size are not allowed with sort=product_id_desc")
        cursor = body.get("cursor")
        if cursor is not None and (not isinstance(cursor, str) or not cursor.isdigit()):
            raise FeedRequestError("cursor must be the next_cursor string from the previous response")
        return {"mode": "cursor", "sort": sort, "cursor": int(cursor) if cursor else None}
    if sort not in PAGE_SORTS:
        raise FeedRequestError(f"sort must be one of {', '.join((*PAGE_SORTS, SORT_PRODUCT_ID))}")
    if "cursor" in body:
        raise FeedRequestError("cursor is only valid with sort=product_id_desc")
    if "page" not in body:
        raise FeedRequestError("page parameter is not provided")
    page = body["page"]
    if type(page) is not int or page < 1:
        raise FeedRequestError("page must be an integer starting from 1")
    return {"mode": "page", "sort": sort, "page": page}


def _envelope(*, current_page: int, total: int | None, max_pages: int | None, products: list, next_cursor=None):
    return {
        "api_version": API_VERSION,
        "current_page": current_page,
        "total": total,
        "max_pages": max_pages,
        "next_cursor": next_cursor,
        "products": products,
    }


def _variant_ids_from_urls(urls: list[str]) -> list[int]:
    ids = []
    allowed_hosts = {urlsplit(settings.FRONTEND_BASE_URL).netloc.lower()}
    allowed_hosts |= {f"www.{h}" for h in allowed_hosts}
    for url in urls:
        parts = urlsplit(url)
        if parts.netloc.lower() not in allowed_hosts:
            continue
        match = re.fullmatch(r"/products/([^/]+)/?", parts.path)
        if not match:
            continue
        variant = parse_qs(parts.query).get("v", [""])[0]
        if variant.isdigit():
            ids.append(("id", int(variant), match.group(1)))
        else:
            ids.append(("slug", None, match.group(1)))
    resolved = []
    for kind, variant_id, slug in ids:
        qs = _public_variants().filter(product__slug=slug)
        if kind == "id":
            qs = qs.filter(pk=variant_id)
        else:  # آدرس محصول بدون ?v= → واریانت پیش‌فرض (یا اولین).
            qs = qs.order_by("-is_default", "pk")[:1]
        resolved.extend(qs.values_list("pk", flat=True))
    return resolved


def _lookup(variant_ids: list[int]) -> list[dict]:
    rows = {v.pk: v for v in _with_updated_at(_public_variants().filter(pk__in=variant_ids))}
    ordered, seen = [], set()
    for vid in variant_ids:
        if vid in rows and vid not in seen:
            ordered.append(rows[vid])
            seen.add(vid)
    return build_items(ordered)


def run(request_data: dict) -> tuple[dict, list[tuple[str, list[str]]]]:
    """پاسخ مستند + آیتم‌های نامعتبرِ کنارگذاشته (برای لاگ)."""
    mode = request_data["mode"]
    if mode in ("page_urls", "page_uniques"):
        if mode == "page_urls":
            variant_ids = _variant_ids_from_urls(request_data["values"])
        else:
            variant_ids = []
            for unique in request_data["values"]:
                match = re.fullmatch(r"(\d+)_(\d+)", unique)
                if match:
                    variant_ids.append(int(match.group(2)))
        valid, invalid = partition_valid(_lookup(variant_ids))
        if mode == "page_uniques":
            wanted = set(request_data["values"])
            valid = [i for i in valid if i["page_unique"] in wanted]
        return _envelope(current_page=1, total=len(valid), max_pages=1, products=valid), invalid

    qs = page_query(request_data["sort"])
    total = qs.count()
    max_pages = max(1, math.ceil(total / PAGE_SIZE))
    if mode == "cursor":
        cursor = request_data["cursor"]
        window = qs.filter(pk__lt=cursor) if cursor else qs
        rows = list(window[: PAGE_SIZE + 1])
        has_more = len(rows) > PAGE_SIZE
        rows = rows[:PAGE_SIZE]
        before = qs.filter(pk__gte=cursor).count() if cursor else 0  # صفحه‌های قبلی تا خود cursor
        valid, invalid = partition_valid(build_items(rows))
        return (
            _envelope(
                current_page=before // PAGE_SIZE + 1,
                total=total,
                max_pages=max_pages,
                products=valid,
                next_cursor=str(rows[-1].pk) if has_more and rows else None,
            ),
            invalid,
        )

    page = request_data["page"]
    rows = list(qs[(page - 1) * PAGE_SIZE : page * PAGE_SIZE])
    valid, invalid = partition_valid(build_items(rows))
    return _envelope(current_page=page, total=total, max_pages=max_pages, products=valid), invalid


def validate_everything() -> dict:
    """«Validate feed» پنل: کل خروجی را بدون ارسال به جایی در برابر مستند می‌سنجد."""
    qs = page_query(SORT_PRODUCT_ID)
    checked, invalid, without_image = 0, [], []
    cursor = None
    while True:
        window = qs.filter(pk__lt=cursor) if cursor else qs
        rows = list(window[:PAGE_SIZE])
        if not rows:
            break
        items = build_items(rows)
        checked += len(items)
        invalid.extend(partition_valid(items)[1])
        # هشدار، نه خطا: مستند تصویر را اجباری نکرده ولی بدون آن ترب محصول را خوب نشان نمی‌دهد.
        without_image.extend(i["page_unique"] for i in items if not i["image_links"])
        cursor = rows[-1].pk
    return {
        "checked": checked,
        "invalid": len(invalid),
        "errors": [{"pageUnique": unique, "problems": problems} for unique, problems in invalid[:50]],
        "withoutImage": without_image[:50],
    }
