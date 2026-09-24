from djangorestframework_camel_case.parser import CamelCaseFormParser, CamelCaseJSONParser, CamelCaseMultiPartParser
from rest_framework import serializers
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView, RetrieveUpdateDestroyAPIView

from apps.catalog.models import Product
from apps.content.models import CommunityTile, HeroSection, HomeShowcase

from .activity import AdminActivityLogMixin
from .permissions import require_section


class AdminHeroSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroSection
        fields = [
            "image", "image_mobile", "image_alt", "title", "subtitle",
            "caption", "cta_label", "cta_url", "is_active",
        ]


class AdminHeroSectionView(RetrieveUpdateAPIView):
    """Singleton, same shape as AdminSiteSettingsView — always pk=1."""

    permission_classes = [require_section("homepage")]
    serializer_class = AdminHeroSectionSerializer
    parser_classes = [CamelCaseMultiPartParser, CamelCaseFormParser, CamelCaseJSONParser]

    def get_object(self):
        return HeroSection.load()


class HomeShowcaseProductSerializer(serializers.ModelSerializer):
    """Slim read-only nested view — just enough for the admin panel to show
    a "selected product" chip without a second round trip."""

    id = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "sku", "slug", "is_active", "thumbnail"]

    def get_id(self, obj: Product) -> str:
        return str(obj.pk)

    def get_thumbnail(self, obj: Product) -> str:
        first = obj.images.first()
        return first.resolved_url if first else ""


class AdminHomeShowcaseSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    # Every other entity id in this codebase is serialized as a string (see
    # HomeShowcaseProductSerializer.get_id right above, and the same pattern
    # on the public product/category serializers) -- ModelSerializer's
    # auto-generated PrimaryKeyRelatedField for this FK returns a raw int
    # instead, which the frontend's showcaseFormSchema (product: z.string())
    # then rejects with "Expected string, received number" on every PATCH
    # for a showcase that already has a linked product. Confirmed live: this
    # silently blocked saving that block no matter what else was edited.
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), allow_null=True, required=False, pk_field=serializers.CharField()
    )
    product_detail = HomeShowcaseProductSerializer(source="product", read_only=True)
    # Resolved (fallback-applied) values, read-only — lets the admin panel's
    # live preview show exactly what the storefront will render, even
    # before the manual fields below are filled in.
    resolved_image = serializers.SerializerMethodField()
    resolved_title = serializers.SerializerMethodField()
    resolved_cta_url = serializers.SerializerMethodField()

    class Meta:
        model = HomeShowcase
        fields = [
            "id", "order", "product", "product_detail", "image", "image_alt", "title", "description",
            "specs", "cta_label", "cta_url", "theme", "is_active",
            "resolved_image", "resolved_title", "resolved_cta_url",
        ]

    def get_id(self, obj: HomeShowcase) -> str:
        return str(obj.pk)

    def get_resolved_image(self, obj: HomeShowcase) -> str:
        return obj.resolved_image_url

    def get_resolved_title(self, obj: HomeShowcase) -> str:
        return obj.resolved_title

    def get_resolved_cta_url(self, obj: HomeShowcase) -> str:
        return obj.resolved_cta_url

    def validate(self, attrs):
        # Server-side cap, not just a UI limit (HOMEPAGE-ADMIN-TASK.md §3:
        # "حداکثر دو تای فعال — اعتبارسنجی سمت سرور").
        is_active = attrs.get("is_active", getattr(self.instance, "is_active", True))
        if is_active:
            qs = HomeShowcase.objects.filter(is_active=True)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.count() >= 2:
                raise serializers.ValidationError(
                    {"is_active": "حداکثر دو بلوک نمایش می‌تواند هم‌زمان فعال باشد."}
                )
        return attrs


class AdminHomeShowcaseListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("homepage")]
    serializer_class = AdminHomeShowcaseSerializer
    parser_classes = [CamelCaseMultiPartParser, CamelCaseFormParser, CamelCaseJSONParser]
    pagination_class = None
    queryset = HomeShowcase.objects.select_related("product").all()


class AdminHomeShowcaseDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("homepage")]
    serializer_class = AdminHomeShowcaseSerializer
    parser_classes = [CamelCaseMultiPartParser, CamelCaseFormParser, CamelCaseJSONParser]
    queryset = HomeShowcase.objects.select_related("product").all()


class AdminCommunityTileSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = CommunityTile
        fields = ["id", "order", "image", "image_alt", "link_url", "is_active"]

    def get_id(self, obj: CommunityTile) -> str:
        return str(obj.pk)

    def validate(self, attrs):
        is_active = attrs.get("is_active", getattr(self.instance, "is_active", True))
        if is_active:
            qs = CommunityTile.objects.filter(is_active=True)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.count() >= 6:
                raise serializers.ValidationError({"is_active": "حداکثر شش کاشی می‌تواند هم‌زمان فعال باشد."})
        return attrs


class AdminCommunityTileListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("homepage")]
    serializer_class = AdminCommunityTileSerializer
    parser_classes = [CamelCaseMultiPartParser, CamelCaseFormParser, CamelCaseJSONParser]
    pagination_class = None
    queryset = CommunityTile.objects.all()


class AdminCommunityTileDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("homepage")]
    serializer_class = AdminCommunityTileSerializer
    parser_classes = [CamelCaseMultiPartParser, CamelCaseFormParser, CamelCaseJSONParser]
    queryset = CommunityTile.objects.all()
