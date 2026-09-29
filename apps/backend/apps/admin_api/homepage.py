"""F-02 §۶ — ویرایشگر `HomepageBlock`: فعال/ترتیب/زمان‌بندی و `config` هر
نوع، با همان قواعد `packages/contracts/src/content/block-config.ts`
(HomepageBlockConfigSchema) — اسلاگ‌های واقعی و شناسه‌ی مشخصه‌ی واقعی،
نه فقط شکل. بعد از هر ذخیره صفحه‌ی اصلی فروشگاه revalidate می‌شود."""

from django.db import transaction
from rest_framework import serializers, status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Category, Product, SpecificationDefinition
from apps.content.models import HomepageBlock

from .activity import AdminActivityLogMixin, log_admin_action
from .permissions import require_section
from .revalidate import revalidate_storefront


def _slugs(config: dict, key: str) -> list[str]:
    value = config.get(key)
    if not isinstance(value, list) or not all(isinstance(v, str) and v for v in value):
        raise serializers.ValidationError({"config": f"«{key}» باید فهرست slug باشد."})
    return value


# CamelCaseJSONParser کلیدهای *داخل* JSON را هم snake_case می‌کند
# (productSlugs → product_slugs)، ولی config در دیتابیس و API عمومی camelCase
# است (block-config.ts). پس کلیدهای شناخته‌شده به شکل اصلی برمی‌گردند.
_CONFIG_KEYS = {"product_slugs": "productSlugs", "category_slugs": "categorySlugs", "frames_manifest": "framesManifest"}


def validate_block_config(block_type: str, config: dict | None) -> dict:
    config = {_CONFIG_KEYS.get(k, k): v for k, v in dict(config or {}).items()}
    config.pop("type", None)
    if block_type == "HERO":
        if not isinstance(config.get("framesManifest"), str) or not config["framesManifest"]:
            raise serializers.ValidationError({"config": "برای HERO، مسیر framesManifest لازم است."})
        return {"framesManifest": config["framesManifest"]}
    if block_type == "CATEGORY_GRID":
        slugs = _slugs(config, "categorySlugs")
        if not slugs:
            raise serializers.ValidationError({"config": "دست‌کم یک دسته انتخاب کنید."})
        found = set(Category.objects.filter(slug__in=slugs, deleted_at__isnull=True).values_list("slug", flat=True))
        if missing := [s for s in slugs if s not in found]:
            raise serializers.ValidationError({"config": f"دسته‌ی ناموجود: {', '.join(missing)}"})
        return {"categorySlugs": slugs}
    if block_type in ("FLAGSHIP_DUEL", "PRODUCT_RAIL"):
        slugs = _slugs(config, "productSlugs")
        if block_type == "FLAGSHIP_DUEL" and len(slugs) != 2:
            raise serializers.ValidationError({"config": "دوئل پرچم‌دار دقیقاً دو محصول می‌خواهد."})
        if not slugs:
            raise serializers.ValidationError({"config": "دست‌کم یک محصول انتخاب کنید."})
        found = set(Product.objects.filter(slug__in=slugs, deleted_at__isnull=True).values_list("slug", flat=True))
        if missing := [s for s in slugs if s not in found]:
            raise serializers.ValidationError({"config": f"محصول ناموجود: {', '.join(missing)}"})
        if block_type == "PRODUCT_RAIL":
            return {"productSlugs": slugs}
        metrics = config.get("metrics")
        if not isinstance(metrics, list) or len(metrics) != 2:
            raise serializers.ValidationError({"config": "دوئل پرچم‌دار دقیقاً دو مشخصه‌ی متریک می‌خواهد."})
        metrics = [str(m) for m in metrics]
        if SpecificationDefinition.objects.filter(pk__in=[int(m) for m in metrics if m.isdigit()]).count() != 2:
            raise serializers.ValidationError({"config": "مشخصه‌ی متریک نامعتبر است."})
        return {"productSlugs": slugs, "metrics": metrics}
    return {}


class AdminHomepageBlockSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = HomepageBlock
        fields = [
            "id", "type", "sort_order", "is_active", "title", "subtitle", "cta_label", "cta_url",
            "image_desktop", "image_mobile", "image_alt", "config", "starts_at", "ends_at", "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def get_id(self, obj) -> str:
        return str(obj.pk)

    def validate(self, attrs):
        block_type = attrs.get("type", getattr(self.instance, "type", None))
        if "config" in attrs or not self.instance or "type" in attrs:
            attrs["config"] = validate_block_config(block_type, attrs.get("config", getattr(self.instance, "config", None)))
        starts = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        if starts and ends and ends <= starts:
            raise serializers.ValidationError({"ends_at": "پایان نمایش باید بعد از شروع باشد."})
        if (attrs.get("image_desktop") or attrs.get("image_mobile")) and not (attrs.get("image_alt") or getattr(self.instance, "image_alt", None)):
            raise serializers.ValidationError({"image_alt": "برای تصویر، متن جایگزین (alt) لازم است."})
        return attrs


class _RevalidateHomeMixin:
    def perform_create(self, serializer):
        super().perform_create(serializer)
        revalidate_storefront("/")

    def perform_update(self, serializer):
        super().perform_update(serializer)
        revalidate_storefront("/")

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        revalidate_storefront("/")


class AdminHomepageBlockListCreateView(_RevalidateHomeMixin, AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("homepage")]
    serializer_class = AdminHomepageBlockSerializer
    pagination_class = None
    queryset = HomepageBlock.objects.order_by("sort_order", "id")


class AdminHomepageBlockDetailView(_RevalidateHomeMixin, AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("homepage")]
    serializer_class = AdminHomepageBlockSerializer
    queryset = HomepageBlock.objects.all()


class AdminHomepageBlockReorderView(APIView):
    """`POST {ids: [...]}` — ترتیب کامل بلوک‌ها."""

    permission_classes = [require_section("homepage", action="edit")]

    @transaction.atomic
    def post(self, request):
        ids = [int(i) for i in request.data.get("ids", [])]
        blocks = {b.pk: b for b in HomepageBlock.objects.all()}
        if set(ids) != set(blocks):
            return Response({"detail": "فهرست بلوک‌ها ناقص است."}, status=status.HTTP_400_BAD_REQUEST)
        for order, block_id in enumerate(ids, start=1):
            blocks[block_id].sort_order = order
        HomepageBlock.objects.bulk_update(blocks.values(), ["sort_order"])
        log_admin_action(user=request.user, action="reorder", model_name="HomepageBlock", object_id="")
        revalidate_storefront("/")
        return Response(AdminHomepageBlockSerializer(sorted(blocks.values(), key=lambda b: b.sort_order), many=True).data)
