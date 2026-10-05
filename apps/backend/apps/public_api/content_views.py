"""G-01 — API عمومی محتوا: وبلاگ، درباره ما، قوانین، فرم تماس و نظرات
خریداران. متن‌ها فقط از پنل می‌آیند؛ بخش خالی در پاسخ خالی برمی‌گردد تا
فروشگاه پنهانش کند. بدنه‌ی نوشته‌ها سمت سرور sanitize می‌شود (nh3)."""

import html
import re

import nh3
from django.db import IntegrityError, transaction
from django.db.models import Avg, Count, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.catalog.models import Product
from apps.content.models import (
    BLOG_CATEGORY_CHOICES,
    AboutPage,
    BlogPost,
    ContactMessage,
    LegalDocument,
    ProductReview,
)
from apps.orders.models import OrderItem

from .client_ip import client_ip
from .envelope import PublicAPIView, paginated_response, success_response
from .errors import ApiError, not_found, validation_error
from .impersonation import assert_not_impersonating
from .media import public_media_url
from .validation import _parse_positive_int

_ALLOWED_TAGS = {
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "a",
    "ul",
    "ol",
    "li",
    "blockquote",
    "h3",
    "h4",
    "img",
    "figure",
    "figcaption",
    "code",
}
_ALLOWED_ATTRS = {"a": {"href", "title"}, "img": {"src", "alt", "width", "height"}}
_BLOCK_TAG = re.compile(r"<\s*(p|ul|ol|blockquote|h3|h4|figure|img)\b", re.I)


def sanitize_rich_text(raw: str) -> str:
    """متن بخش نوشته → HTML امن. متن ساده (بدون تگ بلوکی) به پاراگراف‌ها
    (خط خالی) و خطوط «> » به نقل‌قول تبدیل می‌شود؛ HTML موجود فقط با
    تگ‌های مجاز می‌ماند. لینک‌ها rel=noopener می‌گیرند."""
    raw = (raw or "").strip()
    if not raw:
        return ""
    if not _BLOCK_TAG.search(raw):
        blocks = []
        for chunk in re.split(r"\n\s*\n", raw):
            chunk = chunk.strip()
            if not chunk:
                continue
            if chunk.startswith(">"):
                text = "\n".join(line.lstrip("> ").rstrip() for line in chunk.splitlines())
                blocks.append(f"<blockquote><p>{html.escape(text).replace(chr(10), '<br>')}</p></blockquote>")
            else:
                blocks.append(f"<p>{html.escape(chunk).replace(chr(10), '<br>')}</p>")
        raw = "".join(blocks)
    return nh3.clean(
        raw,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRS,
        url_schemes={"http", "https", "mailto"},
        link_rel="noopener noreferrer",
    )


def _paragraphs(text: str) -> list[str]:
    return [p.strip() for p in re.split(r"\n\s*\n", text or "") if p.strip()]


def _media_url(request, url: str) -> str | None:
    """نسبی می‌ماند (`/media/...`) — مثل تصاویر محصول؛ فروشگاه /media را به
    Django rewrite می‌کند و next/image فقط مسیر هم‌مبدأ را بهینه می‌کند."""
    return public_media_url(url)


def _post_card(request, post: BlogPost) -> dict:
    return {
        "slug": post.slug,
        "title": post.title,
        "excerpt": post.excerpt,
        "category": post.category,
        "cover": {"url": _media_url(request, post.resolved_cover_url), "alt": post.cover_alt}
        if post.resolved_cover_url
        else None,
        "author": post.author,
        "readingTime": post.reading_time,
        "publishedAt": post.published_at.isoformat() if post.published_at else None,
    }


def _published_posts():
    return BlogPost.objects.filter(is_published=True, published_at__isnull=False)


class BlogListView(PublicAPIView):
    def get(self, request):
        page = _parse_positive_int(request.query_params.get("page"), "page", default=1)
        per_page = _parse_positive_int(request.query_params.get("perPage"), "perPage", default=12, max_value=48)
        qs = _published_posts()
        category = request.query_params.get("category")
        if category:
            if category not in dict(BLOG_CATEGORY_CHOICES):
                raise validation_error({"category": "دسته‌ی نامعتبر."})
            qs = qs.filter(category=category)
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(excerpt__icontains=q) | Q(author__icontains=q))
        total = qs.count()
        items = [_post_card(request, p) for p in qs[(page - 1) * per_page : page * per_page]]
        return Response(paginated_response(items, request.request_id, page=page, per_page=per_page, total=total))


class BlogCategoriesView(PublicAPIView):
    def get(self, request):
        counts = dict(_published_posts().values_list("category").annotate(n=Count("id")))
        data = [{"name": name, "count": counts.get(name, 0)} for name, _ in BLOG_CATEGORY_CHOICES]
        return Response(success_response(data, request.request_id))


