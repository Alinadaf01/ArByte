import base64

from celery import shared_task

from .pdf import render_pdf


@shared_task
def render_pdf_task(template_name: str, context: dict, *, landscape: bool = False) -> str:
    """Returns base64 text, not raw bytes — Celery's JSON serializer can't carry bytes."""
    pdf_bytes = render_pdf(template_name, context, landscape=landscape)
    return base64.b64encode(pdf_bytes).decode("ascii")


def render_pdf_async(template_name: str, context: dict, *, landscape: bool = False, timeout: int = 60) -> bytes:
    """For documents whose size is unbounded — BACKEND-TASK.md §3.6: 'تولید در
    Celery، نه در چرخه درخواست — گزارش هزار ردیفی تایم‌اوت می‌دهد'. Offloads
    the Chromium render to a worker process so a large report can't stall (or
    crash) a web worker; the view still blocks for the result since there's
    no download-later/polling UI yet, but the expensive work itself runs
    off-process."""
    async_result = render_pdf_task.delay(template_name, context, landscape=landscape)
    encoded = async_result.get(timeout=timeout)
    return base64.b64decode(encoded)
