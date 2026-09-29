from rest_framework import serializers
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView

from apps.content.models import Coupon

from .activity import AdminActivityLogMixin
from .permissions import require_section


class AdminCouponSerializer(serializers.ModelSerializer):
    """D-05 §۴ — عیناً apps/content/models.py's Coupon بازنویسی‌شده (طبق
    Prisma). `categories`/`products` حذف شدند (کوپن دیگر به‌دسته/محصول
    محدود نمی‌شود)؛ `used_count` جایش را به شمارش واقعی `CouponUsage` داد."""

    id = serializers.SerializerMethodField()
    used_count = serializers.SerializerMethodField()
    total_discount = serializers.SerializerMethodField()
    unique_users = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            "id", "code", "type", "amount_toman", "percent_basis_points",
            "minimum_order_amount", "maximum_discount_amount",
            "usage_limit", "used_count", "total_discount", "unique_users", "per_user_limit", "start_date", "end_date",
            "is_active",
        ]

    def get_id(self, obj: Coupon) -> str:
        return str(obj.pk)

    def get_used_count(self, obj: Coupon) -> int:
        return obj.usages.count()

    def get_total_discount(self, obj: Coupon) -> int:
        """F-04 — آمار استفاده: جمع تخفیف داده‌شده (تومان)."""
        from django.db.models import Sum

        return obj.usages.aggregate(total=Sum("discount_amount"))["total"] or 0

    def get_unique_users(self, obj: Coupon) -> int:
        return obj.usages.values("user_id").distinct().count()

    def validate(self, attrs):
        coupon_type = attrs.get("type", getattr(self.instance, "type", None))
        amount = attrs.get("amount_toman", getattr(self.instance, "amount_toman", None))
        percent = attrs.get("percent_basis_points", getattr(self.instance, "percent_basis_points", None))
        if coupon_type == "AMOUNT":
            if not amount:
                raise serializers.ValidationError({"amount_toman": "مبلغ تخفیف لازم است."})
            attrs["percent_basis_points"] = None
        elif coupon_type == "PERCENT":
            if not percent or percent > 10000:
                raise serializers.ValidationError({"percent_basis_points": "درصد باید بین ۰٫۰۱ و ۱۰۰ باشد."})
            attrs["amount_toman"] = None
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and end <= start:
            raise serializers.ValidationError({"end_date": "پایان باید بعد از شروع باشد."})
        attrs["code"] = attrs.get("code", getattr(self.instance, "code", "")).strip().upper()
        return attrs


class AdminCouponListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("coupons")]
    serializer_class = AdminCouponSerializer
    queryset = Coupon.objects.order_by("-created_at")


class AdminCouponDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("coupons")]
    serializer_class = AdminCouponSerializer
    queryset = Coupon.objects.all()
