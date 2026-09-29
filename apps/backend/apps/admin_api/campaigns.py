"""F-03 §۳ — کمپین زمان‌دار: محصول‌ها و/یا دسته‌ها، تخفیف درصدی یا مبلغی.
قیمت در دیتابیس عوض نمی‌شود؛ `apps.catalog.pricing.live_price` در بازه‌ی
فعال قیمت را برای فهرست/جزئیات/سبد/سفارش حساب می‌کند."""

from django.db import transaction
from rest_framework import serializers, status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Category, Product, ProductVariant
from apps.catalog.pricing import discounted
from apps.content.models import Campaign, CampaignProduct

from .activity import AdminActivityLogMixin
from .permissions import require_section
from .revalidate import revalidate_storefront


class AdminCampaignSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    discount_type = serializers.ChoiceField(choices=["PERCENT", "AMOUNT"], write_only=True)
    value = serializers.IntegerField(write_only=True, min_value=1)
    product_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    category_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    products = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField()
    state = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            "id", "name", "start_at", "end_at", "is_active", "priority", "rules",
            "discount_type", "value", "product_ids", "category_ids", "products", "categories", "state",
        ]
        read_only_fields = ["rules"]

    def get_id(self, obj) -> str:
        return str(obj.pk)

    def get_products(self, obj) -> list[dict]:
        return [{"id": str(t.product_id), "name": t.product.name, "slug": t.product.slug} for t in obj.targets.all() if t.product_id]

    def get_categories(self, obj) -> list[dict]:
        return [{"id": str(t.category_id), "name": t.category.name} for t in obj.targets.all() if t.category_id]

    def get_state(self, obj) -> str:
        from django.utils import timezone

        now = timezone.now()
        if not obj.is_active:
            return "inactive"
        return "scheduled" if obj.start_at > now else "ended" if obj.end_at <= now else "running"

    def validate(self, attrs):
        start = attrs.get("start_at", getattr(self.instance, "start_at", None))
        end = attrs.get("end_at", getattr(self.instance, "end_at", None))
        if start and end and end <= start:
            raise serializers.ValidationError({"end_at": "پایان کمپین باید بعد از شروع باشد."})
        rules = dict(getattr(self.instance, "rules", None) or {})
        if "discount_type" in attrs:
            rules["discountType"] = attrs.pop("discount_type")
        if "value" in attrs:
            rules["value"] = attrs.pop("value")
        if not self.instance and not rules.get("discountType"):
            raise serializers.ValidationError({"discount_type": "نوع تخفیف لازم است."})
        if rules.get("discountType") == "PERCENT" and not 0 < int(rules.get("value") or 0) < 100:
            raise serializers.ValidationError({"value": "درصد تخفیف باید بین ۱ و ۹۹ باشد."})
        attrs["rules"] = rules
        products = attrs.get("product_ids")
        categories = attrs.get("category_ids")
        if not self.instance and not (products or categories):
            raise serializers.ValidationError({"product_ids": "دست‌کم یک محصول یا دسته انتخاب کنید."})
        return attrs

    @transaction.atomic
    def _save_targets(self, campaign, product_ids, category_ids):
        if product_ids is None and category_ids is None:
            return
        campaign.targets.all().delete()
        for pid in Product.objects.filter(pk__in=product_ids or [], deleted_at__isnull=True).values_list("pk", flat=True):
            CampaignProduct.objects.create(campaign=campaign, product_id=pid)
        for cid in Category.objects.filter(pk__in=category_ids or [], deleted_at__isnull=True).values_list("pk", flat=True):
            CampaignProduct.objects.create(campaign=campaign, category_id=cid)

    def create(self, validated_data):
        product_ids, category_ids = validated_data.pop("product_ids", None), validated_data.pop("category_ids", None)
        campaign = super().create(validated_data)
        self._save_targets(campaign, product_ids, category_ids)
        return campaign

    def update(self, instance, validated_data):
        product_ids, category_ids = validated_data.pop("product_ids", None), validated_data.pop("category_ids", None)
        campaign = super().update(instance, validated_data)
        self._save_targets(campaign, product_ids, category_ids)
        return campaign


def affected_variants(campaign):
    product_ids = [t.product_id for t in campaign.targets.all() if t.product_id]
    category_ids = [t.category_id for t in campaign.targets.all() if t.category_id]
    from django.db.models import Q

    return (
        ProductVariant.objects.filter(deleted_at__isnull=True, product__deleted_at__isnull=True)
        .filter(Q(product_id__in=product_ids) | Q(product__category_id__in=category_ids) | Q(product__category__parent_id__in=category_ids))
        .select_related("product")
        .order_by("product__name", "sku")
    )


def _revalidate_campaign(campaign):
    revalidate_storefront("/", *{f"/products/{v.product.slug}" for v in affected_variants(campaign)[:200]})


class AdminCampaignListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("coupons")]
    serializer_class = AdminCampaignSerializer
    queryset = Campaign.objects.prefetch_related("targets__product", "targets__category")

    def perform_create(self, serializer):
        super().perform_create(serializer)
        _revalidate_campaign(serializer.instance)


class AdminCampaignDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("coupons")]
    serializer_class = AdminCampaignSerializer
    queryset = Campaign.objects.prefetch_related("targets__product", "targets__category")

    def perform_update(self, serializer):
        super().perform_update(serializer)
        _revalidate_campaign(serializer.instance)


class AdminCampaignPreviewView(APIView):
    """پیش‌نمایش قیمت هر واریانت در این کمپین (بدون توجه به بازه)."""

    permission_classes = [require_section("coupons")]

    def get(self, request, pk):
        campaign = Campaign.objects.prefetch_related("targets").get(pk=pk)
        rows = [
            {"variant": str(v.pk), "sku": v.sku, "product_name": v.product.name, "price": v.final_price,
             "campaign_price": discounted(v.final_price, campaign.rules)}
            for v in affected_variants(campaign)[:500]
        ]
        return Response({"count": len(rows), "rows": rows}, status=status.HTTP_200_OK)
