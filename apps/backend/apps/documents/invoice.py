from django.core.files.base import ContentFile
from django.utils import timezone

from apps.orders.models import Order

from .arbyte_context import arbyte_base_context
from .arbyte_formatting import amount_in_words_fa, format_jalali_date_fa, format_toman_fa
from .pdf import arbyte_footer_template, render_pdf


def build_invoice_context(order: Order) -> dict:
    """E-04 §۱ — بازسازی با هویت آربایت (فونت Estedad، ارقام فارسی، پالت
    برند). فروشنده از SiteSettings؛ خریدار شخصی یا حقوقی (E-02 §۴ فیلدهای
    invoice_type/company_name/...). اقلام از snapshot سفارش، نه قیمت فعلی
    محصول (که می‌تواند از زمان خرید عوض شده باشد)."""
    successful_payment = order.payments.filter(status="CONFIRMED").order_by("-updated_at").first()
    invoice_date = format_jalali_date_fa(order.paid_at or order.created_at)
    shipment = getattr(order, "shipment", None)

    ctx = arbyte_base_context(doc_title="فاکتور فروش", doc_number=order.order_number, doc_date=invoice_date)
    ctx.update(
        {
            "order": order,
            "invoice_date": invoice_date,
            "is_corporate": order.invoice_type == "CORPORATE",
            "buyer_name": order.shipping_recipient_name,
            "buyer_phone": order.shipping_mobile,
            "buyer_company_name": order.company_name,
            "buyer_national_id": order.national_id,
            "buyer_economic_code": order.economic_code,
            "buyer_registration_number": order.registration_number,
            # E-04 §۰ — ویرگول فارسی «،» برای متن نمایشی، نه لاتین (سند
            # PDF لایه‌ی نمایش است، برخلاف order_views.py's پاسخ API خام).
            "shipping_address_line": "، ".join(
                part for part in [order.shipping_province, order.shipping_city, order.shipping_address_line] if part
            ),
            "postal_code": order.shipping_postal_code or "",
            "items": [
                {
                    "name": item.product_name_snapshot,
                    "variant_label": item.variant_name_snapshot,
                    "sku": item.sku_snapshot,
                    "quantity": item.quantity,
                    "unit_price": format_toman_fa(item.unit_price),
                    "discount": format_toman_fa(item.discount) if item.discount else "",
                    "subtotal": format_toman_fa(item.final_price),
                }
                for item in order.items.all()
            ],
            "subtotal": format_toman_fa(order.subtotal),
            "discount_total": format_toman_fa(order.discount_total) if order.discount_total else "",
            "shipping_cost": format_toman_fa(order.shipping_cost) if order.shipping_cost else "",
            "total": format_toman_fa(order.final_total),
            "total_in_words": amount_in_words_fa(order.final_total),
            "payment": successful_payment,
            "payment_method_display": successful_payment.get_method_display() if successful_payment else "",
            "payment_ref_id": successful_payment.provider_ref if successful_payment else "",
            "tracking_code": shipment.tracking_number if shipment else "",
        }
    )
    return ctx


def get_invoice_pdf(order: Order, *, generated_by_name: str = "") -> bytes:
    """`generated_by_name` دیگر در سند نمایش داده نمی‌شود (فاکتور آربایت
    خودکار است، نه «تهیه‌شده توسط»ی گزارش‌های ادمین وایب) -- پارامتر فقط
    برای سازگاری با فراخوان‌های موجود (admin_api) نگه داشته شده.

    کش روی Order.invoice_pdf -- فقط بار اول یا اگر سفارش بعد از آخرین
    تولید تغییر کرده باشد دوباره رندر می‌شود (E-04 §۱: «کش شود، با تغییر
    سفارش باطل شود»)."""
    is_stale = not order.invoice_pdf or not order.invoice_pdf_generated_at or order.invoice_pdf_generated_at < order.updated_at
    if not is_stale:
        order.invoice_pdf.open("rb")
        try:
            return order.invoice_pdf.read()
        finally:
            order.invoice_pdf.close()

    context = build_invoice_context(order)
    pdf_bytes = render_pdf(
        "arbyte/invoice.html", context, margin="12mm", footer_html=arbyte_footer_template(generated_at=context["generated_at"])
    )
    order.invoice_pdf.save(f"{order.order_number}.pdf", ContentFile(pdf_bytes), save=False)
    order.invoice_pdf_generated_at = timezone.now()
    order.save(update_fields=["invoice_pdf", "invoice_pdf_generated_at"])
    return pdf_bytes