class BlogDetailView(PublicAPIView):
    def get(self, request, slug):
        post = _published_posts().filter(slug=slug).first()
        if not post:
            raise not_found("نوشته پیدا نشد.")
        sections = [
            {
                "id": str(s.get("id") or f"s-{i + 1}"),
                "heading": str(s.get("heading") or ""),
                "html": sanitize_rich_text(str(s.get("body") or "")),
            }
            for i, s in enumerate(post.sections or [])
            if isinstance(s, dict)
        ]
        related = list(_published_posts().filter(category=post.category).exclude(pk=post.pk)[:3])
        if len(related) < 3:
            related += list(_published_posts().exclude(pk__in=[post.pk, *[r.pk for r in related]])[: 3 - len(related)])
        data = {
            **_post_card(request, post),
            "authorRole": post.author_role,
            "tags": [str(t) for t in (post.tags or [])],
            "sections": sections,
            "seo": {"title": post.meta_title or None, "description": post.meta_description or None},
            "updatedAt": (post.published_at).isoformat(),
            "related": [_post_card(request, r) for r in related],
        }
        return Response(success_response(data, request.request_id))


class AboutView(PublicAPIView):
    def get(self, request):
        a = AboutPage.load()

        def rows(items, keys):
            out = []
            for item in items or []:
                if not isinstance(item, dict):
                    continue
                row = {k: str(item.get(k) or "").strip() for k in keys}
                if row[keys[0]]:
                    out.append(row)
            return out

        data = {
            "hero": {"title": a.hero_title, "body": a.hero_body},
            "story": {"title": a.story_title, "paragraphs": _paragraphs(a.story_body)},
            "principles": {"title": a.principles_title, "items": rows(a.principles, ["title", "body"])},
            "timeline": {"title": a.timeline_title, "items": rows(a.timeline, ["year", "note"])},
            "team": {"title": a.team_title, "members": rows(a.team, ["name", "role"])},
        }
        return Response(success_response(data, request.request_id))


def _legal_blocks(body: str) -> list[dict]:
    """«## زیرعنوان» → بلوک تازه؛ بقیه پاراگراف‌های همان بلوک."""
    blocks: list[dict] = []
    for para in _paragraphs(body):
        if para.startswith("## "):
            heading, _, rest = para[3:].partition("\n")
            blocks.append({"heading": heading.strip(), "paragraphs": _paragraphs(rest)})
        elif blocks:
            blocks[-1]["paragraphs"].append(para)
        else:
            blocks.append({"heading": "", "paragraphs": [para]})
    return blocks


class LegalView(PublicAPIView):
    def get(self, request):
        labels = dict(LegalDocument._meta.get_field("key").choices)
        docs = [
            {
                "key": d.key,
                "title": d.title or labels[d.key],
                "blocks": _legal_blocks(d.body),
                "updatedAt": d.updated_at.isoformat(),
            }
            for d in LegalDocument.objects.all()
            if d.body.strip()
        ]
        return Response(success_response(docs, request.request_id))


_MOBILE = re.compile(r"^09\d{9}$")
_CONTACT_TOPICS = {"پیش از خرید", "سفارش و ارسال", "گارانتی و خدمات", "ارتقای رم و SSD", "خرید سازمانی"}


class ContactView(PublicAPIView):
    throttle_scope = "contact_form"

    def post(self, request):
        body = request.data if isinstance(request.data, dict) else {}
        name = str(body.get("name") or "").strip()
        phone = str(body.get("phone") or "").strip()
        topic = str(body.get("topic") or "").strip()
        message = str(body.get("message") or "").strip()
        order_number = str(body.get("order_number") or "").strip()[:30]
        errors = {}
        if len(name) < 2:
            errors["name"] = "نام را وارد کنید."
        if not _MOBILE.match(phone):
            errors["phone"] = "شماره موبایل معتبر نیست."
        if topic not in _CONTACT_TOPICS:
            errors["topic"] = "موضوع را انتخاب کنید."
        if len(message) < 10:
            errors["message"] = "شرح درخواست حداقل ۱۰ حرف است."
        if errors:
            raise validation_error(errors)
        msg = ContactMessage.objects.create(
            name=name[:150],
            phone=phone,
            subject=topic,
            order_number=order_number,
            message=message[:5000],
            ip_address=client_ip(request),
        )
        return Response(success_response({"trackingCode": msg.tracking_code}, request.request_id), status=201)


def _review_row(r: ProductReview) -> dict:
    user = r.user
    name = (user.first_name if user else "") or "خریدار"
    return {
        "id": str(r.pk),
        "rating": r.rating,
        "title": r.title,
        "body": r.body,
        "authorName": name,
        "verifiedPurchase": r.verified_purchase,
        "adminReply": r.admin_reply or None,
        "createdAt": r.created_at.isoformat(),
    }


