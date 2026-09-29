"""F-03 §۱ — تأمین‌کننده، قیمت همکار هر واریانت، قوانین سود و «بازمحاسبه‌ی
همه» با پیش‌نمایش. همه پشت مجوز `cost_price` (خواندن) و `pricing` (نوشتن) —
قیمت همکار و سود هرگز در API عمومی نیستند."""

from rest_framework import serializers, status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog import pricing
from apps.catalog.models import Category, PriceRule, ProductVariant, Supplier, SupplierProduct

from .activity import AdminActivityLogMixin, log_admin_action
from .permissions import require_section
from .revalidate import revalidate_storefront


class CostAccess(BasePermission):
    """GET با `cost_price.view`؛ هر نوشتن با `pricing.edit` هم."""

    def has_permission(self, request, view):
        read = require_section("cost_price", action="view")().has_permission(request, view)
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return read
        return read and require_section("pricing", action="edit")().has_permission(request, view)


def _recalc_and_revalidate(variants, *, user, reason):
    changes = pricing.recalculate_variants(variants, user=user, reason=reason)
    if changes:
        revalidate_storefront("/", *{f"/products/{v.product.slug}" for v in variants})
    return changes


class AdminSupplierSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = ["id", "name", "contact_name", "contact_phone", "contact_email", "notes", "is_active", "products_count", "updated_at"]

    def get_id(self, obj) -> str:
        return str(obj.pk)

    def get_products_count(self, obj) -> int:
        return obj.supplier_products.count()


class AdminSupplierListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [CostAccess]
    serializer_class = AdminSupplierSerializer
    pagination_class = None
    queryset = Supplier.objects.order_by("name")


class AdminSupplierDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [CostAccess]
    serializer_class = AdminSupplierSerializer
    queryset = Supplier.objects.all()

    def perform_update(self, serializer):
        super().perform_update(serializer)
        # فعال/غیرفعال شدن تأمین‌کننده ارزان‌ترین منبع را عوض می‌کند.
        variants = pricing.cost_plus_variants().filter(supplier_products__supplier=serializer.instance).distinct()
        _recalc_and_revalidate(list(variants), user=self.request.user, reason=f"تغییر تأمین‌کننده «{serializer.instance.name}»")


class AdminSupplierProductSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    supplier = serializers.PrimaryKeyRelatedField(queryset=Supplier.objects.all())
    variant = serializers.PrimaryKeyRelatedField(queryset=ProductVariant.objects.filter(deleted_at__isnull=True))
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    sku = serializers.CharField(source="variant.sku", read_only=True)
    product_name = serializers.CharField(source="variant.product.name", read_only=True)

    class Meta:
        model = SupplierProduct
        fields = ["id", "supplier", "supplier_name", "variant", "sku", "product_name", "price", "is_available", "source", "last_updated_at"]

    def get_id(self, obj) -> str:
        return str(obj.pk)

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("قیمت همکار باید مثبت باشد.")
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["supplier"], data["variant"] = str(instance.supplier_id), str(instance.variant_id)
        return data


class _RecalcOnChangeMixin:
    def _recalc(self, variant):
        variant = ProductVariant.objects.select_related("product__category__parent").get(pk=variant.pk)
        _recalc_and_revalidate([variant], user=self.request.user, reason="تغییر قیمت همکار")

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self._recalc(serializer.instance.variant)

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self._recalc(serializer.instance.variant)

    def perform_destroy(self, instance):
        variant = instance.variant
        super().perform_destroy(instance)
        self._recalc(variant)


class AdminSupplierProductListCreateView(_RecalcOnChangeMixin, AdminActivityLogMixin, ListCreateAPIView):
    """`?supplier=` یا `?variant=`؛ ساخت/تغییر/حذف ← بازمحاسبه‌ی همان واریانت + PriceHistory."""

    permission_classes = [CostAccess]
    serializer_class = AdminSupplierProductSerializer

    def get_queryset(self):
        qs = SupplierProduct.objects.select_related("supplier", "variant__product").order_by("variant__sku")
        for param in ("supplier", "variant"):
            if self.request.query_params.get(param):
                qs = qs.filter(**{f"{param}_id": self.request.query_params[param]})
        return qs


