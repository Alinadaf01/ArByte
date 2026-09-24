from datetime import timedelta

from django.db.models import Count, F, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.analytics.models import AdminActivityLog, DailyStat, PageView
from apps.catalog.models import Product
from apps.content.models import ContactMessage, ProductReview
from apps.inventory.models import StockMovement
from apps.orders.models import Cart, Order, OrderItem, Payment, Return
from apps.settings.models import ApiCredential
from apps.users.models import User

from .models import SearchConsoleSitemapStatus
from .orders import ORDER_PREFETCH, AdminOrderSerializer
from .permissions import IsAdminStaff
from .products import PRODUCT_PREFETCH, AdminProductSerializer

KAVENEGAR_CREDIT_THRESHOLD = 10000
STALE_PENDING_PAYMENT_MINUTES = 30
PAID_NOT_SHIPPED_DAYS = 3


def _needs_action():
    now = timezone.now()
    stale_cutoff = now - timedelta(minutes=STALE_PENDING_PAYMENT_MINUTES)
    return {
        "paid_pending_processing": Order.objects.filter(status="paid").count(),
        "ready_to_ship": Order.objects.filter(status="processing").count(),
        "new_return_requests": Return.objects.filter(status="requested").count(),
        "unread_messages": ContactMessage.objects.filter(is_read=False).count(),
        "pending_reviews": ProductReview.objects.filter(status="pending").count(),
        "low_stock_count": Product.objects.filter(
            stock_alert__is_active=True, stock_count__lte=F("stock_alert__reorder_point")
        ).count(),
        "out_of_stock_active": Product.objects.filter(stock_count=0, is_active=True).count(),
        "stale_pending_payments": Order.objects.filter(status="pending", created_at__lt=stale_cutoff).count(),
    }


def _pulse_for_day(day):
    paid = Order.objects.filter(paid_at__date=day)
    sales = paid.aggregate(total=Sum("total"))["total"] or 0
    order_count = paid.count()
    aov = round(sales / order_count) if order_count else 0
    carts_created = Cart.objects.filter(created_at__date=day).count()
    conversion_rate = round(order_count / carts_created, 4) if carts_created else 0
    return {"sales": sales, "orders": order_count, "average_order_value": aov, "conversion_rate": conversion_rate}


def _todays_pulse():
    today = timezone.localtime(timezone.now()).date()
    last_week_same_day = today - timedelta(days=7)
    today_stats = _pulse_for_day(today)
    last_week_stats = _pulse_for_day(last_week_same_day)
    return {
        "sales": today_stats["sales"],
        "sales_last_week_same_day": last_week_stats["sales"],
        "orders": today_stats["orders"],
        "orders_last_week_same_day": last_week_stats["orders"],
        "average_order_value": today_stats["average_order_value"],
        "average_order_value_last_week_same_day": last_week_stats["average_order_value"],
        "conversion_rate": today_stats["conversion_rate"],
        "conversion_rate_last_week_same_day": last_week_stats["conversion_rate"],
    }


def _daily_stat_sum(qs):
    agg = qs.aggregate(page_views=Sum("page_views"), unique_visitors=Sum("unique_visitors"))
    return {"page_views": agg["page_views"] or 0, "unique_visitors": agg["unique_visitors"] or 0}


def _site_visits():
    today = timezone.localtime(timezone.now()).date()
    month_start = today.replace(day=1)
    stats = DailyStat.objects.all()

    recent_views = PageView.objects.filter(created_at__date__gte=today - timedelta(days=13), is_bot=False)
    top_pages = [
        {"path": row["path"], "views": row["views"]}
        for row in recent_views.values("path").annotate(views=Count("id")).order_by("-views")[:5]
    ]
    top_referrers = [
        {"referrer": row["referrer"], "views": row["views"]}
        for row in recent_views.exclude(referrer="").values("referrer").annotate(views=Count("id")).order_by("-views")[:5]
    ]

    product_views = (
        recent_views.exclude(product_slug=None)
        .values("product_slug")
        .annotate(views=Count("id"))
        .order_by("-views")[:20]
    )
    slugs = [row["product_slug"] for row in product_views]
    products_by_slug = {p.slug: p for p in Product.objects.filter(slug__in=slugs)}
    week_ago = timezone.now() - timedelta(days=7)
    worst_ratio = []
    for row in product_views:
        product = products_by_slug.get(row["product_slug"])
        if not product:
            continue
        purchases = (
            OrderItem.objects.filter(order__paid_at__gte=week_ago, product=product).aggregate(units=Sum("quantity"))["units"]
            or 0
        )
        ratio = round(purchases / row["views"], 4) if row["views"] else 0
        worst_ratio.append(
            {"product": {"id": product.pk, "name": product.name, "sku": product.sku}, "views": row["views"], "purchases": purchases, "ratio": ratio}
        )
    worst_ratio.sort(key=lambda r: r["ratio"])

    return {
        "today": _daily_stat_sum(stats.filter(date=today)),
        "this_month": _daily_stat_sum(stats.filter(date__gte=month_start)),
        "total": _daily_stat_sum(stats),
        "top_pages": top_pages,
        "top_referrers": top_referrers,
        "worst_view_to_purchase": worst_ratio[:5],
    }


