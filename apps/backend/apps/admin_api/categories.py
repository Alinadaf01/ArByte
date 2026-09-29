from django.db.models import ProtectedError
from rest_framework import serializers, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response

from apps.catalog.models import Category

from .activity import AdminActivityLogMixin
from .permissions import require_section


class AdminCategorySerializer(serializers.ModelSerializer):
    """D-02 §۲ — `image_main`/`image_banner`/`image_thumbnail` are plain
    string paths (into apps/web/public/..., same T-210 pattern), not
    Django ImageField uploads — vybeshop's file-upload machinery
    (AdminCategoryImageWriteMixin) doesn't apply anymore."""

    id = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id", "slug", "name", "description", "image_main", "image_banner", "image_thumbnail",
            "parent", "sort_order", "is_active",
        ]

    def get_id(self, obj: Category) -> str:
        return str(obj.pk)

    def validate_parent(self, value: Category | None) -> Category | None:
        if value is not None and value.parent_id is not None:
            raise ValidationError("دسته‌بندی حداکثر می‌تواند دو سطح داشته باشد.")
        return value


class AdminCategoryListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("categories")]
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.filter(deleted_at__isnull=True).order_by("sort_order", "id")


class AdminCategoryDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("categories")]
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.all()

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            # Product.category is on_delete=PROTECT — a category with any
            # products can't be deleted outright, same rule as §2's product
            # delete guard.
            return Response(
                {"detail": "این دسته‌بندی محصول دارد و قابل حذف نیست — ابتدا محصولات را جابه‌جا یا حذف کنید."},
                status=status.HTTP_400_BAD_REQUEST,
            )
