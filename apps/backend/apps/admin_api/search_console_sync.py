"""همگام‌سازی شبانه‌ی سرچ کنسول — فقط عملکرد/کلیدواژه‌ها/صفحات (Search Analytics
API)؛ «تعداد صفحات ایندکس‌شده» عمداً ساخته نشد چون API رسمی‌اش ندارد (فقط
URL Inspection تک‌به‌تک، کند و محدود — طبق تصمیم صاحب‌کار).

راه‌اندازی (یک‌بار، سمت کاربر در Google Cloud Console):
  ۱. یک پروژه در https://console.cloud.google.com بسازید (یا از پروژه‌ی
     موجود استفاده کنید) و «Google Search Console API» را روی آن فعال کنید.
  ۲. از مسیر IAM & Admin → Service Accounts یک سرویس‌اکانت تازه بسازید،
     نیازی به هیچ نقشی (role) در GCP ندارد.
  ۳. یک کلید JSON برای همان سرویس‌اکانت بسازید و دانلود کنید (Keys → Add
     Key → JSON).
  ۴. در https://search.google.com/search-console → تنظیمات پروپرتی →
     «کاربران و دسترسی‌ها»، ایمیل سرویس‌اکانت (فیلد client_email داخل همان
     JSON) را به‌عنوان کاربر «Full» اضافه کنید.
  ۵. در پنل ادمین آربایت → تنظیمات → کلیدهای API → «سرچ کنسول»: کل محتوای
     فایل JSON را در فیلد serviceAccount و آدرس پروپرتی (مثلاً
     sc-domain:arbyte.ir) را در فیلد siteUrl وارد کنید، سپس فعال کنید.
"""

import logging
from datetime import timedelta

from django.utils import timezone
from google.oauth2 import service_account
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
# سرچ کنسول معمولاً داده‌ی ۲-۳ روز اخیر را هنوز نهایی نکرده؛ ترب/آنالیتیکس
# مشابه هم با تأخیر چند روزه کار می‌کنند.
DATA_DELAY_DAYS = 3
LOOKBACK_DAYS = 90


class SearchConsoleNotConfigured(Exception):
    pass


def _credentials_and_site():
    import json

    from apps.settings.models import ApiCredential

    row = ApiCredential.objects.filter(service="search_console", is_active=True).first()
    if not row or not row.has_valid_credentials():
        raise SearchConsoleNotConfigured("اطلاعات ورود سرچ کنسول تنظیم یا فعال نشده است.")
    data = json.loads(row.credentials)
    account = data.get("serviceAccount")
    site_url = data.get("siteUrl")
    if not account or not site_url:
        raise SearchConsoleNotConfigured("credentials باید شامل serviceAccount و siteUrl باشد.")
    # فرم پنل مقدار هر کلید را رشته‌ی خام نگه می‌دارد (ویرایشگر key/value
    # عمومی، نه JSON تودرتو) — یعنی کل فایل سرویس‌اکانت این‌جا یک رشته‌ی
    # JSON است، نه دیکشنری از پیش پارس‌شده.
    if isinstance(account, str):
        try:
            account = json.loads(account)
        except (TypeError, ValueError) as exc:
            raise SearchConsoleNotConfigured("serviceAccount باید متن کامل فایل JSON سرویس‌اکانت باشد.") from exc
    creds = service_account.Credentials.from_service_account_info(account, scopes=SCOPES)
    return creds, site_url


def _query(service, site_url, *, start, end, dimensions, row_limit=1000):
    body = {
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "dimensions": dimensions,
        "rowLimit": row_limit,
    }
    resp = service.searchanalytics().query(siteUrl=site_url, body=body).execute()
    return resp.get("rows", [])


def sync() -> dict:
    """امروز منهای DATA_DELAY_DAYS تا LOOKBACK_DAYS روز قبل‌ترش را می‌خواند و
    جایگزین می‌کند (نه append — سرچ کنسول گاهی اعداد چند روز اخیر را خودش
    بازبینی می‌کند، پس rows قدیمی‌تر از بازه هم دست‌نخورده می‌مانند)."""
    from .models import SearchConsolePage, SearchConsolePerformance, SearchConsoleQuery

    creds, site_url = _credentials_and_site()
    service = build("searchconsole", "v1", credentials=creds, cache_discovery=False)

    end = timezone.now().date() - timedelta(days=DATA_DELAY_DAYS)
    start = end - timedelta(days=LOOKBACK_DAYS)

    # ۱) عملکرد روزانه (date dimension) → SearchConsolePerformance
    perf_rows = _query(service, site_url, start=start, end=end, dimensions=["date"])
    perf_saved = 0
    for row in perf_rows:
        date_str = row["keys"][0]
        SearchConsolePerformance.objects.update_or_create(
            date=date_str,
            defaults={
                "impressions": int(row.get("impressions", 0)),
                "clicks": int(row.get("clicks", 0)),
                "ctr": round(row.get("ctr", 0), 4),
                "avg_position": round(row.get("position", 0), 1),
            },
        )
        perf_saved += 1

    # ۲) کلیدواژه‌ها (query dimension) — فقط بازه‌ی اخیر (۲۸ روز) تا جدول
    # متورم نشود، مطابق چیزی که پنل عملاً نشان می‌دهد.
    recent_start = end - timedelta(days=28)
    query_rows = _query(service, site_url, start=recent_start, end=end, dimensions=["query"], row_limit=500)
    SearchConsoleQuery.objects.filter(date__gte=recent_start, date__lte=end).delete()
    query_saved = 0
    for row in query_rows:
        SearchConsoleQuery.objects.create(
            date=end,
            query=row["keys"][0][:255],
            impressions=int(row.get("impressions", 0)),
            clicks=int(row.get("clicks", 0)),
            ctr=round(row.get("ctr", 0), 4),
            position=round(row.get("position", 0), 1),
        )
        query_saved += 1

    # ۳) صفحات (page dimension)
    page_rows = _query(service, site_url, start=recent_start, end=end, dimensions=["page"], row_limit=500)
    SearchConsolePage.objects.filter(date__gte=recent_start, date__lte=end).delete()
    page_saved = 0
    for row in page_rows:
        SearchConsolePage.objects.create(
            date=end,
            page=row["keys"][0][:500],
            impressions=int(row.get("impressions", 0)),
            clicks=int(row.get("clicks", 0)),
            ctr=round(row.get("ctr", 0), 4),
            position=round(row.get("position", 0), 1),
        )
        page_saved += 1

    logger.info(
        "search console sync: performance=%d queries=%d pages=%d", perf_saved, query_saved, page_saved
    )
    return {"performance": perf_saved, "queries": query_saved, "pages": page_saved}
