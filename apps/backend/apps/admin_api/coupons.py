from rest_framework import serializers
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView

from apps.content.models import Coupon

from .activity import AdminActivityLogMixin
from .permissions import require_section


class AdminCouponSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            "id", "code", "type", "value", "min_order_value", "max_discount",
            "usage_limit", "used_count", "per_user_limit", "starts_at", "ends_at",
            "categories", "products", "is_active",
        ]
        read_only_fields = ["used_count"]

    def get_id(self, obj: Coupon) -> str:
        return str(obj.pk)


class AdminCouponListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("coupons")]
    serializer_class = AdminCouponSerializer
    queryset = Coupon.objects.all()


class AdminCouponDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("coupons")]
    serializer_class = AdminCouponSerializer
    queryset = Coupon.objects.all()