def rating_summary(product) -> dict:
    agg = ProductReview.objects.filter(product=product, status="approved").aggregate(avg=Avg("rating"), n=Count("id"))
    return {"average": round(agg["avg"], 1) if agg["n"] else None, "count": agg["n"]}


def _buyer_delivered(user, product) -> bool:
    return OrderItem.objects.filter(order__user=user, order__status="DELIVERED", variant__product=product).exists()


class ProductReviewsView(PublicAPIView):
    def get_permissions(self):
        return [IsAuthenticated()] if self.request.method == "POST" else []

    def _product(self, slug):
        product = Product.objects.filter(slug=slug, status="ACTIVE", deleted_at__isnull=True).first()
        if not product:
            raise not_found("محصول پیدا نشد.")
        return product

    def get(self, request, slug):
        product = self._product(slug)
        page = _parse_positive_int(request.query_params.get("page"), "page", default=1)
        per_page = _parse_positive_int(request.query_params.get("perPage"), "perPage", default=10, max_value=50)
        qs = ProductReview.objects.filter(product=product, status="approved").select_related("user")
        total = qs.count()
        items = [_review_row(r) for r in qs[(page - 1) * per_page : page * per_page]]
        body = paginated_response(items, request.request_id, page=page, per_page=per_page, total=total)
        body["meta"]["rating"] = rating_summary(product)
        user = request.user if request.user.is_authenticated else None
        body["meta"]["viewer"] = {
            "canReview": bool(
                user
                and _buyer_delivered(user, product)
                and not ProductReview.objects.filter(product=product, user=user).exists()
            ),
            "hasReviewed": bool(user and ProductReview.objects.filter(product=product, user=user).exists()),
        }
        return Response(body)

    def post(self, request, slug):
        # نظر به نام مشتری در حالت Impersonation ثبت نمی‌شود.
        assert_not_impersonating(request)
        product = self._product(slug)
        if not _buyer_delivered(request.user, product):
            raise ApiError("FORBIDDEN", status=403, message="فقط خریدارانی که سفارششان تحویل شده می‌توانند نظر بدهند.")
        body = request.data if isinstance(request.data, dict) else {}
        try:
            rating = int(body.get("rating"))
        except (TypeError, ValueError):
            rating = 0
        text = str(body.get("body") or "").strip()
        errors = {}
        if not 1 <= rating <= 5:
            errors["rating"] = "امتیاز بین ۱ تا ۵ است."
        if len(text) < 10:
            errors["body"] = "متن نظر حداقل ۱۰ حرف است."
        if errors:
            raise validation_error(errors)
        try:
            with transaction.atomic():
                review = ProductReview.objects.create(
                    product=product,
                    user=request.user,
                    rating=rating,
                    title=str(body.get("title") or "").strip()[:150],
                    body=text[:3000],
                    verified_purchase=True,
                )
        except IntegrityError:
            raise ApiError("CONFLICT", status=409, message="برای این محصول قبلاً نظر ثبت کرده‌اید.") from None
        return Response(
            success_response({"id": str(review.pk), "status": review.status}, request.request_id), status=201
        )


class SiteInfoView(PublicAPIView):
    """G-01 — اطلاعات تماس/شبکه‌های اجتماعی/نماد اعتماد از SiteSettings برای
    هدر، فوتر و پشتیبانی. فیلد خالی = در فروشگاه پنهان (بدون شماره/نشانی نمونه)."""

    def get(self, request):
        from apps.settings.models import SiteSettings

        s = SiteSettings.load()
        phone_href = s.phone_href.strip()
        if phone_href and not phone_href.startswith("tel:"):
            phone_href = f"tel:{phone_href}"
        trust_image = s.trust_badge_image_url or (s.trust_badge_image.url if s.trust_badge_image else "")
        data = {
            "phone": {"display": s.phone_display, "href": phone_href} if s.phone_display and phone_href else None,
            "email": s.email or None,
            "address": s.address or None,
            "businessHours": [
                {"day": str(h.get("day") or "").strip(), "time": str(h.get("time") or "").strip()}
                for h in (s.business_hours or [])
                if isinstance(h, dict) and h.get("day") and h.get("time")
            ],
            "socials": {
                key: url
                for key, url in {
                    "instagram": s.instagram_url,
                    "telegram": s.telegram_url,
                    "whatsapp": s.whatsapp_url,
                    "linkedin": s.linkedin_url,
                    "youtube": s.youtube_url,
                }.items()
                if url
            },
            "trustBadge": {
                "imageUrl": trust_image,
                "url": s.trust_badge_url or None,
                "label": s.trust_badge_label or "نماد اعتماد",
            }
            if trust_image
            else None,
        }
        return Response(success_response(data, request.request_id))
