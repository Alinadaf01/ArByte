"""DEMO — فاکتور، برگه‌ی بسته‌بندی، برچسب ارسال و لیست ارسال روزانه با یک
سفارش نمونه‌ی کامل. همه‌ی داده داخل یک تراکنش ساخته و در پایان rollback
می‌شود (هیچ رکوردی در دیتابیس نمی‌ماند)؛ همه‌ی متن‌های نمونه برچسب DEMO
دارند.

    python manage.py render_document_demos
"""

import datetime
import uuid
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.documents.daily_shipping_list import render_daily_shipping_list_pdf
from apps.documents.invoice import build_invoice_context
from apps.documents.packing_slip import render_packing_slip_pdf
from apps.documents.pdf import arbyte_footer_template, render_pdf
from apps.documents.shipping_label import render_shipping_label_pdf
from apps.orders.models import Order, OrderItem, OrderItemUnit, Payment, Shipment
from apps.settings.models import SiteSettings
from apps.users.models import User

DEFAULT_OUT = Path(__file__).resolve().parents[6] / "docs" / "design" / "documents"

_ITEMS = [
    # (نام، برند، مدل، شرایط، واریانت، SKU، قیمت، تخفیف)
    (
        "لپ‌تاپ گیمینگ MSI Titan 18 HX AI (DEMO)",
        "MSI",
        "A2XWJG",
        "NEW",
        "RTX 5080 / 32GB / 2TB",
        "DEMO-MSI-T18",
        189_000_000,
        4_000_000,
    ),
    ("سرفیس پرو ۹ (DEMO)", "Microsoft", "Surface Pro 9", "STOCK", "i7 / 16GB / 256GB", "DEMO-SP9", 42_500_000, 0),
    (
        "کیس گیمینگ آربایت RTX 5070 Ti (DEMO)",
        "ArByte",
        "AB-G5070TI",
        "LIKE_NEW",
        "Ryzen 7 9800X3D / 32GB",
        "DEMO-ABG-5070",
        96_000_000,
        0,
    ),
]


def _build_demo_order() -> Order:
    s = SiteSettings.load()
    s.business_name = "فروشگاه آربایت (DEMO)"
    s.national_id = "10860000000"
    s.economic_code = "411000000000"
    s.address = "تهران، نشانی نمونه‌ی فروشگاه (DEMO)"
    s.postal_code = "1000000000"
    s.phone_display = "۰۲۱-۰۰۰۰۰۰۰۰"
    s.save()

    user = User.objects.create_user(phone="09120000999", is_verified=True)
    # slug یکتا: داده‌ی rollback‌شونده نباید با داده‌ی seed موجود در DB توسعه برخورد کند.
    category = Category.objects.create(slug=f"demo-doc-laptops-{uuid.uuid4().hex[:8]}", name="لپ‌تاپ (DEMO)")
    subtotal = sum(price for *_, price, _ in _ITEMS)
    discount = sum(d for *_, d in _ITEMS)
    order = Order.objects.create(
        user=user,
        shipping_recipient_name="مشتری نمونه (DEMO)",
        shipping_mobile="09120000000",
        shipping_province="تهران",
        shipping_city="تهران",
        shipping_address_line="خیابان نمونه، کوچه‌ی نمونه، پلاک ۱۰، واحد ۲ (DEMO)",
        shipping_postal_code="1000000001",
        subtotal=subtotal,
        discount_total=discount,
        shipping_cost=0,
        shipping_method_name="پست پیشتاز",
        final_total=subtotal - discount,
        paid_at=timezone.now(),
    )
    for i, (name, brand_name, model, condition, variant_name, sku, price, disc) in enumerate(_ITEMS):
        brand, _ = Brand.objects.get_or_create(name=brand_name, defaults={"slug": f"demo-brand-{i}"})
        product = Product.objects.create(
            slug=f"demo-product-{i}",
            name=name,
            brand=brand,
            category=category,
            condition=condition,
            model_number=model,
            warranty_months=24 if i == 0 else None,
            warranty_provider="گارانتی شرکتی (DEMO)" if i == 0 else None,
        )
        variant = ProductVariant.objects.create(
            product=product, sku=sku, name=variant_name, is_default=True, final_price=price
        )
        item = OrderItem.objects.create(
            order=order,
            variant=variant,
            product_name_snapshot=name,
            variant_name_snapshot=variant_name,
            sku_snapshot=sku,
            unit_price=price,
            quantity=1,
            discount=disc,
            final_price=price - disc,
        )
        OrderItemUnit.objects.create(order_item=item, serial_number=f"DEMO-SN-{i + 1:04d}")
    Payment.objects.create(
        order=order,
        method="GATEWAY",
        gateway="ZARINPAL",
        amount=order.final_total,
        status="CONFIRMED",
        provider_ref="DEMO-REF-7788990",
    )
    Shipment.objects.create(
        order=order, provider="پست پیشتاز", tracking_number="DEMO-TRK-000123", shipped_at=timezone.now()
    )
    return order


class Command(BaseCommand):
    help = "DEMO — فاکتور/برگه‌ی بسته‌بندی/برچسب/لیست روزانه را با داده‌ی نمونه‌ی موقت (rollback) رندر می‌کند."

    def add_arguments(self, parser):
        parser.add_argument("--out", default=str(DEFAULT_OUT))

    def handle(self, *args, out, **options):
        out_dir = Path(out)
        out_dir.mkdir(parents=True, exist_ok=True)
        with transaction.atomic():
            order = _build_demo_order()
            ctx = build_invoice_context(order)
            files = {
                # render_pdf مستقیم، نه get_invoice_pdf — آن نسخه را در media کش می‌کند.
                "invoice-demo.pdf": render_pdf(
                    "arbyte/invoice.html",
                    ctx,
                    margin="12mm",
                    footer_html=arbyte_footer_template(generated_at=ctx["generated_at"]),
                ),
                "packing-slip-demo.pdf": render_packing_slip_pdf(order),
                "shipping-label-demo.pdf": render_shipping_label_pdf(order),
                "daily-shipping-list-demo.pdf": render_daily_shipping_list_pdf(
                    Order.objects.filter(pk=order.pk), target_date=datetime.date.today()
                ),
            }
            transaction.set_rollback(True)
        for name, data in files.items():
            (out_dir / name).write_bytes(data)
        self.stdout.write(self.style.SUCCESS(f"document demos → {out_dir}"))