def _trends():
    today = timezone.localtime(timezone.now()).date()
    thirty_days_ago = today - timedelta(days=29)
    week_ago = timezone.now() - timedelta(days=7)

    paid_orders = Order.objects.filter(paid_at__isnull=False)
    chart_rows = {
        row["day"]: row["total"]
        for row in paid_orders.filter(paid_at__date__gte=thirty_days_ago)
        .annotate(day=TruncDate("paid_at"))
        .values("day")
        .annotate(total=Sum("total"))
    }
    sales_chart = [
        {"date": (thirty_days_ago + timedelta(days=i)).isoformat(), "total": chart_rows.get(thirty_days_ago + timedelta(days=i), 0)}
        for i in range(30)
    ]

    def top_products(order_by_field, limit=5):
        items = (
            OrderItem.objects.filter(order__paid_at__gte=week_ago, product__isnull=False)
            .values("product_id")
            .annotate(units_sold=Sum("quantity"), revenue=Sum(F("price") * F("quantity")))
            .order_by(order_by_field)[:limit]
        )
        product_by_id = {
            p.pk: p
            for p in Product.objects.filter(pk__in=[row["product_id"] for row in items])
            .select_related("category")
            .prefetch_related(*PRODUCT_PREFETCH)
        }
        return [
            {
                "product": AdminProductSerializer(product_by_id[row["product_id"]]).data,
                "units_sold": row["units_sold"],
                "revenue": row["revenue"],
            }
            for row in items
            if row["product_id"] in product_by_id
        ]

    month_start = today.replace(day=1)
    last_month_end = month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)
    day_of_month = today.day
    last_month_to_date_end = min(last_month_start + timedelta(days=day_of_month - 1), last_month_end)

    this_month_to_date = paid_orders.filter(paid_at__date__gte=month_start).aggregate(total=Sum("total"))["total"] or 0
    last_month_to_date = (
        paid_orders.filter(paid_at__date__gte=last_month_start, paid_at__date__lte=last_month_to_date_end).aggregate(
            total=Sum("total")
        )["total"]
        or 0
    )

    return {
        "sales_chart_30d": sales_chart,
        "top_products_by_quantity": top_products("-units_sold"),
        "top_products_by_revenue": top_products("-revenue"),
        "this_month_to_date": this_month_to_date,
        "last_month_to_date": last_month_to_date,
    }


def _since_last_visit(user):
    last_visit = user.last_dashboard_visit
    feed = []

    def add(items, kind, summary_fn, link_fn, timestamp_fn=lambda x: x.created_at):
        for item in items:
            feed.append(
                {
                    "type": kind,
                    "id": str(item.pk),
                    "summary": summary_fn(item),
                    "created_at": timestamp_fn(item).isoformat(),
                    "link": link_fn(item),
                }
            )

    if last_visit:
        add(
            Order.objects.filter(created_at__gt=last_visit).order_by("-created_at")[:20],
            "order",
            lambda o: f"سفارش جدید #{o.number}",
            lambda o: {"path": "/orders", "id": str(o.pk)},
        )
        add(
            User.objects.filter(created_at__gt=last_visit, is_staff=False).order_by("-created_at")[:20],
            "user",
            lambda u: f"کاربر جدید: {u.get_full_name()}",
            lambda u: {"path": "/users", "id": str(u.pk)},
        )
        add(
            ProductReview.objects.filter(created_at__gt=last_visit).select_related("product").order_by("-created_at")[:20],
            "review",
            lambda r: f"نظر جدید روی «{r.product.name}»",
            lambda r: {"path": "/reviews", "id": str(r.pk)},
        )
        add(
            ContactMessage.objects.filter(submitted_at__gt=last_visit).order_by("-submitted_at")[:20],
            "message",
            lambda m: f"پیام جدید از {m.name}",
            lambda m: {"path": "/messages", "id": str(m.pk)},
            timestamp_fn=lambda m: m.submitted_at,
        )
        add(
            Return.objects.filter(created_at__gt=last_visit).select_related("order").order_by("-created_at")[:20],
            "return",
            lambda r: f"درخواست مرجوعی برای سفارش #{r.order.number}",
            lambda r: {"path": "/returns", "id": str(r.pk)},
        )
        for log in AdminActivityLog.objects.filter(created_at__gt=last_visit).select_related("user").order_by("-created_at")[:20]:
            feed.append(
                {
                    "type": "activity",
                    "id": str(log.pk),
                    "summary": f"{log.user.get_full_name() if log.user else 'سیستم'} — {log.action} روی {log.model_name}#{log.object_id}",
                    "created_at": log.created_at.isoformat(),
                    "link": None,
                }
            )
        feed.sort(key=lambda f: f["created_at"], reverse=True)

    return {"last_visit_at": last_visit.isoformat() if last_visit else None, "feed": feed[:30]}


