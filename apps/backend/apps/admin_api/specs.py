"""F-02 §۳ — CRUD `SpecificationDefinition` و مقادیرش (`SpecificationValue`،
با `swatch_hex` برای رنگ). جایگزین Attribute/AttributeValue وایب."""

from django.db.models import Count
from rest_framework import serializers, status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response

from apps.catalog.key_specs import default_key_spec_order
from apps.catalog.models import Category, SpecificationDefinition, SpecificationValue

from .activity import AdminActivityLogMixin
from .permissions import require_section


class AdminSpecValueSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = SpecificationValue
        fields = ["id", "value", "swatch_hex", "sort_order"]

    def get_id(self, obj) -> str:
        return str(obj.pk)

    def validate_swatch_hex(self, value):
        if value and not (len(value) == 7 and value.startswith("#")):
            raise serializers.ValidationError("رنگ باید به شکل #RRGGBB باشد.")
        return value or None


class AdminSpecDefinitionSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.filter(deleted_at__isnull=True), allow_null=True, required=False
    )
    values = AdminSpecValueSerializer(many=True, read_only=True)
    usage_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = SpecificationDefinition
        fields = [
            "id", "key", "name_fa", "type", "unit", "category", "is_required", "is_filterable",
            "is_searchable", "is_variant_axis", "sort_order", "key_spec_order", "values", "usage_count",
        ]

    def get_id(self, obj) -> str:
        return str(obj.pk)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["category"] = str(instance.category_id) if instance.category_id else None
        return data

    def create(self, validated_data):
        # AUDIT §۱۲.۴ — پردازنده/گرافیک/رم تازه پیش‌فرض کلیدی‌اند مگر ادمین صریحاً بگوید.
        if "key_spec_order" not in validated_data:
            validated_data["key_spec_order"] = default_key_spec_order(
                validated_data.get("key", ""), validated_data.get("name_fa", "")
            )
        return super().create(validated_data)

    def validate(self, attrs):
        spec_type = attrs.get("type", getattr(self.instance, "type", None))
        if attrs.get("is_variant_axis", getattr(self.instance, "is_variant_axis", False)) and spec_type not in (
            "SELECT", "COLOR"
        ):
            raise serializers.ValidationError({"is_variant_axis": "محور واریانت فقط برای مشخصه‌ی انتخابی یا رنگ ممکن است."})
        return attrs


class AdminSpecDefinitionListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("specs")]
    serializer_class = AdminSpecDefinitionSerializer
    pagination_class = None

    def get_queryset(self):
        qs = SpecificationDefinition.objects.prefetch_related("values").annotate(usage_count=Count("product_specifications"))
        category = self.request.query_params.get("category")
        if category == "global":
            qs = qs.filter(category__isnull=True)
        elif category:
            qs = qs.filter(category_id=category)
        return qs.order_by("sort_order", "id")


class AdminSpecDefinitionDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("specs")]
    serializer_class = AdminSpecDefinitionSerializer

    def get_queryset(self):
        return SpecificationDefinition.objects.prefetch_related("values").annotate(usage_count=Count("product_specifications"))

    def destroy(self, request, *args, **kwargs):
        definition = self.get_object()
        if definition.product_specifications.exists():
            return Response(
                {"detail": "این مشخصه روی محصولات استفاده شده؛ ابتدا از محصولات حذفش کنید."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class AdminSpecValueListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("specs")]
    serializer_class = AdminSpecValueSerializer
    pagination_class = None

    def get_queryset(self):
        return SpecificationValue.objects.filter(definition_id=self.kwargs["definition_id"]).order_by("sort_order", "id")

    def perform_create(self, serializer):
        serializer.validated_data["definition_id"] = self.kwargs["definition_id"]
        super().perform_create(serializer)


class AdminSpecValueDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("specs")]
    serializer_class = AdminSpecValueSerializer

    def get_queryset(self):
        return SpecificationValue.objects.filter(definition_id=self.kwargs["definition_id"])

    def destroy(self, request, *args, **kwargs):
        value = self.get_object()
        if value.product_specifications.exists():
            return Response({"detail": "این مقدار روی محصولات استفاده شده است."}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)
