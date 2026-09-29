"""E-04 §۲/۳ — تولید QR/بارکد سمت سرور، SVG (بدون جاوااسکریپت سمت کلاینت،
بریف اصلاح ۱۰: «سند باید در Chromium headless بدون JS درست رندر شود» —
QR/بارکد هم باید از قبل رندر شده باشند، نه با یک کتابخانه‌ی JS در صفحه)."""

import io

import barcode
import qrcode
import qrcode.image.svg
from barcode.writer import SVGWriter
from django.utils.safestring import SafeString, mark_safe


def qr_code_svg(data: str, *, box_size: int = 8) -> SafeString:
    """مسیر واقعی پیگیری سفارش (بریف اصلاح ۷) -- بدون صفحه‌ی «استعلام
    اصالت» ساختگی. خروجی مستقیم <svg> قابل inline در قالب."""
    image = qrcode.make(data, image_factory=qrcode.image.svg.SvgPathImage, box_size=box_size)
    buffer = io.BytesIO()
    image.save(buffer)
    return mark_safe(buffer.getvalue().decode("utf-8"))


def code128_barcode_svg(data: str, *, module_height: float = 15.0) -> SafeString:
    """برچسب ارسال -- بارکد Code128 شماره سفارش، سیاه‌وسفید، برای چاپگر
    حرارتی. `write_text=False` چون شماره سفارش خودش به‌صورت متن خوانا در
    قالب کنار بارکد می‌آید (فونت Estedad، نه فونت داخلی کتابخانه)."""
    code = barcode.get("code128", data, writer=SVGWriter())
    buffer = io.BytesIO()
    code.write(buffer, options={"write_text": False, "module_height": module_height, "quiet_zone": 2.0})
    return mark_safe(buffer.getvalue().decode("utf-8"))
