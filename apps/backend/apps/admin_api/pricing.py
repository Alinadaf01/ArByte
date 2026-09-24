import math

import django_filters
from django.db import transaction
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import PriceHistory, Product

from .activity import log_admin_action
from .permissions import require_section


class AdminProductPriceSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    category = serializers.IntegerField(source="category_id")

    class Meta:
        model = Product
        fields = ["id", "name", "sku", "category", "price"]

    def get_id(self, obj: Product) -> str:
        return str(obj.pk)


class AdminProductPriceFilter(django_filters.FilterSet):
    category = django_filters.NumberFilter(field_name="category_id")

    class Meta:
        model = Product
        fields = ["category"]


class AdminProductPriceListView(ListAPIView):
    permission_classes = [require_section("pricing")]
    serializer_class = AdminProductPriceSerializer
    filterset_class = AdminProductPriceFilter
    queryset = Product.objects.all()


class BulkPriceEditSerializer(serializers.Serializer):
    product_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
    mode = serializers.ChoiceField(choices=["percent", "fixed", "set"])
    direction = serializers.ChoiceField(choices=["increase", "decrease"], required=False)
    value = serializers.IntegerField(min_value=0)
    round_to_nearest_1000 = serializers.BooleanField(required=False, default=False)
    reason = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if attrs["mode"] in ("percent", "fixed") and not attrs.get("direction"):
            raise serializers.ValidationError({"direction": "برای این حالت الزامی است."})
        return attrs


def _compute_new_price(old_price: int, input_data: dict) -> int:
    mode = input_data["mode"]
    value = input_data["value"]
    direction = input_data.get("direction")
    sign = 1 if direction == "increase" else -1

    if mode == "set":
        new_price = value
    elif mode == "percent":
        new_price = old_price + sign * round(old_price * value / 100)
    else:  # fixed
        new_price = old_price + sign * value

    new_price = max(new_price, 0)
    if input_data.get("round_to_nearest_1000"):
        new_price = int(math.floor(new_price / 1000 + 0.5) * 1000)
    return new_price


class AdminBulkPriceEditView(APIView):
    # POST here is a bulk *edit*, not a create — pricing has no "create" action.
    permission_classes = [require_section("pricing", action="edit")]

    def post(self, request):
        serializer = BulkPriceEditSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        preview = request.query_params.get("preview") == "true"

        products = list(Product.objects.filter(pk__in=data["product_ids"]))
        changes = []
        for product in products:
            new_price = _compute_new_price(product.price, data)
            if new_price != product.price:
                changes.append({"product_id": product.pk, "name": product.name, "old_price": product.price, "new_price": new_price})

        if not preview:
            with transaction.atomic():
                for change in changes:
                    Product.objects.filter(pk=change["product_id"]).update(price=change["new_price"])
                    PriceHistory.objects.create(
                        product_id=change["product_id"],
                        old_price=change["old_price"],
                        new_price=change["new_price"],
                        changed_by=request.user,
                        reason=data.get("reason", ""),
                    )
                log_admin_action(
                    user=request.user,
                    action="bulk_price_edit",
                    model_name="Product",
                    object_id=",".join(str(c["product_id"]) for c in changes) or "none",
                    changes={"count": len(changes), "mode": data["mode"], "value": data["value"]},
                )

        return Response({"changes": changes}, status=status.HTTP_200_OK)


class AdminPriceHistorySerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    changed_by = serializers.SerializerMethodField()

    class Meta:
        model = PriceHistory
        fields = ["id", "old_price", "new_price", "changed_by", "reason", "created_at"]

    def get_id(self, obj: PriceHistory) -> str:
        return str(obj.pk)

    def get_changed_by(self, obj: PriceHistory) -> str:
        return obj.changed_by.get_full_name() if obj.changed_by else ""


class AdminPriceHistoryListView(ListAPIView):
    permission_classes = [require_section("pricing")]
    serializer_class = AdminPriceHistorySerializer

    def get_queryset(self):
        return PriceHistory.objects.filter(product_id=self.kwargs["product_id"])
