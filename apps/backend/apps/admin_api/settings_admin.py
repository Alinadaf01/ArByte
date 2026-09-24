import json
import re

from djangorestframework_camel_case.parser import CamelCaseFormParser, CamelCaseJSONParser, CamelCaseMultiPartParser
from rest_framework import serializers
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView, RetrieveUpdateDestroyAPIView

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

    class Meta:
        model = ApiCredential
        fields = ["id", "service", "label", "is_active", "is_sandbox", "order", "is_configured", "credentials"]

    def get_id(self, obj: ApiCredential) -> str:
        return str(obj.pk)

    def get_is_configured(self, obj: ApiCredential) -> bool:
        return obj.has_valid_credentials()

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
