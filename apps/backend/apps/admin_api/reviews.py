import django_filters
from rest_framework import serializers
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView

from apps.content.models import ProductReview

from .activity import AdminActivityLogMixin
from .permissions import require_section


class AdminProductReviewSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = ["id", "product", "user", "rating", "title", "body", "status", "admin_reply", "verified_purchase", "created_at"]
        read_only_fields = ["product", "user", "rating", "title", "body", "verified_purchase", "created_at"]

    def get_id(self, obj: ProductReview) -> str:
        return str(obj.pk)

    def get_user(self, obj: ProductReview) -> str | None:
        return obj.user.get_full_name() if obj.user else None


class AdminReviewFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status")
    product = django_filters.NumberFilter(field_name="product_id")

    class Meta:
        model = ProductReview
        fields = []


class AdminReviewListView(ListAPIView):
    permission_classes = [require_section("reviews")]
    serializer_class = AdminProductReviewSerializer
    filterset_class = AdminReviewFilter
    queryset = ProductReview.objects.select_related("user", "product")


class AdminReviewDetailView(AdminActivityLogMixin, RetrieveUpdateAPIView):
    permission_classes = [require_section("reviews")]
    serializer_class = AdminProductReviewSerializer
    queryset = ProductReview.objects.select_related("user", "product")
