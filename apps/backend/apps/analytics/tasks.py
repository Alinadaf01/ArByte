from celery import shared_task
from django.utils import timezone

BOT_MARKERS = ("bot", "spider", "crawl", "slurp", "bingpreview", "facebookexternalhit", "headless")


def is_bot_user_agent(user_agent: str) -> bool:
    ua = (user_agent or "").lower()
    return any(marker in ua for marker in BOT_MARKERS)


@shared_task
def record_page_view(
    *, path: str, visitor_hash: str, referrer: str = "", user_agent: str = "", product_slug: str | None = None
) -> None:
    """Off the request/response cycle entirely — recording must never slow
    down the page the visitor is looking at."""
    from .models import PageView

    PageView.objects.create(
        path=path,
        visitor_hash=visitor_hash,
        referrer=referrer,
        user_agent=user_agent,
        is_bot=is_bot_user_agent(user_agent),
        product_slug=product_slug or None,
    )


@shared_task
def aggregate_daily_stats(days_to_keep: int = 90) -> None:
    """Nightly: roll yesterday's PageView rows into DailyStat, then purge
    anything older than the retention window. Run via Celery beat."""
    from apps.orders.models import Order

    from .models import DailyStat, PageView

    today = timezone.localdate()
    yesterday = today - timezone.timedelta(days=1)
    start = timezone.make_aware(timezone.datetime.combine(yesterday, timezone.datetime.min.time()))
    end = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))

    day_views = PageView.objects.filter(created_at__gte=start, created_at__lt=end, is_bot=False)
    page_views = day_views.count()
    unique_visitors = day_views.values("visitor_hash").distinct().count()

    day_orders = Order.objects.filter(paid_at__gte=start, paid_at__lt=end)
    orders_count = day_orders.count()
    revenue = sum(day_orders.values_list("total", flat=True))

    DailyStat.objects.update_or_create(
        date=yesterday,
        defaults={
            "page_views": page_views,
            "unique_visitors": unique_visitors,
            "orders": orders_count,
            "revenue": revenue,
        },
    )

    cutoff = today - timezone.timedelta(days=days_to_keep)
    PageView.objects.filter(created_at__date__lt=cutoff).delete()
