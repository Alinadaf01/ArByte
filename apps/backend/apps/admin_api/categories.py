from django.db.models import ProtectedError
from rest_framework import serializers, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response

from apps.catalog.models import Category

from .activity import AdminActivityLogMixin
from .permissions import require_section


class AdminCategorySerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "slug", "name", "description", "image", "parent", "order", "is_active"]

    def get_id(self, obj: Category) -> str:
        return str(obj.pk)

    def get_image(self, obj: Category) -> str | None:
        return obj.resolved_image_url or None

    def validate_parent(self, value: Category | None) -> Category | None:
        if value is not None and value.parent_id is not None:
            raise ValidationError("دسته‌بندی حداکثر می‌تواند دو سطح داشته باشد.")
        return value


class AdminCategoryImageWriteMixin:
    # `image` is a SerializerMethodField (read-only) since it must resolve
    # either the uploaded file or the fallback external_image_url — so a
    # file in request.FILES is applied by hand after the normal save,
    # mirroring how AdminProductImageCreateView handles product images.
    def _apply_uploaded_image(self, serializer) -> None:
        image = self.request.FILES.get("image")
        if image:
            serializer.instance.image = image
            serializer.instance.save(update_fields=["image"])

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self._apply_uploaded_image(serializer)

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self._apply_uploaded_image(serializer)


class AdminCategoryListCreateView(AdminCategoryImageWriteMixin, AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("categories")]
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.all()


class AdminCategoryDetailView(AdminCategoryImageWriteMixin, AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("categories")]
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.all()

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            # Product.category is on_delete=PROTECT — a category with any
            # products can't be deleted outright, same rule as §2's product
            # delete guard (StockMovement.product).
            return Response(
                {"detail": "این دسته‌بندی محصول دارد و قابل حذف نیست — ابتدا محصولات را جابه‌جا یا حذف کنید."},
                status=status.HTTP_400_BAD_REQUEST,
            )
