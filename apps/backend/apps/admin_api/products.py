import django_filters
from django.db.models import ProtectedError
from djangorestframework_camel_case.parser import CamelCaseFormParser, CamelCaseMultiPartParser
from rest_framework import serializers, status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import ColorOption, Product, ProductImage

from .activity import AdminActivityLogMixin, log_admin_action
from .permissions import require_section
from .sections import perm_string

PRODUCT_PREFETCH = ("images", "colors", "attributes__attribute", "attributes__value_option")


class AdminProductImageSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt", "order"]

    def get_id(self, obj: ProductImage) -> str:
        return str(obj.pk)

    def get_image(self, obj: ProductImage) -> str:
        return obj.resolved_url


class AdminColorOptionSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = ColorOption
        fields = ["id", "name", "hex", "in_stock", "order"]

    def get_id(self, obj: ColorOption) -> str:
        return str(obj.pk)


class AdminProductSpecSerializer(serializers.Serializer):
    label = serializers.SerializerMethodField()
    value = serializers.SerializerMethodField()
    unit = serializers.SerializerMethodField()

    def get_label(self, obj) -> str:
        return obj.attribute.name

    def get_value(self, obj) -> str:
        return obj.display_value

    def get_unit(self, obj) -> str | None:
        return obj.attribute.unit or None


class AdminProductSerializer(serializers.ModelSerializer):
    """§2 AdminProduct — stockCount/inStock are read-only everywhere on this
    surface; the only sanctioned write path is a StockMovement (§13)."""

    id = serializers.SerializerMethodField()
    dimensions = serializers.SerializerMethodField()
    weight = serializers.IntegerField(source="weight_g", required=False, default=0)
    images = AdminProductImageSerializer(many=True, read_only=True)
    colors = AdminColorOptionSerializer(many=True, read_only=True)
    stock_count = serializers.IntegerField(read_only=True)
    in_stock = serializers.BooleanField(read_only=True)
    specs = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "sku", "slug", "name", "short_description", "description",
            "price", "cost_price", "category", "images", "colors",
            "material", "dimensions", "weight",
            "stock_count", "in_stock", "order", "is_active",
            "shipping_time", "warranty_terms", "production_status",
            "meta_title", "meta_description", "specs",
            "created_at", "updated_at",
        ]

    def get_id(self, obj: Product) -> str:
        return str(obj.pk)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # §7.5 "بخش‌های حساس" — cost_price is its own permission, separate
        # from ordinary product view access (مدیر محصول sees products but
        # never the margin they're sold at).
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and not (user.is_superuser or user.has_perm(perm_string("cost_price", "view"))):
            data.pop("cost_price", None)
        return data

    def get_dimensions(self, obj: Product) -> dict:
        return {"w": obj.width_mm, "h": obj.height_mm, "d": obj.depth_mm}

    def get_specs(self, obj: Product) -> list[dict]:
        return AdminProductSpecSerializer(
            obj.attributes.select_related("attribute", "value_option").order_by("attribute__order"), many=True
        ).data

    def _apply_dimensions(self, instance: Product) -> None:
        # `dimensions` is a read-only SerializerMethodField (it maps to 3
        # flat model columns, not one), so writes are handled by hand here
        # instead of through validated_data.
        dimensions = self.initial_data.get("dimensions")
        if not dimensions:
            return
        instance.width_mm = dimensions.get("w", instance.width_mm)
        instance.height_mm = dimensions.get("h", instance.height_mm)
        instance.depth_mm = dimensions.get("d", instance.depth_mm)

    def create(self, validated_data):
        instance = Product(**validated_data)
        self._apply_dimensions(instance)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        self._apply_dimensions(instance)
        instance.save()
        return instance


class AdminProductFilter(django_filters.FilterSet):
    # Query-string param names match ADMIN-API-CONTRACT.md exactly (camelCase)
    # — camelCase conversion only applies to JSON bodies, not GET params.
    category = django_filters.NumberFilter(field_name="category_id")
    search = django_filters.CharFilter(method="filter_search")
    isActive = django_filters.BooleanFilter(field_name="is_active")
    productionStatus = django_filters.CharFilter(field_name="production_status")
    inStock = django_filters.BooleanFilter(method="filter_in_stock")
    ordering = django_filters.OrderingFilter(
        fields=(("price", "price"), ("stock_count", "stockCount"), ("order", "order"))
    )

    class Meta:
        model = Product
        fields = []

    def filter_search(self, queryset, name, value):
        from django.db.models import Q

        return queryset.filter(Q(name__icontains=value) | Q(sku__icontains=value))

    def filter_in_stock(self, queryset, name, value):
        return queryset.filter(stock_count__gt=0) if value else queryset.filter(stock_count=0)


class AdminProductListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("products")]
    serializer_class = AdminProductSerializer
    filterset_class = AdminProductFilter
    queryset = Product.objects.select_related("category").prefetch_related(*PRODUCT_PREFETCH)


class AdminProductDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("products")]
    serializer_class = AdminProductSerializer
    queryset = Product.objects.select_related("category").prefetch_related(*PRODUCT_PREFETCH)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            # StockMovement.product is on_delete=PROTECT — a product with
            # any ledger history (even a single purchase) can't be deleted
            # outright, or the کاردکس loses its own referent.
            return Response(
                {"detail": "این محصول سابقه تراکنش در کاردکس دارد و قابل حذف نیست — به‌جای حذف، غیرفعال کنید."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class AdminPriceListPdfView(APIView):
    """Same filters as AdminProductListCreateView, per BACKEND-TASK.md §3.6:
    'همان فیلترهای فعال را روی سند اعمال کند'."""

    permission_classes = [require_section("products")]

    def get(self, request):
        from apps.documents.price_list import render_price_list_pdf
        from apps.documents.responses import pdf_filename, pdf_response

        base_qs = Product.objects.select_related("category").order_by("name")
        products = AdminProductFilter(request.query_params, queryset=base_qs).qs
        pdf_bytes = render_price_list_pdf(products, generated_by_name=request.user.get_full_name())
        return pdf_response(pdf_bytes, pdf_filename("price-list"))


class AdminProductImageCreateView(APIView):
    permission_classes = [require_section("products")]
    parser_classes = [CamelCaseMultiPartParser, CamelCaseFormParser]

    def post(self, request, product_id):
        product = Product.objects.get(pk=product_id)
        serializer = AdminProductImageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        image = ProductImage.objects.create(
            product=product,
            image=request.data.get("image"),
            alt=serializer.validated_data.get("alt", ""),
            order=serializer.validated_data.get("order", 1),
        )
        log_admin_action(user=request.user, action="create", model_name="ProductImage", object_id=image.pk)
        return Response(AdminProductImageSerializer(image).data, status=201)


class AdminProductImageDetailView(APIView):
    """PATCH supports drag-reorder (send the new `order`) and alt-text
    edits; the file itself is immutable once uploaded — delete + re-add
    to replace it."""

    permission_classes = [require_section("products")]

    def patch(self, request, product_id, image_id):
        image = ProductImage.objects.get(pk=image_id, product_id=product_id)
        serializer = AdminProductImageSerializer(image, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_admin_action(user=request.user, action="update", model_name="ProductImage", object_id=image.pk)
        return Response(serializer.data)

    def delete(self, request, product_id, image_id):
        ProductImage.objects.filter(pk=image_id, product_id=product_id).delete()
        log_admin_action(user=request.user, action="delete", model_name="ProductImage", object_id=image_id)
        return Response(status=204)


class AdminColorOptionListCreateView(APIView):
    permission_classes = [require_section("products")]

    def get(self, request, product_id):
        colors = ColorOption.objects.filter(product_id=product_id)
        return Response(AdminColorOptionSerializer(colors, many=True).data)

    def post(self, request, product_id):
        serializer = AdminColorOptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        color = ColorOption.objects.create(product_id=product_id, **serializer.validated_data)
        log_admin_action(user=request.user, action="create", model_name="ColorOption", object_id=color.pk)
        return Response(AdminColorOptionSerializer(color).data, status=201)


class AdminColorOptionDetailView(APIView):
    permission_classes = [require_section("products")]

    def patch(self, request, product_id, color_id):
        color = ColorOption.objects.get(pk=color_id, product_id=product_id)
        serializer = AdminColorOptionSerializer(color, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_admin_action(user=request.user, action="update", model_name="ColorOption", object_id=color.pk)
        return Response(serializer.data)

    def delete(self, request, product_id, color_id):
        ColorOption.objects.filter(pk=color_id, product_id=product_id).delete()
        log_admin_action(user=request.user, action="delete", model_name="ColorOption", object_id=color_id)
        return Response(status=204)
