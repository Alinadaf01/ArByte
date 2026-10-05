"""AUDIT-1 §12.7 — آدرس تصویر عمومی: یا قابل‌رندر با next/image، یا None.

فروشگاه `/media` را به Django rewrite می‌کند و next/image فقط مسیر هم‌مبدأ
(نسبی) را بهینه می‌کند؛ `src` خالی یا میزبان پیکربندی‌نشده کارت/صفحه را
می‌شکند. هر خروجی تصویر کاتالوگ/وبلاگ از همین تابع رد می‌شود.
"""

from django.conf import settings


def public_media_url(url: str | None) -> str | None:
    if not url or not url.strip():
        return None
    url = url.strip()
    for base in (settings.BACKEND_BASE_URL, settings.FRONTEND_BASE_URL):
        origin = (base or "").rstrip("/")
        if origin and url.startswith(f"{origin}/"):
            return url[len(origin) :]
    if url.startswith(("/", "http://", "https://", "data:")):
        return url
    return f"/{url}"
