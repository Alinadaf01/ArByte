from django.utils import timezone

from apps.settings.models import SiteSettings

from .arbyte_formatting import format_jalali_date_fa
from .pdf import brand_logo_uri, estedad_font_uri


def arbyte_base_context(
    *,
    doc_title: str,
    doc_number: str = "",
    doc_date: str = "",
    logo_variant: str = "horizontal-light",
) -> dict:
    """E-04 §۰ — پایه‌ی مشترک سه سند مشتری‌محور (فاکتور/بسته‌بندی/برچسب/
    گارانتی). جدا از apps.documents.context.base_context (گزارش‌های ادمین
    وایب، Peyda/گرافیت) -- دو خط عمداً مستقل‌اند."""
    settings_obj = SiteSettings.load()
    generated_at = format_jalali_date_fa(timezone.localtime(timezone.now()))
    return {
        "doc_title": doc_title,
        "doc_number": doc_number,
        "doc_date": doc_date or generated_at,
        "generated_at": generated_at,
        "seller_name": settings_obj.business_name or "آربایت",
        "seller_national_id": settings_obj.national_id,
        "seller_economic_code": settings_obj.economic_code,
        "seller_address": settings_obj.address,
        "seller_postal_code": settings_obj.postal_code,
        "seller_phone": settings_obj.phone_display,
        "logo_uri": brand_logo_uri(f"logo-{logo_variant}.png"),
        "font_regular": estedad_font_uri("Estedad-400.woff2"),
        "font_medium": estedad_font_uri("Estedad-500.woff2"),
        "font_semibold": estedad_font_uri("Estedad-600.woff2"),
        "font_bold": estedad_font_uri("Estedad-700.woff2"),
    }
