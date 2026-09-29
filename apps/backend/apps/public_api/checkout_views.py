"""E-02 §۳/۴ — packages/contracts/src/{shipping,payment}: فهرست عمومی روش‌های
ارسال و پرداخت واقعاً در دسترس — هیچ‌کدام گزینه‌ای که در چک‌اوت رد می‌شود
را نشان نمی‌دهند (صفر فرض کلاینتی، همه از سرور)."""

from rest_framework.response import Response

from apps.orders import services as order_services
from apps.orders.providers import PAYMENT_PROVIDERS
from apps.settings.models import ApiCredential, ShippingMethod

from .envelope import PublicAPIView, success_response


class ShippingMethodListView(PublicAPIView):
    def get(self, request):
        methods = ShippingMethod.objects.filter(is_active=True).order_by("order", "cost")
        data = [
            {
                "id": str(m.id),
                "name": m.name,
                "cost": m.cost,
                "freeAboveAmount": m.free_above,
                "estimatedDays": m.estimated_days,
            }
            for m in methods
        ]
        return Response(success_response(data, request.request_id))


class PaymentMethodListView(PublicAPIView):
    """کارت‌به‌کارت فقط اگر SiteSettings کامل پر شده (order_services.card_to_card_enabled)؛
    درگاه فقط اگر حداقل یک ApiCredential فعال و دارای credentials معتبر برای
    یکی از providerهای ثبت‌شده باشد — همان معیار initiate_payment (فعلاً فقط
    بله‌پی معنا دارد، چهارتای وایب همیشه بدون credentials معتبرند)."""

    def get(self, request):
        options = []
        if order_services.card_to_card_enabled():
            options.append({"method": "MANUAL_CARD_TO_CARD", "provider": None, "label": "کارت‌به‌کارت"})

        # service (پایین‌حرف، ApiCredential) != code (بالاحرف، PAYMENT_PROVIDERS) —
        # نگاشت هر دو طرف را اینجا صریح می‌سازیم تا هرگز روی نام‌گذاری قیاسی تکیه نکنیم.
        code_by_service = {p.service: p.code for p in PAYMENT_PROVIDERS.values()}
        candidates = ApiCredential.objects.filter(service__in=code_by_service.keys(), is_active=True).order_by(
            "order"
        )
        active_gateway = next((c for c in candidates if c.has_valid_credentials()), None)
        if active_gateway:
            provider_code = code_by_service[active_gateway.service]
            label = "پرداخت اینترنتی" if provider_code == "BALEPAY" else active_gateway.get_service_display()
            options.append({"method": "GATEWAY", "provider": provider_code, "label": label})

        return Response(success_response(options, request.request_id))
