import json
import re

from djangorestframework_camel_case.parser import CamelCaseFormParser, CamelCaseJSONParser, CamelCaseMultiPartParser
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveUpdateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import SmsLog, SmsTemplate
from apps.settings.models import ApiCredential, ShippingMethod, SiteSettings

from .activity import AdminActivityLogMixin
from .permissions import require_section

_URL_FIELDS = [
    "instagram_url", "telegram_url", "whatsapp_url", "linkedin_url", "youtube_url", "pinterest_url",
    "trust_badge_url", "trust_badge_image_url",
]
# These are CharField/TextField/URLField-based and all blank=True (never
# null=True) on the model -- the DB column can't hold NULL. If the admin
# panel ever submits `null` for one of these (an accidentally-cleared
# controlled input, an old cached form state, etc.), DRF's default
# behavior is to reject it outright ("این مقدار نباید تهی باشد") even
# though an *empty string* for the exact same field is perfectly valid
# and already how "no value" is represented. Treat the two as equivalent
# on the way in rather than making the panel responsible for never
# producing null.
_NULLABLE_AS_BLANK_FIELDS = _URL_FIELDS + [
    "business_name", "economic_code", "national_id", "phone_display", "phone_href", "email", "address",
    "trust_badge_label", "payment_gateway_label", "google_analytics_id", "google_tag_manager_id",
    "owner_notification_phone", "google_maps_embed",
    "postal_code", "warranty_terms", "card_to_card_holder_name", "card_to_card_number", "card_to_card_sheba",
]

_HREF_RE = re.compile(r"""href\s*=\s*['"]([^'"]+)['"]""", re.IGNORECASE)
_SRC_RE = re.compile(r"""src\s*=\s*['"]([^'"]+)['"]""", re.IGNORECASE)


class AdminSiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = [
            "business_name", "economic_code", "national_id",
            "phone_display", "phone_href", "email", "address", "business_hours",
            "instagram_url", "telegram_url", "whatsapp_url", "linkedin_url", "youtube_url", "pinterest_url",
            "google_maps_embed", "latitude", "longitude",
            "trust_badge_label", "trust_badge_image", "trust_badge_image_url", "trust_badge_url",
            "payment_gateway_label", "payment_gateway_image",
            "logo_light", "logo_dark", "favicon", "default_og_image",
            "google_analytics_id", "google_tag_manager_id",
            "owner_notification_phone", "notify_owner_new_order",
            # F-01 §۴ — فیلدهای بچ ۰۳ (فاکتور/گارانتی/کارت‌به‌کارت).
            "postal_code", "test_period_days", "warranty_terms",
            "card_to_card_active", "card_to_card_holder_name", "card_to_card_number", "card_to_card_sheba",
        ]

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, "copy") else dict(data)

        for field in _NULLABLE_AS_BLANK_FIELDS:
            if field in data and data.get(field) is None:
                data[field] = ""

        # eNamad's own embed snippet is <a href="...trustseal..."><img
        # src="...logo.aspx?..."></a> -- pasting that whole thing into
        # "لینک نماد" (trust_badge_url) is far more likely than a
        # non-technical admin correctly splitting it into two fields
        # themselves. Detect it and auto-split into the real link
        # (trust_badge_url) and eNamad's hotlinked badge image
        # (trust_badge_image_url) -- eNamad requires linking directly to
        # their own logo.aspx, not a re-hosted copy, for their own
        # tracking/verification.
        raw_trust_value = data.get("trust_badge_url")
        if raw_trust_value and isinstance(raw_trust_value, str) and "<" in raw_trust_value:
            href_match = _HREF_RE.search(raw_trust_value)
            src_match = _SRC_RE.search(raw_trust_value)
            if href_match:
                data["trust_badge_url"] = href_match.group(1)
            if src_match:
                data["trust_badge_image_url"] = src_match.group(1)

        # A non-technical admin pasting "instagram.com/arbyte" (no
        # scheme) gets Django's URLField hard-rejecting it as "not a valid
        # URL" with no hint why -- confirmed as the exact friction point
        # reported against this page. Every one of these fields is meant
        # to be a full external link, so a missing scheme is unambiguous:
        # prepend https:// rather than reject.
        for field in _URL_FIELDS:
            value = data.get(field)
            if value and isinstance(value, str) and not value.startswith(("http://", "https://")):
                data[field] = f"https://{value}"
        return super().to_internal_value(data)


class AdminSiteSettingsView(RetrieveUpdateAPIView):
    permission_classes = [require_section("settings")]
    serializer_class = AdminSiteSettingsSerializer
    # Multipart for the image fields (logos, favicon, trust badge) *plus*
    # JSON — the panel only switches to multipart when an image file is
    # actually being uploaded, and sends plain JSON the rest of the time
    # (e.g. toggling notifyOwnerNewOrder). Restricting this to multipart
    # only, as it originally was, made every text-only PATCH 415.
    parser_classes = [CamelCaseMultiPartParser, CamelCaseFormParser, CamelCaseJSONParser]

    def get_object(self):
        return SiteSettings.load()


