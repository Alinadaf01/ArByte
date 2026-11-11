"""درخواست مدیر — بازاریابی پیامکی برای کاربرانی که ثبت‌نام کرده‌اند ولی
هنوز خرید نکرده‌اند («بانک شماره» سایت)، به‌همراه مشاهده‌ی محتوای سبد
خریدشان (چرا نخریده‌اند) — بدون نیاز به ساخت کوپن اختصاصی: ادمین خودش کد
تخفیف را در متن دلخواه پیامک می‌نویسد."""

import django_filters
from django.db.models import Count, Q
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import SmsTemplate
from apps.notifications.services import NotificationService
from apps.orders.models import Cart
from apps.users.models import User

from .permissions import require_section

MARKETING_TEMPLATE_KEY = "marketing_campaign"


def _ensure_marketing_template() -> SmsTemplate:
    """قالب همیشگی و ساختگی‌محور («متن آزاد») — خودِ متن کمپین هربار در
    پیام‌رسانی تزریق می‌شود، نه این‌که هر کمپین قالب Kavenegar جدا بخواهد."""
    template, _ = SmsTemplate.objects.get_or_create(
        key=MARKETING_TEMPLATE_KEY,
        defaults={
            "title": "کمپین بازاریابی (متن آزاد)",
            "body": "{message}",
            "is_active": True,
        },
    )
    if not template.is_active:
        template.is_active = True
        template.save(update_fields=["is_active"])
    return template


class AdminMarketingAudienceSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    cart_item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "phone", "first_name", "last_name", "created_at", "cart_item_count"]

    def get_id(self, obj: User) -> str:
        return str(obj.pk)


class AdminMarketingAudienceFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    hasCart = django_filters.BooleanFilter(method="filter_has_cart")

    class Meta:
        model = User
        fields = []

    def filter_search(self, queryset, name, value):
        value = value.strip()
        if not value:
            return queryset
        return queryset.filter(Q(phone__icontains=value) | Q(first_name__icontains=value) | Q(last_name__icontains=value))

    def filter_has_cart(self, queryset, name, value):
        return queryset.filter(cart_item_count__gt=0) if value else queryset.filter(cart_item_count=0)


class AdminMarketingAudienceListView(ListAPIView):
    """کاربران ثبت‌نام‌کرده (غیر staff) بدون هیچ سفارشی — «بانک شماره»ی
    بازگشت‌پذیر. تعداد قلم سبد فعلی‌شان هم همراه می‌آید تا قبل از باز کردن
    جزئیات هم معلوم باشد کدام‌ها چیزی در سبد رها کرده‌اند."""

    permission_classes = [require_section("marketing")]
    serializer_class = AdminMarketingAudienceSerializer
    filterset_class = AdminMarketingAudienceFilter

    def get_queryset(self):
        return (
            User.objects.filter(is_staff=False)
            .annotate(order_count=Count("orders", distinct=True))
            .filter(order_count=0)
            .annotate(cart_item_count=Count("carts__items", distinct=True))
            .order_by("-created_at")
        )


class AdminMarketingCartItemSerializer(serializers.Serializer):
    product_name = serializers.CharField()
    variant_label = serializers.CharField(allow_null=True)
    sku = serializers.CharField()
    quantity = serializers.IntegerField()
    unit_price = serializers.IntegerField()


class AdminMarketingUserCartView(APIView):
    """سبد فعلی یک کاربر خاص — برای فهمیدن «چی گذاشته و نخریده»."""

    permission_classes = [require_section("marketing")]

    def get(self, request, user_id):
        cart = (
            Cart.objects.filter(user_id=user_id)
            .prefetch_related("items__variant__product")
            .order_by("-updated_at")
            .first()
        )
        if not cart:
            return Response({"items": [], "updated_at": None})
        items = [
            {
                "product_name": item.variant.product.name,
                "variant_label": item.variant.name or None,
                "sku": item.variant.sku,
                "quantity": item.quantity,
                "unit_price": item.unit_price_snapshot,
            }
            for item in cart.items.all()
        ]
        return Response(
            {"items": AdminMarketingCartItemSerializer(items, many=True).data, "updated_at": cart.updated_at}
        )


class AdminMarketingCampaignSendView(APIView):
    """POST {user_ids: [...], message: "..."}. هر کاربر یک SmsLog جدا
    می‌گیرد (همان مسیر همیشگی NotificationService، صف Celery، گزارش در
    لاگ پیامک‌های تنظیمات) — شماره‌ی تلفن از خودِ User.phone خوانده می‌شود،
    نه از ورودی ادمین."""

    permission_classes = [require_section("marketing", action="create")]

    def post(self, request):
        user_ids = request.data.get("user_ids") or []
        message = str(request.data.get("message", "") or "").strip()
        if not isinstance(user_ids, list) or not user_ids:
            return Response({"detail": "حداقل یک کاربر را انتخاب کنید."}, status=status.HTTP_400_BAD_REQUEST)
        if not message:
            return Response({"detail": "متن پیامک الزامی است."}, status=status.HTTP_400_BAD_REQUEST)

        _ensure_marketing_template()
        users = User.objects.filter(pk__in=user_ids)
        sent = 0
        for user in users:
            log = NotificationService.send_sms(user.phone, MARKETING_TEMPLATE_KEY, {"message": message})
            if log.status != "failed":
                sent += 1

        return Response({"requested": len(user_ids), "matched": users.count(), "queued": sent})
