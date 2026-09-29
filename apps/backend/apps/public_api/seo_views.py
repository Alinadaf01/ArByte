"""G-02 — سئو و رشد: جدول ریدایرکت برای middleware فروشگاه، داده‌ی sitemap،
ثبت بازدید بدون کوکی، و فید ترب (بند ۱۰.۶۴–۱۰.۶۸ برندبوک: از دیتابیس، با
همان قیمت/موجودی فروشگاه)."""

import hashlib
import math

from django.conf import settings
from django.core.cache import cache
from django.db.models import F
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET
from rest_framework.response import Response

from apps.analytics.tasks import is_bot_user_agent, record_page_view
from apps.catalog.models import PRODUCT_CONDITION_CHOICES, Category, Product
from apps.content.models import BlogPost, Redirect

from .availability import GLOBAL_LOW_STOCK_THRESHOLD
from .client_ip import client_ip
from .envelope import PublicAPIView, success_response
from .errors import validation_error
from .serializers import build_product_detail
from .services import PUBLIC_CATEGORY_PRODUCT_Q, _product_queryset


class RedirectListView(PublicAPIView):
    """کل جدول فعال (کوچک است)؛ middleware فروشگاه ۶۰ ثانیه کش می‌کند."""

    def get(self, request):
        rows = Redirect.objects.filter(is_active=True).values("id", "from_path", "to_path", "status_code")
        data = [
            {"id": str(r["id"]), "from": r["from_path"], "to": r["to_path"], "status": r["status_code"]} for r in rows
        ]
        return Response(success_response(data, request.request_id))


class RedirectHitView(PublicAPIView):
    throttle_scope = "redirect_hit"

    def post(self, request, pk):
        Redirect.objects.filter(pk=pk, is_active=True).update(hits=F("hits") + 1, last_hit_at=timezone.now())
        return Response(status=204)


class SitemapDataView(PublicAPIView):
    """فقط slug و زمان آخرین تغییر؛ فروشگاه sitemap.xml را می‌سازد."""

    def get(self, request):
        products = Product.objects.filter(PUBLIC_CATEGORY_PRODUCT_Q).values_list("slug", "updated_at")
        categories = Category.objects.filter(is_active=True, deleted_at__isnull=True).values_list("slug", "updated_at")
        posts = BlogPost.objects.filter(is_published=True, published_at__isnull=False).values_list(
            "slug", "published_at"
        )
        data = {
            "products": [{"slug": s, "updatedAt": u.isoformat()} for s, u in products],
            "categories": [{"slug": s, "updatedAt": u.isoformat()} for s, u in categories],
            "posts": [{"slug": s, "updatedAt": u.isoformat()} for s, u in posts],
        }
        return Response(success_response(data, request.request_id))


class PageViewView(PublicAPIView):
    """بدون کوکی: بازدیدکننده = hash(نمک روزانه + آی‌پی + UA)؛ آی‌پی خام ذخیره نمی‌شود."""

    throttle_scope = "pageview"

    def post(self, request):
        body = request.data if isinstance(request.data, dict) else {}
        path = str(body.get("path") or "").strip().split("?")[0].split("#")[0]
        if not path.startswith("/") or len(path) > 255:
            raise validation_error({"path": "مسیر نامعتبر است."})
        user_agent = request.META.get("HTTP_USER_AGENT", "")[:500]
        if not is_bot_user_agent(user_agent):
            day_salt = f"{settings.SECRET_KEY}:{timezone.localdate().isoformat()}"
            visitor = hashlib.sha256(f"{day_salt}:{client_ip(request)}:{user_agent}".encode()).hexdigest()
            slug = path.split("/")[2] if path.startswith("/products/") and path.count("/") >= 2 else None
            record_page_view.delay(
                path=path,
                visitor_hash=visitor,
                referrer=str(body.get("referrer") or "")[:500],
                user_agent=user_agent,
                product_slug=slug,
            )
        return Response(status=204)


# --- فید ترب ---------------------------------------------------------------

TOROB_PAGE_SIZE = 100
TOROB_CACHE_SECONDS = 3600
_CONDITION = dict(PRODUCT_CONDITION_CHOICES)


def _absolute(url: str) -> str:
    if not url:
        return ""
    return url if url.startswith("http") else f"{settings.FRONTEND_BASE_URL.rstrip('/')}{url}"


def _torob_items(product) -> list[dict]:
    detail = build_product_detail(product, GLOBAL_LOW_STOCK_THRESHOLD)
    images = [_absolute(i["url"]) for i in detail["images"]]
    specs = {item["name"]: item["value"] for group in detail["specifications"] for item in group["items"]}
    condition = _CONDITION.get(product.condition, "")
    guarantee = ""
    if product.warranty_months:
        guarantee = f"{product.warranty_months} ماه {product.warranty_provider or 'گارانتی'}".strip()
    items = []
    for v in detail["variants"]:
        title = " ".join(
            p for p in [product.name, v["label"], f"({condition})" if product.condition != "NEW" else ""] if p
        )
        final = v["price"]["final"]
        compare_at = v["price"].get("compareAt")
        in_stock = v["availability"]["status"] in ("IN_STOCK", "LOW_STOCK")
        items.append(
            {
                "page_unique": v["sku"],
                "product_group_id": str(product.pk),
                "page_url": _absolute(f"/products/{product.slug}?v={v['id']}"),
                "title": title,
                "subtitle": product.model_number or "",
                "brand": detail["brand"]["name"],
                "category_name": detail["category"]["name"],
                "current_price": final if in_stock else 0,
                "old_price": compare_at if compare_at and compare_at > final else None,
                "availability": "instock" if in_stock else "outofstock",
                "image_link": images[0] if images else "",
                "image_links": images,
                "short_desc": product.short_description or "",
                "spec": {**specs, **v.get("axisValues", {})},
                "guarantee": guarantee,
                "condition": condition,
            }
        )
    return items


def _torob_page(page: int) -> dict:
    key = f"torob-feed:v1:{page}"
    cached = cache.get(key)
    if cached is not None:
        return cached
    qs = _product_queryset().filter(PUBLIC_CATEGORY_PRODUCT_Q).order_by("pk")
    total_products = qs.count()
    products = list(qs[(page - 1) * TOROB_PAGE_SIZE : page * TOROB_PAGE_SIZE])
    items = [item for p in products for item in _torob_items(p)]
    data = {
        "count": len(items),
        "max_pages": max(1, math.ceil(total_products / TOROB_PAGE_SIZE)),
        "page": page,
        "currency": "TOMAN",
        "products": items,
    }
    cache.set(key, data, TOROB_CACHE_SECONDS)
    return data


@require_GET
def torob_feed(request):
    """`GET /feeds/torob?page=N` — هر واریانت یک آیتم (`page_unique` = SKU)،
    قیمت نهایی با کمپین (همان `live_price` صفحه‌ی محصول)، کش ۱ ساعت.
    قالب: JSON شناخته‌شده‌ی ترب (docs/QUESTIONS.md Q-43)."""
    try:
        page = max(1, int(request.GET.get("page", "1")))
    except ValueError:
        page = 1
    response = JsonResponse(_torob_page(page), json_dumps_params={"ensure_ascii": False})
    response["Cache-Control"] = f"public, max-age={TOROB_CACHE_SECONDS}"
    return response