def _system_health():
    kavenegar_credit = None
    kavenegar_credential = ApiCredential.objects.filter(service="kavenegar", is_active=True).first()
    if kavenegar_credential and kavenegar_credential.has_valid_credentials():
        try:
            from apps.notifications.kavenegar_client import get_kavenegar_client

            info = get_kavenegar_client().account_info()
            kavenegar_credit = info.get("remaincredit") if isinstance(info, dict) else None
        except Exception:
            kavenegar_credit = None

    gateways = [
        {
            "service": cred.service,
            "label": cred.label or cred.get_service_display(),
            "is_active": cred.is_active,
            "has_valid_credentials": cred.has_valid_credentials(),
        }
        for cred in ApiCredential.objects.exclude(service="kavenegar")
    ]

    payment_errors_24h = Payment.objects.filter(status="failed", created_at__gte=timezone.now() - timedelta(hours=24)).count()

    discrepancies = []
    for product in Product.objects.all().only("id", "name", "sku", "stock_count"):
        latest = StockMovement.objects.filter(product=product).order_by("-created_at").first()
        if latest and latest.balance_after != product.stock_count:
            discrepancies.append(
                {
                    "product": {"id": product.pk, "name": product.name, "sku": product.sku},
                    "stock_count": product.stock_count,
                    "ledger_balance": latest.balance_after,
                }
            )

    sitemap_status = SearchConsoleSitemapStatus.objects.first()

    paid_not_shipped = Order.objects.filter(
        status__in=["paid", "processing"], paid_at__lt=timezone.now() - timedelta(days=PAID_NOT_SHIPPED_DAYS)
    ).count()

    return {
        "kavenegar_credit": kavenegar_credit,
        "kavenegar_threshold_breached": kavenegar_credit is not None and kavenegar_credit < KAVENEGAR_CREDIT_THRESHOLD,
        "gateways": gateways,
        "payment_errors_24h": payment_errors_24h,
        "stock_discrepancies": discrepancies[:10],
        "sitemap_last_read_at": sitemap_status.last_read_at.isoformat() if sitemap_status and sitemap_status.last_read_at else None,
        "sitemap_discovered_urls": sitemap_status.discovered_urls if sitemap_status else 0,
        "paid_not_shipped_over_threshold": paid_not_shipped,
    }


class AdminDashboardView(APIView):
    permission_classes = [IsAdminStaff]

    def get(self, request):
        recent_orders = Order.objects.select_related("user").prefetch_related(*ORDER_PREFETCH).order_by("-created_at")[:10]
        return Response(
            {
                "needs_action": _needs_action(),
                "today": _todays_pulse(),
                "site_visits": _site_visits(),
                "trends": _trends(),
                "since_last_visit": _since_last_visit(request.user),
                "system_health": _system_health(),
                "recent_orders": AdminOrderSerializer(recent_orders, many=True).data,
            }
        )


class AdminDashboardMarkSeenView(APIView):
    permission_classes = [IsAdminStaff]

    def post(self, request):
        request.user.last_dashboard_visit = timezone.now()
        request.user.save(update_fields=["last_dashboard_visit"])
        return Response({"last_dashboard_visit": request.user.last_dashboard_visit.isoformat()})
