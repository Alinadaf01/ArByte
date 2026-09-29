from django.test import TestCase, override_settings

from .formatting import first_name_fa, format_money_fa, full_name_fa, to_persian_digits
from .kavenegar_tokens import build_kavenegar_tokens, sanitize_kavenegar_token
from .models import SmsLog, SmsTemplate
from .services import NotificationService


class KavenegarTokenSanitizeTests(TestCase):
    """E-03 §۲ — token/token2/token3 بدون فاصله (فاصله باعث رد پیامک
    می‌شود)، token10 حداکثر ۵ فاصله، token20 حداکثر ۸."""

    def test_no_space_fields_replace_whitespace_with_zwnj(self):
        result = sanitize_kavenegar_token("ARB 1234", "token")
        self.assertNotIn(" ", result)
        self.assertEqual(result, "ARB‌1234")

    def test_token10_allows_up_to_five_spaces(self):
        text = "یک دو سه چهار پنج شش"  # ۵ فاصله دقیقاً
        self.assertEqual(sanitize_kavenegar_token(text, "token10"), text)

    def test_token10_truncates_beyond_five_spaces(self):
        text = "یک دو سه چهار پنج شش هفت"  # ۶ فاصله
        result = sanitize_kavenegar_token(text, "token10")
        self.assertEqual(result.count(" "), 5)
        self.assertEqual(result, "یک دو سه چهار پنج شش")

    def test_token20_allows_up_to_eight_spaces(self):
        text = " ".join(["کلمه"] * 9)  # ۸ فاصله دقیقاً
        self.assertEqual(sanitize_kavenegar_token(text, "token20"), text)

    def test_token20_truncates_beyond_eight_spaces(self):
        text = " ".join(["کلمه"] * 12)  # ۱۱ فاصله
        result = sanitize_kavenegar_token(text, "token20")
        self.assertEqual(result.count(" "), 8)

    def test_none_and_empty_become_empty_string(self):
        self.assertEqual(sanitize_kavenegar_token(None, "token"), "")
        self.assertEqual(sanitize_kavenegar_token("", "token10"), "")

    def test_unknown_field_passes_through_unchanged(self):
        self.assertEqual(sanitize_kavenegar_token("هر چیزی", "token99"), "هر چیزی")

    def test_build_kavenegar_tokens_maps_and_sanitizes(self):
        token_map = {"token": "orderNumber", "token10": "firstName"}
        context = {"orderNumber": "ARB-1234 5678", "firstName": "علی رضا محمدی کریمی نژاد یزدی"}
        tokens = build_kavenegar_tokens(token_map, context)
        self.assertEqual(tokens["token"], "ARB-1234‌5678")
        self.assertEqual(tokens["token10"].count(" "), 5)

    def test_build_kavenegar_tokens_missing_context_key_becomes_empty(self):
        tokens = build_kavenegar_tokens({"token": "missingKey"}, {})
        self.assertEqual(tokens["token"], "")


class SmsFormattingTests(TestCase):
    def test_to_persian_digits(self):
        self.assertEqual(to_persian_digits("0123456789"), "۰۱۲۳۴۵۶۷۸۹")

    def test_format_money_fa_uses_persian_thousands_separator(self):
        self.assertEqual(format_money_fa(1234567), "۱٬۲۳۴٬۵۶۷")

    def test_full_name_fa_falls_back_to_customer_when_empty(self):
        self.assertEqual(full_name_fa(""), "مشتری")
        self.assertEqual(full_name_fa(None), "مشتری")
        self.assertEqual(full_name_fa("  "), "مشتری")
        self.assertEqual(full_name_fa("علی رضایی"), "علی رضایی")

    def test_first_name_fa_takes_first_word_only(self):
        self.assertEqual(first_name_fa("علی رضایی"), "علی")
        self.assertEqual(first_name_fa(""), "مشتری")


@override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)
class NotificationServiceSendSmsTests(TestCase):
    """E-03 §۲ — قالب موجود/غیرموجود، Lookup چندتوکنی، و «کلید کاوه‌نگار
    خالی -> پیامک نمی‌رود، SmsLog خطا، سفارش نمی‌شکند» (بدون ApiCredential
    فعال در این تست‌ها -- دقیقاً همان حالت خالی)."""

    def test_unknown_template_key_creates_failed_log_without_raising(self):
        log = NotificationService.send_sms("09120000000", "does_not_exist", {})
        self.assertEqual(log.status, "failed")
        self.assertIn("یافت نشد", log.error)

    def test_inactive_template_treated_as_missing(self):
        SmsTemplate.objects.create(key="inactive_tpl", title="غیرفعال", body="متن {x}", is_active=False)
        log = NotificationService.send_sms("09120000000", "inactive_tpl", {"x": "1"})
        self.assertEqual(log.status, "failed")

    def test_lookup_template_snapshots_sanitized_tokens_and_queues(self):
        SmsTemplate.objects.create(
            key="order_confirmed_test",
            title="تأیید سفارش",
            kavenegar_template_name="arbyteorder",
            kavenegar_token_map={"token": "orderNumber", "token10": "firstName"},
        )
        log = NotificationService.send_sms(
            "09120000000", "order_confirmed_test", {"orderNumber": "ARB-1234 5678", "firstName": "علی"}
        )
        self.assertEqual(log.kavenegar_template_name, "arbyteorder")
        self.assertEqual(log.kavenegar_tokens["token"], "ARB-1234‌5678")
        self.assertEqual(log.kavenegar_tokens["token10"], "علی")
        # بدون ApiCredential فعال، send_sms_task (Celery eager) باید بی‌صدا
        # به failed برسد -- نه استثنا، نه راه‌اندازی مجدد.
        log.refresh_from_db()
        self.assertEqual(log.status, "failed")
        self.assertTrue(log.error)

    def test_plain_text_template_formats_body_and_queues(self):
        SmsTemplate.objects.create(key="plain_tpl", title="متن ساده", body="سلام {name} عزیز")
        log = NotificationService.send_sms("09120000000", "plain_tpl", {"name": "رضا"})
        self.assertEqual(log.body, "سلام رضا عزیز")
        log.refresh_from_db()
        self.assertEqual(log.status, "failed")  # بدون ApiCredential، همان مسیر «خالی -> نرفتن»

    def test_plain_text_template_missing_placeholder_fails_without_raising(self):
        SmsTemplate.objects.create(key="plain_tpl2", title="متن ساده ۲", body="سلام {name} عزیز")
        log = NotificationService.send_sms("09120000000", "plain_tpl2", {})
        self.assertEqual(log.status, "failed")
        self.assertIn("placeholder", log.error)

    def test_send_sms_never_raises_regardless_of_kavenegar_state(self):
        """سفارش نباید بشکند — این متد هرگز استثنا نباید بیندازد."""
        SmsTemplate.objects.create(
            key="order_shipped_test", title="ارسال", kavenegar_template_name="arbyteship",
            kavenegar_token_map={"token": "orderNumber"},
        )
        try:
            NotificationService.send_sms("09120000000", "order_shipped_test", {"orderNumber": "ARB-1"})
        except Exception as exc:  # noqa: BLE001 -- exactly what we're asserting never happens
            self.fail(f"send_sms باید هرگز استثنا نیندازد، ولی انداخت: {exc}")


class SmsLogModelTests(TestCase):
    def test_sms_log_str_includes_phone_and_status(self):
        log = SmsLog.objects.create(phone="09120000000", status="queued")
        self.assertIn("09120000000", str(log))
        self.assertIn("queued", str(log))
