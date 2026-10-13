import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def sync_search_console() -> None:
    """شبانه — اگر credentials هنوز تنظیم/فعال نشده فقط لاگ می‌کند، خطا نمی‌دهد."""
    from .search_console_sync import SearchConsoleNotConfigured, sync

    try:
        result = sync()
        logger.info("search console sync done: %s", result)
    except SearchConsoleNotConfigured as exc:
        logger.info("search console sync skipped: %s", exc)
