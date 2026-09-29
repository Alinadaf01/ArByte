"""F-03 — موتور قیمت و قیمت کمپین.

موتور قیمت (فقط `price_model=SUPPLIER_PLUS_PROFIT`؛ FIXED دست نمی‌خورد):
  قیمت همکار = ارزان‌ترین `SupplierProduct` در دسترسِ واریانت (نبودش =
  همان `variant.supplier_price` دستی).
  سود، به ترتیب اولویت تصمیم د (03-pricing.prisma):
    ۱. خود واریانت (`profit_type` ست شده)
    ۲. قانون تأمین‌کننده‌ی همان ارزان‌ترین ردیف
    ۳. قانون دسته‌ی محصول، بعد دسته‌ی والد
    ۴. قانون سراسری (هر دو null)
  مبلغ: همکار + سود؛ درصد: همکار × (۱ + bp/۱۰۰۰۰). گرد به ۱۰۰۰ تومان بالا.

قیمت کمپین (`live_price`): روی `final_price` ذخیره‌شده اعمال می‌شود، در
دیتابیس نوشته نمی‌شود — شروع/پایان کمپین فقط زمان است، نه یک migration
داده. فهرست، جزئیات، سبد و سفارش همه از همین تابع می‌خوانند.
"""

import time
from dataclasses import dataclass

from django.db import transaction
from django.utils import timezone

ROUND_TO = 1000


