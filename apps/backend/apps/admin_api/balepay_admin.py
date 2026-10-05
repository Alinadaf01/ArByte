"""AUDIT-3 §۷/§۸/§۱۸/§۱۹ — بخش «بله پی» پنل.

روی همان معماری تنظیمات موجود (AUDIT.md §۷: معماری دوم ساخته نمی‌شود):
- محرمانه‌ها (توکن ربات، توکن کیف‌پول، secret وب‌هوک) → ApiCredential(service="balepay")
  رمزشده. هرگز برنمی‌گردند؛ فقط «ثبت شده / نشده» و چهار نویسه‌ی آخر.
- غیرمحرمانه (نام ربات، سقف) → SiteSettings.
- دسترسی: بخش حساس «credentials» (کلیدهای API)؛ هر تغییر در لاگ فعالیت، بدون مقدار محرمانه.
"""

import json
import secrets

import django_filters
from django.db import transaction
from rest_framework import serializers
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders import payment_state
from apps.orders.balepay import client
from apps.orders.balepay.config import load_config
from apps.orders.balepay.service import test_connection, webhook_url
from apps.orders.models import BalePaySession
from apps.settings.models import ApiCredential, SiteSettings

from .activity import log_admin_action
from .permissions import require_section

SECTION = "credentials"


def _mask(secret: str) -> str | None:
    return f"••••{secret[-4:]}" if secret else None


def _settings_payload() -> dict:
    config = load_config()
    return {
        "enabled": config.enabled,
        "sandbox": config.sandbox,
        "botUsername": config.bot_username,
        "botToken": _mask(config.bot_token),
        "providerToken": _mask(config.provider_token),
        "webhookConfigured": bool(config.webhook_secret),
        "onlineLimitRial": payment_state.online_limit_rial(),
        "onlineLimitToman": payment_state.online_limit_toman(),
        "currency": "IRR",
        "ready": config.ready,
    }


class BalePaySettingsSerializer(serializers.Serializer):
    enabled = serializers.BooleanField(required=False)
    sandbox = serializers.BooleanField(required=False)
    bot_username = serializers.RegexField(r"^@?[A-Za-z0-9_]{3,64}$", required=False, allow_blank=True)
    # خالی/غایب = همان مقدار قبلی بماند (فرم پنل توکن را هرگز پیش‌پر نمی‌کند).
    bot_token = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True, max_length=200)
    provider_token = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True, max_length=500)
    online_limit_rial = serializers.IntegerField(required=False, min_value=10_000, max_value=10_000_000_000)


class AdminBalePaySettingsView(APIView):
    def get_permissions(self):
        action = "view" if self.request.method == "GET" else "edit"
        return [require_section(SECTION, action=action)()]

    def get(self, request):
        return Response(_settings_payload())

    @transaction.atomic
    def put(self, request):
        serializer = BalePaySettingsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        site = SiteSettings.load()
        changed: list[str] = []
        if "bot_username" in data:
            site.balepay_bot_username = data["bot_username"].lstrip("@")
            changed.append("botUsername")
        if "online_limit_rial" in data:
            site.online_payment_limit_rial = data["online_limit_rial"]
            changed.append("onlineLimitRial")
        site.save()

        credential = ApiCredential.objects.filter(service="balepay").order_by("-is_active", "order", "pk").first()
        if credential is None:
            credential = ApiCredential(service="balepay", is_active=False)
        secrets_data = json.loads(credential.credentials or "{}") if credential.credentials else {}
        for field, key in (("bot_token", "botToken"), ("provider_token", "providerToken")):
            if data.get(field):
                secrets_data[key] = data[field]
                changed.append(key)  # فقط نام فیلد، هرگز مقدار
        secrets_data.setdefault("webhookSecret", secrets.token_urlsafe(32))
        credential.credentials = json.dumps(secrets_data)
        if "enabled" in data:
            credential.is_active = data["enabled"]
            changed.append("enabled")
        if "sandbox" in data:
            credential.is_sandbox = data["sandbox"]
            changed.append("sandbox")
        credential.save()

        log_admin_action(
            user=request.user,
            action="balepay_settings",
            model_name="BalePay",
            object_id="settings",
            changes={"fields": changed},
        )
        return Response(_settings_payload())