class AdminSupplierProductDetailView(_RecalcOnChangeMixin, AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [CostAccess]
    serializer_class = AdminSupplierProductSerializer
    queryset = SupplierProduct.objects.select_related("supplier", "variant__product")


class AdminPriceRuleSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    supplier = serializers.PrimaryKeyRelatedField(queryset=Supplier.objects.all(), allow_null=True, required=False)
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.filter(deleted_at__isnull=True), allow_null=True, required=False)
    level = serializers.SerializerMethodField()

    class Meta:
        model = PriceRule
        fields = ["id", "supplier", "category", "level", "profit_type", "profit_amount_toman", "profit_percent_basis_points", "is_active"]

    def get_id(self, obj) -> str:
        return str(obj.pk)

    def get_level(self, obj) -> str:
        return "supplier" if obj.supplier_id else "category" if obj.category_id else "global"

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["supplier"] = str(instance.supplier_id) if instance.supplier_id else None
        data["category"] = str(instance.category_id) if instance.category_id else None
        return data

    def validate(self, attrs):
        supplier = attrs.get("supplier", getattr(self.instance, "supplier", None))
        category = attrs.get("category", getattr(self.instance, "category", None))
        if supplier and category:
            raise serializers.ValidationError({"category": "قانون یا سطح تأمین‌کننده است یا سطح دسته، نه هر دو."})
        profit_type = attrs.get("profit_type", getattr(self.instance, "profit_type", None))
        if profit_type == "AMOUNT":
            if not attrs.get("profit_amount_toman", getattr(self.instance, "profit_amount_toman", None)):
                raise serializers.ValidationError({"profit_amount_toman": "مبلغ سود لازم است."})
            attrs["profit_percent_basis_points"] = None
        elif profit_type == "PERCENT":
            if not attrs.get("profit_percent_basis_points", getattr(self.instance, "profit_percent_basis_points", None)):
                raise serializers.ValidationError({"profit_percent_basis_points": "درصد سود لازم است."})
            attrs["profit_amount_toman"] = None
        is_active = attrs.get("is_active", getattr(self.instance, "is_active", True))
        if is_active:
            clash = PriceRule.objects.filter(is_active=True, supplier=supplier, category=category)
            if self.instance:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError({"detail": "برای این سطح قانون فعال دیگری هست؛ همان را ویرایش کنید."})
        return attrs


class AdminPriceRuleListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [CostAccess]
    serializer_class = AdminPriceRuleSerializer
    pagination_class = None
    queryset = PriceRule.objects.select_related("supplier", "category").order_by("supplier_id", "category_id")


class AdminPriceRuleDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [CostAccess]
    serializer_class = AdminPriceRuleSerializer
    queryset = PriceRule.objects.all()


class AdminRecalculateView(APIView):
    """`POST {apply: false}` پیش‌نمایش همه‌ی واریانت‌های «همکار + سود»؛
    `{apply: true}` همان تغییرها را ذخیره می‌کند (هر کدام با PriceHistory)."""

    permission_classes = [CostAccess]

    def post(self, request):
        variants = list(pricing.cost_plus_variants())
        changes = pricing.planned_changes(variants)
        if request.data.get("apply"):
            pricing.apply_changes(changes, user=request.user, reason="بازمحاسبه‌ی همه")
            log_admin_action(user=request.user, action="recalculate_prices", model_name="ProductVariant", object_id="", changes={"count": len(changes)})
            revalidate_storefront("/", *{f"/products/{v.product.slug}" for v in variants if str(v.pk) in {c['variant'] for c in changes}})
        skipped = [
            {"variant": str(v.pk), "sku": v.sku, "reason": source}
            for v in variants
            for _, _, source in [pricing.compute_price(v)]
            if source in ("no-supplier-price", "no-rule")
        ]
        return Response({"applied": bool(request.data.get("apply")), "count": len(changes), "changes": changes, "skipped": skipped}, status=status.HTTP_200_OK)
