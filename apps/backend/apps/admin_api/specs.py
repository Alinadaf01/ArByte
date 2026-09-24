from django.db import transaction
from rest_framework import serializers, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Attribute, AttributeValue, Product, ProductAttribute

from .activity import AdminActivityLogMixin, log_admin_action
from .permissions import require_section


class AdminAttributeSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = Attribute
        fields = ["id", "name", "slug", "unit", "input_type", "categories", "is_required", "order"]

    def get_id(self, obj: Attribute) -> str:
        return str(obj.pk)


class AdminAttributeListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("specs")]
    serializer_class = AdminAttributeSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Attribute.objects.all()
        category_id = self.request.query_params.get("category")
        if category_id:
            qs = qs.filter(categories__id=category_id)
        return qs


class AdminAttributeDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("specs")]
    serializer_class = AdminAttributeSerializer
    queryset = Attribute.objects.all()


class AdminAttributeValueSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = AttributeValue
        fields = ["id", "value", "order"]

    def get_id(self, obj: AttributeValue) -> str:
        return str(obj.pk)


class AdminAttributeValueListCreateView(APIView):
    """The 'promote a custom value to a reusable dropdown entry' action —
    see ADMIN-API-CONTRACT.md §5."""

    permission_classes = [require_section("specs")]

    def get(self, request, attribute_id):
        values = AttributeValue.objects.filter(attribute_id=attribute_id)
        return Response(AdminAttributeValueSerializer(values, many=True).data)

    def post(self, request, attribute_id):
        serializer = AdminAttributeValueSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        value = AttributeValue.objects.create(attribute_id=attribute_id, **serializer.validated_data)
        log_admin_action(user=request.user, action="create", model_name="AttributeValue", object_id=value.pk)
        return Response(AdminAttributeValueSerializer(value).data, status=status.HTTP_201_CREATED)


class ProductSpecInputSerializer(serializers.Serializer):
    attribute_id = serializers.IntegerField()
    value_option_id = serializers.IntegerField(required=False, allow_null=True)
    value_text = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        has_option = attrs.get("value_option_id") is not None
        has_text = bool(attrs.get("value_text"))
        if has_option == has_text:
            raise ValidationError("دقیقاً یکی از value_option_id یا value_text باید مقدار داشته باشد.")
        return attrs


class AdminProductSpecsView(APIView):
    """PUT /api/admin/products/{id}/specs/ — replaces all ProductAttribute
    rows for the product in one transaction (delete-then-recreate), exactly
    as specified in ADMIN-API-CONTRACT.md §5.

    GET returns the same raw {id, attributeId, valueOptionId, valueText}
    shape (not the AdminProductSerializer.specs display triple, which only
    has label/value/unit) — the product edit form needs the underlying
    attribute/value ids to pre-populate its spec inputs, not just text to
    display."""

    permission_classes = [require_section("specs")]

    def get(self, request, product_id):
        rows = ProductAttribute.objects.filter(product_id=product_id).select_related("attribute", "value_option")
        return Response(
            [
                {
                    "id": pa.pk,
                    "attribute_id": pa.attribute_id,
                    "value_option_id": pa.value_option_id,
                    "value_text": pa.value_text or None,
                }
                for pa in rows
            ]
        )

    def put(self, request, product_id):
        product = Product.objects.get(pk=product_id)
        serializer = ProductSpecInputSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            ProductAttribute.objects.filter(product=product).delete()
            created = []
            for entry in serializer.validated_data:
                pa = ProductAttribute.objects.create(
                    product=product,
                    attribute_id=entry["attribute_id"],
                    value_option_id=entry.get("value_option_id"),
                    value_text=entry.get("value_text") or "",
                )
                created.append(pa)

        log_admin_action(
            user=request.user, action="update", model_name="ProductAttribute", object_id=product.pk,
            changes={"specCount": len(created)},
        )
        return Response(
            [
                {
                    "id": pa.pk,
                    "attribute_id": pa.attribute_id,
                    "value_option_id": pa.value_option_id,
                    "value_text": pa.value_text or None,
                }
                for pa in created
            ]
        )