class AdminApiCredentialSerializer(serializers.ModelSerializer):
    """`credentials` is intentionally absent from `fields` for reads — it's
    accepted on write via a separate write-only field so it never appears
    in a response body (ADMIN-API-CONTRACT.md §12, mirrors §0(د)).
    `is_configured` is the read-side stand-in: enough for the panel to show
    a "تنظیم شده" badge without ever exposing the secret itself."""

    id = serializers.SerializerMethodField()
    credentials = serializers.JSONField(write_only=True, required=False)
    is_configured = serializers.SerializerMethodField()
    masked_credentials = serializers.SerializerMethodField()

    class Meta:
        model = ApiCredential
        fields = [
            "id", "service", "label", "is_active", "is_sandbox", "order", "is_configured",
            "masked_credentials", "credentials",
        ]

    def get_id(self, obj: ApiCredential) -> str:
        return str(obj.pk)

    def get_is_configured(self, obj: ApiCredential) -> bool:
        return obj.has_valid_credentials()

    def get_masked_credentials(self, obj: ApiCredential) -> dict[str, str]:
        """F-01 §۴ — مقدار کلید هرگز کامل برنمی‌گردد: فقط «••••» + ۴ نویسه‌ی آخر
        (مقادیر کوتاه‌تر از ۸ نویسه کاملاً پوشیده)."""
        try:
            data = json.loads(obj.credentials) if obj.credentials else {}
        except (TypeError, ValueError):
            return {}
        if not isinstance(data, dict):
            return {}
        masked = {}
        for key, value in data.items():
            text = str(value or "")
            masked[key] = f"••••{text[-4:]}" if len(text) >= 8 else "••••"
        return masked

    def to_internal_value(self, data):
        attrs = super().to_internal_value(data)
        if "credentials" in attrs:
            attrs["credentials"] = json.dumps(attrs["credentials"])
        return attrs


class AdminApiCredentialListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("credentials")]
    serializer_class = AdminApiCredentialSerializer
    pagination_class = None
    queryset = ApiCredential.objects.all()
    activity_log_exclude_fields = {"credentials"}


class AdminApiCredentialDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("credentials")]
    serializer_class = AdminApiCredentialSerializer
    queryset = ApiCredential.objects.all()
    activity_log_exclude_fields = {"credentials"}


class AdminShippingMethodSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = ShippingMethod
        fields = ["id", "name", "cost", "free_above", "estimated_days", "is_active", "order"]

    def get_id(self, obj: ShippingMethod) -> str:
        return str(obj.pk)


class AdminShippingMethodListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("settings")]
    serializer_class = AdminShippingMethodSerializer
    pagination_class = None
    queryset = ShippingMethod.objects.all()


class AdminShippingMethodDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("settings")]
    serializer_class = AdminShippingMethodSerializer
    queryset = ShippingMethod.objects.all()


class AdminTestSmsView(APIView):
    """F-01 §۴ — «ارسال پیامک آزمایشی»: قالب OTP (arbyteotp) با کد ثابت ۱۲۳۴۵
    به شماره‌ی داده‌شده، هم‌زمان (نه Celery) تا نتیجه‌ی کاوه‌نگار همان لحظه
    در پنل دیده شود. ردیف SmsLog مثل هر پیامک دیگر ثبت می‌شود."""

    permission_classes = [require_section("credentials", action="edit")]

    def post(self, request):
        from apps.notifications.kavenegar_tokens import build_kavenegar_tokens
        from apps.notifications.tasks import send_sms_task

        phone = str(request.data.get("phone", "")).strip()
        if not re.fullmatch(r"09\d{9}", phone):
            return Response({"detail": "شماره موبایل معتبر (۰۹xxxxxxxxx) وارد کنید."}, status=status.HTTP_400_BAD_REQUEST)
        template = SmsTemplate.objects.filter(key="otp_login").first()
        if template is None or not template.kavenegar_template_name:
            return Response({"detail": "قالب پیامک ورود (otp_login) تنظیم نشده است."}, status=status.HTTP_400_BAD_REQUEST)
        log = SmsLog.objects.create(
            phone=phone, template=template, body="",
            kavenegar_template_name=template.kavenegar_template_name,
            kavenegar_tokens=build_kavenegar_tokens(template.kavenegar_token_map, {"code": "12345"}),
            status="queued",
        )
        send_sms_task(log.id)
        log.refresh_from_db()
        return Response({"status": log.status, "error": log.error, "provider_message_id": log.provider_message_id})


class AdminSmsTemplateSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = SmsTemplate
        fields = ["id", "key", "title", "is_active", "kavenegar_template_name", "kavenegar_token_map"]
        read_only_fields = ["key"]

    def get_id(self, obj) -> str:
        return str(obj.pk)


class AdminSmsTemplateListView(ListAPIView):
    permission_classes = [require_section("settings")]
    serializer_class = AdminSmsTemplateSerializer
    pagination_class = None
    queryset = SmsTemplate.objects.order_by("-is_active", "key")


class AdminSmsTemplateDetailView(AdminActivityLogMixin, RetrieveUpdateAPIView):
    permission_classes = [require_section("settings")]
    serializer_class = AdminSmsTemplateSerializer
    queryset = SmsTemplate.objects.all()


class AdminSmsLogSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    template_key = serializers.CharField(source="template.key", default=None)

    class Meta:
        model = SmsLog
        fields = ["id", "phone", "template_key", "kavenegar_template_name", "status", "error", "created_at"]

    def get_id(self, obj) -> str:
        return str(obj.pk)


class AdminSmsLogListView(ListAPIView):
    permission_classes = [require_section("settings")]
    serializer_class = AdminSmsLogSerializer

    def get_queryset(self):
        qs = SmsLog.objects.select_related("template").order_by("-created_at")
        params = self.request.query_params
        if params.get("status"):
            qs = qs.filter(status=params["status"])
        if params.get("phone"):
            qs = qs.filter(phone__icontains=params["phone"])
        if params.get("template"):
            qs = qs.filter(template__key=params["template"])
        return qs
