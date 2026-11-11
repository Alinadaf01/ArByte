from .arbyte_context import arbyte_base_context
from .pdf import render_pdf


def build_device_label_context(label) -> dict:
    """لیبل داخلی — فقط بک‌اند، هرگز مشتری/مسیر عمومی نمی‌بیند (درخواست
    مدیر). همان قالب اسناد آربایت (لوگو/فونت) برای یکدست‌بودن چاپ، ولی
    محتوایش کاملاً دستی است -- هیچ ارتباطی به Product/Order ندارد."""
    ctx = arbyte_base_context(doc_title="لیبل مشخصات دستگاه", doc_number=label.code, logo_variant="mono-black")
    specs = [
        ("مدل", label.model_number),
        ("پردازنده", label.cpu),
        ("حافظه رم", label.ram),
        ("حافظه داخلی", label.storage),
        ("نمایشگر", label.display),
    ]
    battery_parts = []
    if label.battery_health_percent is not None:
        battery_parts.append(f"سلامت باتری {label.battery_health_percent}٪")
    if label.battery_cycle_count is not None:
        battery_parts.append(f"سایکل {label.battery_cycle_count}")
    storage_line = f"سلامت هارد {label.storage_health_percent}٪" if label.storage_health_percent is not None else ""
    ctx.update(
        {
            "code": label.code,
            "device_name": label.device_name,
            "specs": [(name, value) for name, value in specs if value],
            "battery_line": " · ".join(battery_parts),
            "storage_health_line": storage_line,
            "grade": label.get_grade_display() if label.grade else "",
            "defect_notes": label.defect_notes,
        }
    )
    return ctx


def render_device_label_pdf(label) -> bytes:
    context = build_device_label_context(label)
    return render_pdf("arbyte/device_label.html", context, page_format="A5", margin="5mm", footer_html="")