def round_up(value: int) -> int:
    """گرد به ۱۰۰۰ بالا با حساب صحیح (نه float — ۱۲٬۰۰۰٬۰۰۰×۱٫۱ در float
    ۱۳٬۲۰۰٬۰۰۰٫۰۰۰۰۰۰۰۰۲ است و به ۱۳٬۲۰۱٬۰۰۰ گرد می‌شد)."""
    return -(-int(value) // ROUND_TO) * ROUND_TO


@dataclass
class Profit:
    profit_type: str
    amount: int | None
    basis_points: int | None
    source: str

    def apply(self, base: int) -> int:
        if self.profit_type == "AMOUNT":
            return round_up(base + (self.amount or 0))
        numerator = base * (10000 + (self.basis_points or 0))
        return -(-numerator // (10000 * ROUND_TO)) * ROUND_TO


def _rule_profit(rule, source: str) -> Profit:
    return Profit(rule.profit_type, rule.profit_amount_toman, rule.profit_percent_basis_points, source)


def cheapest_supplier_row(variant):
    return (
        variant.supplier_products.filter(is_available=True, supplier__is_active=True)
        .select_related("supplier")
        .order_by("price", "id")
        .first()
    )


def resolve_profit(variant, supplier_row=None) -> Profit | None:
    from .models import PriceRule

    if variant.profit_type:
        return Profit(variant.profit_type, variant.profit_amount_toman, variant.profit_percent_basis_points, "variant")
    rules = PriceRule.objects.filter(is_active=True)
    if supplier_row is not None:
        rule = rules.filter(supplier=supplier_row.supplier, category__isnull=True).order_by("-updated_at").first()
        if rule:
            return _rule_profit(rule, "supplier")
    category = variant.product.category
    for cat in (category, category.parent if category.parent_id else None):
        if cat is None:
            continue
        rule = rules.filter(category=cat, supplier__isnull=True).order_by("-updated_at").first()
        if rule:
            return _rule_profit(rule, "category")
    rule = rules.filter(supplier__isnull=True, category__isnull=True).order_by("-updated_at").first()
    return _rule_profit(rule, "global") if rule else None


def compute_price(variant) -> tuple[int | None, int | None, str]:
    """(قیمت نهایی محاسبه‌شده، قیمت همکار مؤثر، منبع سود) — None یعنی قابل محاسبه نیست."""
    if variant.price_model != "SUPPLIER_PLUS_PROFIT":
        return None, variant.supplier_price, "fixed"
    row = cheapest_supplier_row(variant)
    base = row.price if row else variant.supplier_price
    if not base:
        return None, None, "no-supplier-price"
    profit = resolve_profit(variant, row)
    if profit is None:
        return None, base, "no-rule"
    return profit.apply(base), base, profit.source


def planned_changes(variants) -> list[dict]:
    changes = []
    for v in variants:
        new_price, base, source = compute_price(v)
        if new_price is not None and (new_price != v.final_price or base != v.supplier_price):
            changes.append({
                "variant": str(v.pk), "sku": v.sku, "product_name": v.product.name,
                "supplier_price": base, "old_price": v.final_price, "new_price": new_price, "profit_source": source,
            })
    return changes


@transaction.atomic
def apply_changes(changes: list[dict], *, user=None, reason: str) -> int:
    from .models import PriceHistory, ProductVariant

    variants = {str(v.pk): v for v in ProductVariant.objects.select_for_update().filter(pk__in=[c["variant"] for c in changes])}
    for change in changes:
        v = variants[change["variant"]]
        if v.final_price != change["new_price"]:
            PriceHistory.objects.create(
                variant=v, previous_price=v.final_price, new_price=change["new_price"], changed_by=user, reason=reason
            )
        v.final_price = change["new_price"]
        v.supplier_price = change["supplier_price"]
        v.save(update_fields=["final_price", "supplier_price", "updated_at"])
    return len(changes)


def recalculate_variants(variants, *, user=None, reason: str) -> list[dict]:
    changes = planned_changes(variants)
    if changes:
        apply_changes(changes, user=user, reason=reason)
    return changes


def cost_plus_variants():
    from .models import ProductVariant

    return ProductVariant.objects.filter(
        price_model="SUPPLIER_PLUS_PROFIT", deleted_at__isnull=True, product__deleted_at__isnull=True
    ).select_related("product__category__parent")


# ---------------------------------------------------------------------------
# کمپین
# ---------------------------------------------------------------------------

_INDEX_TTL_SECONDS = 5
_index_cache: dict = {"at": 0.0, "value": None}


def _active_campaign_index() -> dict:
    """{"product": {id: campaign}, "category": {id: campaign}} برای کمپین‌های
    فعال همین لحظه — بالاترین اولویت برنده. چند ثانیه کش (هر درخواست فهرست
    ده‌ها بار صدایش می‌زند)."""
    now_ts = time.monotonic()
    if _index_cache["value"] is not None and now_ts - _index_cache["at"] < _INDEX_TTL_SECONDS:
        return _index_cache["value"]
    from apps.content.models import CampaignProduct

    now = timezone.now()
    index: dict = {"product": {}, "category": {}}
    targets = (
        CampaignProduct.objects.select_related("campaign")
        .filter(campaign__is_active=True, campaign__start_at__lte=now, campaign__end_at__gt=now)
        .order_by("campaign__priority", "campaign__start_at")
    )
    for target in targets:  # اولویت بالاتر آخر می‌آید و جایگزین می‌کند
        if target.product_id:
            index["product"][target.product_id] = target.campaign
        else:
            index["category"][target.category_id] = target.campaign
    _index_cache.update(at=now_ts, value=index)
    return index


def reset_campaign_cache() -> None:
    _index_cache.update(at=0.0, value=None)


def campaign_for(product):
    index = _active_campaign_index()
    candidates = [index["product"].get(product.id), index["category"].get(product.category_id)]
    parent_id = getattr(product.category, "parent_id", None) if product.category_id else None
    if parent_id:
        candidates.append(index["category"].get(parent_id))
    candidates = [c for c in candidates if c is not None]
    return max(candidates, key=lambda c: (c.priority, c.start_at)) if candidates else None


def discounted(price: int, rules: dict | None) -> int:
    rules = rules or {}
    value = rules.get("value") or 0
    if rules.get("discountType") == "PERCENT":
        percent = min(max(int(value), 0), 100)
        new = price * (100 - percent) // (100 * ROUND_TO) * ROUND_TO  # گرد به پایین — تخفیف کمتر از وعده نشود
    elif rules.get("discountType") == "AMOUNT":
        new = price - max(value, 0)
    else:
        return price
    return max(new, ROUND_TO) if new < price else price


def live_price(variant) -> tuple[int, int | None]:
    """(قیمت نهایی قابل پرداخت، compareAt) — با کمپین فعال، compareAt همان
    قیمت قبلی واریانت است؛ بدون کمپین، مقادیر ذخیره‌شده."""
    campaign = campaign_for(variant.product)
    if campaign is None:
        return variant.final_price, variant.compare_at_price
    price = discounted(variant.final_price, campaign.rules)
    if price >= variant.final_price:
        return variant.final_price, variant.compare_at_price
    return price, max(variant.final_price, variant.compare_at_price or 0)