class AdminBalePayTestView(APIView):
    """اتصال ربات را بدون پرداخت و بدون نشان‌دادن توکن آزمایش می‌کند (getMe)."""

    permission_classes = [require_section(SECTION, action="view")]

    def post(self, request):
        result = test_connection()
        log_admin_action(
            user=request.user,
            action="balepay_test",
            model_name="BalePay",
            object_id="settings",
            changes={"ok": result["ok"]},
        )
        return Response(result)


class AdminBalePayWebhookView(APIView):
    """ثبت وب‌هوک ربات روی همین سرور (مسیر مخفی). وضعیت: getWebhookInfo بدون secret."""

    permission_classes = [require_section(SECTION, action="edit")]

    def get(self, request):
        config = load_config()
        if not config.bot_token:
            return Response({"ok": False, "error": "توکن ربات ثبت نشده است."})
        try:
            info = client.call(config.bot_token, "getWebhookInfo", retries=False)
        except client.BaleApiError as exc:
            return Response({"ok": False, "error": str(exc)})
        url = str(info.get("url") or "")
        return Response(
            {
                "ok": True,
                "registered": bool(config.webhook_secret) and url == webhook_url(config.webhook_secret),
                "pendingUpdates": info.get("pending_update_count"),
                "lastError": info.get("last_error_message") or None,
            }
        )

    def post(self, request):
        config = load_config()
        if not config.bot_token or not config.webhook_secret:
            return Response({"ok": False, "error": "ابتدا توکن ربات را ذخیره کنید."}, status=400)
        try:
            client.call(config.bot_token, "setWebhook", {"url": webhook_url(config.webhook_secret)})
        except client.BaleApiError as exc:
            return Response({"ok": False, "error": str(exc)}, status=502)
        log_admin_action(user=request.user, action="balepay_webhook_set", model_name="BalePay", object_id="webhook")
        return Response({"ok": True})


class BalePaySessionFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status")
    order = django_filters.CharFilter(field_name="payment__order__order_number", lookup_expr="icontains")
    date_from = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    date_to = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")
    amount_min = django_filters.NumberFilter(method="filter_amount_min")
    amount_max = django_filters.NumberFilter(method="filter_amount_max")

    class Meta:
        model = BalePaySession
        fields = []

    # مبلغ فیلتر به تومان (واحد پنل)، ذخیره به ریال.
    def filter_amount_min(self, qs, name, value):
        return qs.filter(amount_rial__gte=int(value) * payment_state.TOMAN_TO_RIAL)

    def filter_amount_max(self, qs, name, value):
        return qs.filter(amount_rial__lte=int(value) * payment_state.TOMAN_TO_RIAL)


class AdminBalePaySessionSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source="payment.order_id")
    order_number = serializers.CharField(source="payment.order.order_number")
    customer_phone = serializers.CharField(source="payment.order.user.phone", default=None)
    amount = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()
    reference = serializers.CharField(source="invoice_payload")

    class Meta:
        model = BalePaySession
        # بدون token و chat_id (§۹/§۱۰: شناسه‌ی داخلی بله فاش نمی‌شود).
        fields = [
            "id",
            "order_id",
            "order_number",
            "customer_phone",
            "amount",
            "amount_rial",
            "currency",
            "reference",
            "provider_payment_charge_id",
            "status",
            "created_at",
            "paid_at",
            "failure_reason",
        ]

    def get_amount(self, obj) -> int:
        return obj.amount_rial // payment_state.TOMAN_TO_RIAL

    def get_currency(self, obj) -> str:
        return "IRR"


class AdminBalePaySessionListView(ListAPIView):
    permission_classes = [require_section("orders", action="view")]
    serializer_class = AdminBalePaySessionSerializer
    filterset_class = BalePaySessionFilter
    queryset = BalePaySession.objects.select_related("payment__order__user").order_by("-created_at")
