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
    second sequence purely for document display."""
    address = order.shipping_address or {}
    successful_payment = order.payments.filter(status="success").order_by("-verified_at").first()
    invoice_date = format_jalali_date(order.paid_at or order.created_at)
    settings_obj = SiteSettings.load()

    ctx = base_context(
        doc_title="فاکتور فروش",
        generated_by_name=generated_by_name,
        doc_number=order.number,
        doc_date=invoice_date,
    )
    ctx.update(
        {
            "order": order,
            "invoice_date": invoice_date,
            "seller_economic_code": settings_obj.economic_code,
            "seller_national_id": settings_obj.national_id,
            "buyer_name": address.get("receiverName", ""),
            "buyer_phone": address.get("receiverPhone", ""),
            "shipping_address_line": ", ".join(
                part for part in [address.get("province", ""), address.get("city", ""), address.get("line", "")] if part
            ),
            "postal_code": address.get("postalCode", ""),
            "items": [
                {
                    "name": item.product_name + (f" ({item.color_name})" if item.color_name else ""),
                    "sku": item.sku,
                    "quantity": item.quantity,
                    "price": format_toman(item.price),
                    "subtotal": format_toman(item.subtotal),
                }
                for item in order.items.all()
            ],
            "subtotal": format_toman(order.subtotal),
            "discount": format_toman(order.discount),
            "shipping_cost": format_toman(order.shipping_cost),
            "tax": format_toman(order.tax),
            "total": format_toman(order.total),
            "total_in_words": f"{amount_in_words(order.total)} تومان",
            "payment": successful_payment,
            "payment_gateway_display": successful_payment.get_gateway_display() if successful_payment else "",
            "payment_ref_id": successful_payment.ref_id if successful_payment else "",
            "tracking_code": order.tracking_code,
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
    order.invoice_pdf.save(f"{order.number}.pdf", ContentFile(pdf_bytes), save=False)
    order.invoice_pdf_generated_at = timezone.now()
    order.save(update_fields=["invoice_pdf", "invoice_pdf_generated_at"])
    return pdf_bytes
