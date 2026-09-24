from django.utils import timezone
from django.utils.safestring import mark_safe

from apps.settings.models import SiteSettings

from .pdf import jetbrains_mono_font_uri, peyda_font_uri, store_wordmark_svg
from .persian import format_jalali_date


def base_context(
    *,
    doc_title: str,
    generated_by_name: str,
    filter_summary: str = "",
    doc_number: str = "",
    doc_date: str = "",
) -> dict:
    """Shared header/font context every document template needs — see
    apps/documents/templates/documents/base.html. `doc_number`/`doc_date` are
    the two values shown at the start (visual right) of the page header per
    the §5 brand spec; documents without a natural document number (reports,
    lists) leave `doc_number` blank and the header falls back to the
    generation date alone."""
    settings_obj = SiteSettings.load()
    generated_at = format_jalali_date(timezone.localtime(timezone.now()))
    return {
        "doc_title": doc_title,
        "filter_summary": filter_summary,
        "generated_at": generated_at,
        "generated_by": generated_by_name,
        "doc_number": doc_number,
        "doc_date": doc_date or generated_at,
        "business_name": settings_obj.business_name or "آربایت",
        "seller_address": settings_obj.address,
        "wordmark_svg": mark_safe(store_wordmark_svg()),
        "font_regular": peyda_font_uri("Peyda-Regular.woff2"),
        "font_medium": peyda_font_uri("Peyda-Medium.woff2"),
        "font_semibold": peyda_font_uri("Peyda-SemiBold.woff2"),
        "font_bold": peyda_font_uri("Peyda-Bold.woff2"),
        "mono_regular": jetbrains_mono_font_uri("JetBrainsMono-Regular.woff2"),
        "mono_bold": jetbrains_mono_font_uri("JetBrainsMono-Bold.woff2"),
    }
