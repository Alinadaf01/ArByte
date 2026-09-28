from django.core.files.base import ContentFile
from django.utils import timezone

from apps.orders.models import Order
from apps.settings.models import SiteSettings

from .context import base_context
from .pdf import render_pdf
from .persian import amount_in_words, format_jalali_date, format_toman


def build_invoice_context(order: Order, *, generated_by_name: str) -> dict:
    """Shared by the customer-facing invoice (GET /api/orders/{number}/invoice.pdf)
    and the admin one (GET /api/admin/orders/{id}/invoice.pdf) — same document,
    BACKEND-TASK.md §3.6-ب: 'فاکتور فروش — همان سند بالا، از سمت ادمین'.

    No separate invoice-numbering sequence exists in this app, so the order
    number doubles as the invoice number (§5 order-info bar shows both
    labels, same value) — a deliberate simplification rather than adding a
    second sequence purely for document display.

    D-05 §۱/۳ — آدرس دیگر یک JSON blob نیست (فیلدهای شناخته‌شده روی خودِ
    Order)؛ Payment موفق یعنی status="CONFIRMED" (نه "success" قدیمی)،
    ref_id تغییر نام داد به provider_ref، tax کلاً حذف شد (نه در Prisma،
    نرخ مالیات هیچ‌وقت پیکربندی نشد)."""
    successful_payment = order.payments.filter(status="CONFIRMED").order_by("-updated_at").first()
    invoice_date = format_jalali_date(order.paid_at or order.created_at)
    settings_obj = SiteSettings.load()
    shipment = getattr(order, "shipment", None)

    ctx = base_context(
        doc_title="فاکتور فروش",
        generated_by_name=generated_by_name,
        doc_number=order.order_number,
        doc_date=invoice_date,
    )
    ctx.update(
        {
            "order": order,
            "invoice_date": invoice_date,
            "seller_economic_code": settings_obj.economic_code,
            "seller_national_id": settings_obj.national_id,
            "buyer_name": order.shipping_recipient_name,
            "buyer_phone": order.shipping_mobile,
            "shipping_address_line": ", ".join(
                part for part in [order.shipping_province, order.shipping_city, order.shipping_address_line] if part
            ),
            "postal_code": order.shipping_postal_code or "",
            "items": [
                {
                    "name": item.product_name_snapshot
                    + (f" ({item.variant_name_snapshot})" if item.variant_name_snapshot else ""),
                    "sku": item.sku_snapshot,
                    "quantity": item.quantity,
                    "price": format_toman(item.unit_price),
                    "subtotal": format_toman(item.subtotal),
                }
                for item in order.items.all()
            ],
            "subtotal": format_toman(order.subtotal),
            "discount": format_toman(order.discount_total),
            "shipping_cost": format_toman(order.shipping_cost),
            "total": format_toman(order.final_total),
            "total_in_words": f"{amount_in_words(order.final_total)} تومان",
            "payment": successful_payment,
            "payment_method_display": successful_payment.get_method_display() if successful_payment else "",
            "payment_ref_id": successful_payment.provider_ref if successful_payment else "",
            "tracking_code": shipment.tracking_number if shipment else "",
        }
    )
    return ctx


def get_invoice_pdf(order: Order, *, generated_by_name: str) -> bytes:
    """Cached on Order.invoice_pdf — regenerated only the first time, or
    again if the order changed since (e.g. a tracking code was added after
    shipping). BACKEND-TASK.md §3.6: 'فایل تولیدشده کش شود؛ فاکتور یک سفارش
    پرداخت‌شده دیگر تغییر نمی‌کند'."""
    is_stale = not order.invoice_pdf or not order.invoice_pdf_generated_at or order.invoice_pdf_generated_at < order.updated_at
    if not is_stale:
        order.invoice_pdf.open("rb")
        try:
            return order.invoice_pdf.read()
        finally:
            order.invoice_pdf.close()

    context = build_invoice_context(order, generated_by_name=generated_by_name)
    pdf_bytes = render_pdf("documents/invoice.html", context)
    order.invoice_pdf.save(f"{order.order_number}.pdf", ContentFile(pdf_bytes), save=False)
    order.invoice_pdf_generated_at = timezone.now()
    order.save(update_fields=["invoice_pdf", "invoice_pdf_generated_at"])
    return pdf_bytes
