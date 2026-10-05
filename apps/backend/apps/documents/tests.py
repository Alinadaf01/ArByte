"""E-04 — رندر واقعی سه سند (Chromium/Playwright)، حالت کوتاه/بلند هر کدام
(سند تسک §۰: «نام محصول ۱۲۰ کاراکتری، ۱۵ قلم، شرایط ۲ صفحه‌ای -- بدون
بریدگی/هم‌پوشانی»). PNG صفحه‌ی اول هر حالت در docs/reports برای گزارش،
نه اینجا (رندر واقعی pytest فقط bytes غیرخالی و بدون استثنا را تضمین
می‌کند، مقایسه‌ی بصری با اسکرین‌شات دستی/`/webapp-testing` انجام می‌شود)."""

from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.orders.models import Order, OrderItem, OrderItemUnit, Payment, Shipment
from apps.settings.models import SiteSettings

# D-01 §۴ — cdn.playwright.dev روی این ماشین مسدود است (همان توضیح
# apps/admin_api/tests/test_documents.py)، پس تست‌های خودکار
# sync_playwright را mock می‌کنند -- فقط رندر واقعی Chromium فیک است،
# ساخت context/قالب/HTML واقعی طی می‌شود (خطای قالب همچنان اینجا افتضاح
# می‌شود، چون render_to_string قبل از فراخوانی sync_playwright اجرا می‌شود).
_FAKE_PDF_BYTES = b"%PDF-1.4\n%mocked in tests -- no real Chromium (D-01)\n%%EOF"


def _mock_sync_playwright():
    mock = MagicMock()
    mock.return_value.__enter__.return_value.chromium.launch.return_value.new_page.return_value.pdf.return_value = (
        _FAKE_PDF_BYTES
    )
    return mock


def _configure_seller():
    settings_obj = SiteSettings.load()
    settings_obj.business_name = "فروشگاه آربایت"
    settings_obj.national_id = "10861234567"
    settings_obj.economic_code = "411234567890"
    settings_obj.address = "تهران، خیابان ولیعصر، پلاک ۱۲۳"
    settings_obj.postal_code = "1234567890"
    settings_obj.phone_display = "۰۲۱-۱۲۳۴۵۶۷۸"
    settings_obj.test_period_days = 7
    settings_obj.warranty_terms = "دستگاه در صورت وجود ایراد فنی ساخت، ظرف مهلت گارانتی تعویض یا تعمیر می‌شود."
    settings_obj.save()
    return settings_obj


def _make_product(*, name="لپ‌تاپ تست آربایت", warranty_months=24, requires_serial=True, condition="NEW") -> Product:
    unique = abs(hash(name))
    brand, _ = Brand.objects.get_or_create(name="MSI", defaults={"slug": "msi"})
    category = Category.objects.create(slug=f"cat-{unique}", name="لپ‌تاپ")
    return Product.objects.create(
        slug=f"product-{abs(hash(name))}",
        name=name,
        brand=brand,
        category=category,
        condition=condition,
        model_number="A2XN-001",
        warranty_months=warranty_months,
        warranty_provider="گارانتی شرکتی" if warranty_months else None,
        requires_serial=requires_serial,
    )


def _make_order(*, user, item_count=1, invoice_type="PERSONAL") -> Order:
    order = Order.objects.create(
        user=user,
        shipping_recipient_name="علی رضایی",
        shipping_mobile="09121234567",
        shipping_province="تهران",
        shipping_city="تهران",
        shipping_address_line="خیابان ولیعصر، کوچه‌ی نمونه، پلاک ۴۵",
        shipping_postal_code="1234567890",
        subtotal=item_count * 50_000_000,
        final_total=item_count * 50_000_000,
        invoice_type=invoice_type,
        company_name="شرکت نمونه آربایت" if invoice_type == "CORPORATE" else None,
        national_id="10861111111" if invoice_type == "CORPORATE" else None,
        economic_code="411111111111" if invoice_type == "CORPORATE" else None,
    )
    for i in range(item_count):
        product = _make_product(name=f"لپ‌تاپ ایسوس ROG Strix SCAR 18 نسل جدید مدل {i}")
        variant = ProductVariant.objects.create(
            product=product, sku=f"SKU-{order.id}-{i}", is_default=True, final_price=50_000_000
        )
        item = OrderItem.objects.create(
            order=order,
            variant=variant,
            product_name_snapshot=product.name,
            variant_name_snapshot="32GB/1TB" if i % 2 == 0 else None,
            sku_snapshot=variant.sku,
            unit_price=50_000_000,
            quantity=1,
            discount=1_000_000 if i == 0 else 0,
            final_price=49_000_000 if i == 0 else 50_000_000,
        )
        OrderItemUnit.objects.create(order_item=item, serial_number=f"SN-{order.id}-{i:04d}")
    return order


