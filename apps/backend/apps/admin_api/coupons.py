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

    class Meta:
        model = Coupon
        fields = [
            "id", "code", "type", "amount_toman", "percent_basis_points",
            "minimum_order_amount", "maximum_discount_amount",
            "usage_limit", "used_count", "per_user_limit", "start_date", "end_date", "is_active",
        ]

    def get_id(self, obj: Coupon) -> str:
        return str(obj.pk)

    def get_used_count(self, obj: Coupon) -> int:
        return obj.usages.count()


class AdminCouponListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("coupons")]
    serializer_class = AdminCouponSerializer
    queryset = Coupon.objects.all()


class AdminCouponDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("coupons")]
    serializer_class = AdminCouponSerializer
    queryset = Coupon.objects.all()
