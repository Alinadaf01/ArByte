from celery import shared_task


@shared_task
def run_import_job(job_id: int) -> None:
    """F-03 §۲ — اجرای ورود اکسل بیرون از درخواست وب."""
    from .importer import execute_job
    from .models import ImportJob

    execute_job(ImportJob.objects.get(pk=job_id))


@shared_task
def revalidate_campaign_boundaries(window_minutes: int = 6) -> int:
    """F-03 §۳ — هر چند دقیقه: کمپین‌هایی که در همین بازه شروع یا تمام شده‌اند
    صفحه‌های فروشگاهشان revalidate می‌شود (قیمت خودش زمان‌محور است)."""
    from datetime import timedelta

    from django.db.models import Q
    from django.utils import timezone

    from apps.admin_api.campaigns import _revalidate_campaign
    from apps.catalog.pricing import reset_campaign_cache
    from apps.content.models import Campaign

    now = timezone.now()
    since = now - timedelta(minutes=window_minutes)
    campaigns = Campaign.objects.filter(Q(start_at__gt=since, start_at__lte=now) | Q(end_at__gt=since, end_at__lte=now))
    reset_campaign_cache()
    for campaign in campaigns:
        _revalidate_campaign(campaign)
    return campaigns.count()