class InvoicePdfRenderTests(TestCase):
    def setUp(self):
        _configure_seller()
        from apps.users.models import User

        self.user = User.objects.create_user(phone="09121110001", is_verified=True)
        patcher = patch("apps.documents.pdf.sync_playwright", new=_mock_sync_playwright())
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_renders_short_personal_invoice(self):
        from apps.documents.invoice import get_invoice_pdf

        order = _make_order(user=self.user, item_count=1)
        Payment.objects.create(order=order, method="MANUAL_CARD_TO_CARD", amount=order.final_total, status="CONFIRMED")
        pdf_bytes = get_invoice_pdf(order)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_renders_long_corporate_invoice_with_many_items(self):
        from apps.documents.invoice import get_invoice_pdf

        order = _make_order(user=self.user, item_count=15, invoice_type="CORPORATE")
        Payment.objects.create(order=order, method="GATEWAY", amount=order.final_total, status="CONFIRMED", provider_ref="REF-999")
        pdf_bytes = get_invoice_pdf(order)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_invoice_is_cached_until_order_changes(self):
        from apps.documents.invoice import get_invoice_pdf

        order = _make_order(user=self.user, item_count=1)
        first = get_invoice_pdf(order)
        order.refresh_from_db()
        second = get_invoice_pdf(order)
        self.assertEqual(first, second)
        self.assertEqual(order.invoice_pdf_generated_at, Order.objects.get(pk=order.pk).invoice_pdf_generated_at)

    def test_amount_in_words_matches_known_value(self):
        from apps.documents.arbyte_formatting import amount_in_words_fa

        self.assertEqual(amount_in_words_fa(289_500_000), "دویست و هشتاد و نه میلیون و پانصد هزار تومان")

    def test_customer_invoice_endpoint_404_before_paid(self):
        from rest_framework.test import APIClient

        from apps.public_api.jwt_tokens import issue_tokens

        order = _make_order(user=self.user, item_count=1)  # status defaults to PENDING
        access, _ = issue_tokens(self.user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = client.get(f"/api/v1/orders/{order.order_number}/invoice.pdf")
        self.assertEqual(response.status_code, 404)

    def test_customer_invoice_endpoint_available_after_paid(self):
        from rest_framework.test import APIClient

        from apps.orders import order_status
        from apps.public_api.jwt_tokens import issue_tokens

        order = _make_order(user=self.user, item_count=1)
        order_status.transition_to(order, "AWAITING_PAYMENT")
        order_status.transition_to(order, "PAYMENT_REVIEW")
        order_status.transition_to(order, "PAID")
        access, _ = issue_tokens(self.user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = client.get(f"/api/v1/orders/{order.order_number}/invoice.pdf")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")


def _make_single_unit_order(*, user, warranty_months=24, delivered=False, shipped=False, product_name="لپ‌تاپ تست آربایت"):
    """برای تست‌های کارت گارانتی — یک سفارش با دقیقاً یک OrderItemUnit،
    کنترل مستقیم روی وجود گارانتی/تحویل/ارسال."""
    product = _make_product(name=product_name, warranty_months=warranty_months)
    variant = ProductVariant.objects.create(
        product=product, sku=f"SKU-{abs(hash(product_name))}", is_default=True, final_price=50_000_000
    )
    order = Order.objects.create(
        user=user,
        shipping_recipient_name="علی رضایی",
        shipping_mobile="09121234567",
        shipping_province="تهران",
        shipping_city="تهران",
        shipping_address_line="خیابان ولیعصر، کوچه‌ی نمونه، پلاک ۴۵",
        shipping_postal_code="1234567890",
        subtotal=50_000_000,
        final_total=50_000_000,
    )
    if delivered:
        from django.utils import timezone

        order.delivered_at = timezone.now()
        order.save(update_fields=["delivered_at"])
    item = OrderItem.objects.create(
        order=order,
        variant=variant,
        product_name_snapshot=product.name,
        variant_name_snapshot="32GB/1TB",
        sku_snapshot=variant.sku,
        unit_price=50_000_000,
        quantity=1,
        final_price=50_000_000,
    )
    unit = OrderItemUnit.objects.create(order_item=item, serial_number=f"SN-{order.id}-0001")
    if shipped:
        Shipment.objects.create(order=order, provider="پست پیشتاز", tracking_number="TRK-0001")
        order.status = "SHIPPED"
        order.save(update_fields=["status"])
    return order, unit


class WarrantyCardRenderTests(TestCase):
    """E-04 §۳ — پنج حالت بریف/سند تسک: فقط مهلت تست، گارانتی + مهلت تست،
    بدون گارانتی، با اطلاعات ارسال، در انتظار ارسال."""

    def setUp(self):
        _configure_seller()
        from apps.users.models import User

        self.user = User.objects.create_user(phone="09121110099", is_verified=True)
        patcher = patch("apps.documents.pdf.sync_playwright", new=_mock_sync_playwright())
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_state_test_period_only(self):
        from apps.documents.warranty_card import render_warranty_card_pdf

        order, unit = _make_single_unit_order(user=self.user, warranty_months=None, shipped=False)
        pdf_bytes = render_warranty_card_pdf(unit)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_state_warranty_plus_test_period(self):
        from apps.documents.warranty_card import render_warranty_card_pdf

        order, unit = _make_single_unit_order(user=self.user, warranty_months=24, delivered=True)
        pdf_bytes = render_warranty_card_pdf(unit)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_state_no_warranty(self):
        from apps.documents.warranty_card import render_warranty_card_pdf

        order, unit = _make_single_unit_order(user=self.user, warranty_months=None, shipped=True)
        pdf_bytes = render_warranty_card_pdf(unit)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_state_with_shipping_info(self):
        from apps.documents.warranty_card import build_warranty_card, render_warranty_card_pdf

        order, unit = _make_single_unit_order(user=self.user, warranty_months=24, shipped=True)
        card = build_warranty_card(unit)
        self.assertTrue(card["has_shipping"])
        self.assertEqual(card["carrier_name"], "پست پیشتاز")
        pdf_bytes = render_warranty_card_pdf(unit)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_state_awaiting_shipping(self):
        from apps.documents.warranty_card import build_warranty_card, render_warranty_card_pdf

        order, unit = _make_single_unit_order(user=self.user, warranty_months=24, shipped=False)
        card = build_warranty_card(unit)
        self.assertFalse(card["has_shipping"])
        pdf_bytes = render_warranty_card_pdf(unit)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_warranty_dates_start_from_delivery_when_delivered(self):
        from apps.documents.warranty_card import build_warranty_card

        order, unit = _make_single_unit_order(user=self.user, warranty_months=12, delivered=True)
        card = build_warranty_card(unit)
        self.assertTrue(card["test_period"]["known"])
        self.assertTrue(card["warranty"]["known"])

    def test_test_period_shows_placeholder_before_delivery(self):
        from apps.documents.warranty_card import build_warranty_card

        order, unit = _make_single_unit_order(user=self.user, warranty_months=None, delivered=False)
        card = build_warranty_card(unit)
        self.assertFalse(card["test_period"]["known"])
        self.assertEqual(card["test_period"]["start_label"], "از تاریخ تحویل")

    def test_warranty_terms_hidden_when_empty(self):
        from apps.documents.warranty_card import build_warranty_card

        settings_obj = SiteSettings.load()
        settings_obj.warranty_terms = ""
        settings_obj.save(update_fields=["warranty_terms"])
        order, unit = _make_single_unit_order(user=self.user, warranty_months=24)
        card = build_warranty_card(unit)
        self.assertEqual(card["terms"], "")

    def test_bulk_admin_render_includes_every_unit(self):
        from apps.documents.warranty_card import render_warranty_cards_pdf

        order, unit1 = _make_single_unit_order(user=self.user, warranty_months=24, product_name="محصول یک آربایت")
        product2 = _make_product(name="محصول دو آربایت", warranty_months=None)
        variant2 = ProductVariant.objects.create(product=product2, sku="SKU-BULK-2", is_default=True, final_price=1000)
        item2 = OrderItem.objects.create(
            order=order, variant=variant2, product_name_snapshot=product2.name, sku_snapshot=variant2.sku,
            unit_price=1000, quantity=1, final_price=1000,
        )
        OrderItemUnit.objects.create(order_item=item2, serial_number="SN-BULK-2")
        pdf_bytes = render_warranty_cards_pdf(order)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_customer_warranty_endpoint_404_before_shipped(self):
        from rest_framework.test import APIClient

        from apps.public_api.jwt_tokens import issue_tokens

        order, unit = _make_single_unit_order(user=self.user, warranty_months=24, shipped=False)
        access, _ = issue_tokens(self.user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = client.get(f"/api/v1/orders/{order.order_number}/units/{unit.certificate_id}/warranty.pdf")
        self.assertEqual(response.status_code, 404)

    def test_customer_warranty_endpoint_available_after_shipped(self):
        from rest_framework.test import APIClient

        from apps.public_api.jwt_tokens import issue_tokens

        order, unit = _make_single_unit_order(user=self.user, warranty_months=24, shipped=True)
        access, _ = issue_tokens(self.user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = client.get(f"/api/v1/orders/{order.order_number}/units/{unit.certificate_id}/warranty.pdf")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")

    def test_renders_long_data_without_error(self):
        """نام محصول ۱۲۰ کاراکتری + شرایط ۲ صفحه‌ای (سند تسک §۰)."""
        from apps.documents.warranty_card import render_warranty_card_pdf

        settings_obj = SiteSettings.load()
        settings_obj.warranty_terms = "شرط گارانتی نمونه — " * 60  # ~۲ صفحه
        settings_obj.save(update_fields=["warranty_terms"])
        long_name = "لپ‌تاپ گیمینگ ایسوس ROG Strix SCAR 18 نسل جدید با پردازنده‌ی Core Ultra 9 و کارت گرافیک RTX 5090 نسخه‌ی ویژه‌ی بازی" * 1
        order, unit = _make_single_unit_order(user=self.user, warranty_months=24, delivered=True, product_name=long_name[:120])
        pdf_bytes = render_warranty_card_pdf(unit)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_customer_warranty_endpoint_rejects_other_users_order(self):
        from rest_framework.test import APIClient

        from apps.public_api.jwt_tokens import issue_tokens
        from apps.users.models import User

        order, unit = _make_single_unit_order(user=self.user, warranty_months=24, shipped=True)
        other = User.objects.create_user(phone="09121110098", is_verified=True)
        access, _ = issue_tokens(other)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = client.get(f"/api/v1/orders/{order.order_number}/units/{unit.certificate_id}/warranty.pdf")
        self.assertEqual(response.status_code, 404)


class WarrantyCardContentTests(TestCase):
    """بریف E-04 (کارت گارانتی) — محتوای HTML رندرشده، نه فقط وجود PDF
    (Chromium در تست mock است، پس بررسی واقعی روی خروجی قالب انجام می‌شود)."""

    def setUp(self):
        _configure_seller()
        from apps.users.models import User

        self.user = User.objects.create_user(phone="09121110096", is_verified=True)

    def _html(self, unit) -> str:
        from django.template.loader import render_to_string

        from apps.documents.warranty_card import build_single_warranty_context

        return render_to_string("arbyte/warranty_card.html", build_single_warranty_context(unit))

    def test_qr_points_to_track_order_code_param(self):
        """صفحه‌ی track-order فقط `?code=` را می‌خواند (TrackOrderView.tsx)."""
        from apps.documents import warranty_card

        order, unit = _make_single_unit_order(user=self.user)
        with patch.object(warranty_card, "qr_code_svg", return_value="") as qr:
            warranty_card.build_warranty_card(unit)
        qr.assert_called_once_with(f"https://arbyte.ir/track-order?code={order.order_number}")

    def test_condition_uses_project_enum_labels(self):
        from apps.documents.warranty_card import build_warranty_card

        order, unit = _make_single_unit_order(user=self.user)
        product = unit.order_item.variant.product
        for code, label in [("NEW", "آکبند"), ("OPEN_BOX", "اپن باکس"), ("STOCK", "استوک"), ("LIKE_NEW", "در حد نو")]:
            product.condition = code
            product.save(update_fields=["condition"])
            unit.order_item.variant.product.refresh_from_db()
            self.assertEqual(build_warranty_card(unit)["product_condition"], label)

    def test_durations_and_phone_use_persian_digits(self):
        from apps.documents.warranty_card import build_warranty_card

        order, unit = _make_single_unit_order(user=self.user, warranty_months=24)
        card = build_warranty_card(unit)
        self.assertEqual(card["warranty_months_fa"], "۲۴")
        self.assertEqual(card["test_period_days_fa"], "۷")
        self.assertEqual(card["customer_phone"], "۰۹۱۲۱۲۳۴۵۶۷")

    def test_warranty_section_hidden_without_warranty(self):
        order, unit = _make_single_unit_order(user=self.user, warranty_months=None)
        html = self._html(unit)
        self.assertNotIn("پایان گارانتی", html)
        self.assertIn("پایان مهلت تست", html)

    def test_warranty_section_shown_with_warranty(self):
        order, unit = _make_single_unit_order(user=self.user, warranty_months=24, delivered=True)
        html = self._html(unit)
        self.assertIn("پایان گارانتی", html)
        self.assertIn("گارانتی شرکتی", html)
        self.assertNotIn("از تاریخ تحویل", html)

    def test_terms_section_hidden_when_empty(self):
        settings_obj = SiteSettings.load()
        settings_obj.warranty_terms = "   "
        settings_obj.save(update_fields=["warranty_terms"])
        order, unit = _make_single_unit_order(user=self.user)
        self.assertNotIn("شرایط گارانتی و مهلت تست", self._html(unit))

    def test_awaiting_shipping_vs_shipped(self):
        order, unit = _make_single_unit_order(user=self.user, shipped=False)
        self.assertIn("در انتظار ارسال", self._html(unit))
        order2, unit2 = _make_single_unit_order(user=self.user, shipped=True, product_name="محصول ارسال‌شده آربایت")
        html = self._html(unit2)
        self.assertNotIn("در انتظار ارسال", html)
        self.assertIn("TRK-0001", html)

    def test_shipping_method_shown_from_order_snapshot(self):
        order, unit = _make_single_unit_order(user=self.user, shipped=True)
        order.shipping_method_name = "ارسال فوری تهران"
        order.save(update_fields=["shipping_method_name"])
        html = self._html(unit)
        self.assertIn("روش ارسال", html)
        self.assertIn("ارسال فوری تهران", html)

    def test_shipping_method_row_hidden_for_legacy_orders(self):
        order, unit = _make_single_unit_order(user=self.user, shipped=True)
        self.assertNotIn("روش ارسال", self._html(unit))

    def test_delivered_without_shipment_is_not_awaiting_shipping(self):
        """تحویل حضوری: سفارش DELIVERED بدون Shipment -- «در انتظار ارسال» غلط است."""
        order, unit = _make_single_unit_order(user=self.user, delivered=True, shipped=False)
        order.shipping_method_name = "تحویل حضوری"
        order.save(update_fields=["shipping_method_name"])
        html = self._html(unit)
        self.assertIn("تحویل حضوری", html)
        self.assertNotIn("در انتظار ارسال", html)

    def test_key_specs_from_spec_snapshot_else_variant(self):
        from apps.documents.warranty_card import build_warranty_card

        order, unit = _make_single_unit_order(user=self.user)
        self.assertEqual(build_warranty_card(unit)["key_specs"], [{"label": "پیکربندی", "value": "32GB/1TB"}])
        item = unit.order_item
        item.spec_snapshot = {"پردازنده": "Core Ultra 9", "گرافیک": "RTX 5080", "خالی": ""}
        item.save(update_fields=["spec_snapshot"])
        self.assertEqual(
            build_warranty_card(unit)["key_specs"],
            [{"label": "پردازنده", "value": "Core Ultra 9"}, {"label": "گرافیک", "value": "RTX 5080"}],
        )

    def test_footer_has_company_contact(self):
        order, unit = _make_single_unit_order(user=self.user)
        html = self._html(unit)
        self.assertIn("ArByte.ir", html)
        self.assertIn("۰۲۱-۱۲۳۴۵۶۷۸", html)
        self.assertIn("تهران، خیابان ولیعصر، پلاک ۱۲۳", html)

    def test_production_template_has_no_demo_data_or_javascript(self):
        """بریف اصلاح ۸/۱۰/۱۱ — نه متن نمونه، نه جاوااسکریپت در قالب تولید."""
        order, unit = _make_single_unit_order(user=self.user)
        html = self._html(unit)
        self.assertNotIn("DEMO", html)
        self.assertNotIn("<script", html.lower())

    def test_assets_are_inlined_as_data_uris(self):
        """page.set_content() روی about:blank است و file:// را بار نمی‌کند."""
        order, unit = _make_single_unit_order(user=self.user)
        html = self._html(unit)
        self.assertNotIn("file://", html)
        self.assertIn('src="data:image/png;base64,', html)
        self.assertIn('url("data:font/woff2;base64,', html)

    def test_demo_renders_every_state_without_database_records(self):
        from apps.documents.warranty_demo import demo_cards, render_demo_html

        order_count = Order.objects.count()
        html = render_demo_html()
        self.assertEqual(html.count('class="cert"'), len(demo_cards()))
        self.assertIn("DEMO", html)
        self.assertEqual(Order.objects.count(), order_count)


class PackingSlipAndShippingLabelRenderTests(TestCase):
    def setUp(self):
        _configure_seller()
        from apps.users.models import User

        self.user = User.objects.create_user(phone="09121110097", is_verified=True)
        patcher = patch("apps.documents.pdf.sync_playwright", new=_mock_sync_playwright())
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_renders_short_packing_slip(self):
        from apps.documents.packing_slip import render_packing_slip_pdf

        order = _make_order(user=self.user, item_count=1)
        pdf_bytes = render_packing_slip_pdf(order)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_renders_long_packing_slip_with_many_items(self):
        from apps.documents.packing_slip import render_packing_slip_pdf

        order = _make_order(user=self.user, item_count=15)
        pdf_bytes = render_packing_slip_pdf(order)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_renders_shipping_label(self):
        from apps.documents.shipping_label import render_shipping_label_pdf

        order = _make_order(user=self.user, item_count=1)
        Shipment.objects.create(order=order, provider="پست پیشتاز", tracking_number="TRK-0001")
        pdf_bytes = render_shipping_label_pdf(order)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_renders_daily_shipping_list(self):
        import datetime

        from apps.documents.daily_shipping_list import render_daily_shipping_list_pdf

        order = _make_order(user=self.user, item_count=1)
        pdf_bytes = render_daily_shipping_list_pdf(Order.objects.filter(pk=order.pk), target_date=datetime.date.today())
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
