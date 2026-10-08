"""F-02 §۱–۲ — برند، محصول، تصاویر، مشخصات محصول و ویرایشگر واریانت روی
مدل آربایت (`ProductVariant`/`Inventory`/`SpecificationDefinition`). جایگزین
کامل فایل وایب (Product.price/sku/ColorOption) که D-02 بی‌مسیر کرده بود.

قیمت همکار/سود (`supplier_price`، `profit_*`) فقط با مجوز `cost_price.view`
برگردانده و فقط با `cost_price.edit` ذخیره می‌شود — همان بخش حساسی که نقش‌ها
از قبل دارند؛ محاسبه‌ی قیمت از روی آن‌ها در F-03 است."""

import django_filters
from django.db import transaction
from django.db.models import Count, F, Max, Min, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import serializers, status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import (
    Brand,
    Category,
    PriceHistory,
    Product,
    ProductImage,
    ProductSpecification,
    ProductVariant,
    SpecificationDefinition,
    SpecificationValue,
)
from apps.content.models import SeoMetadata
from apps.inventory.models import InsufficientStockError, Inventory
from apps.orders.models import OrderItem
from apps.public_api.variant import build_variant_label

from .activity import AdminActivityLogMixin, log_admin_action
from .permissions import require_section
from .revalidate import revalidate_storefront
from .sections import perm_string
from .uploads import save_image_as_webp

_COST_FIELDS = ("price_model", "supplier_price", "profit_type", "profit_amount_toman", "profit_percent_basis_points")


def _can(user, section: str, action: str) -> bool:
    return bool(user and user.has_perm(perm_string(section, action)))


def _revalidate_product(product: Product) -> None:
    revalidate_storefront(f"/products/{product.slug}", f"/category/{product.category.slug}", "/")


# ---------------------------------------------------------------------------
# برند
# ---------------------------------------------------------------------------


class AdminBrandSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    products_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Brand
        fields = ["id", "name", "slug", "logo_url", "description", "is_active", "products_count"]

    def get_id(self, obj) -> str:
        return str(obj.pk)

    def validate_slug(self, value):
        qs = Brand.objects.filter(slug=value, deleted_at__isnull=True)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("این slug قبلاً استفاده شده است.")
        return value


class AdminBrandListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("categories")]
    serializer_class = AdminBrandSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Brand.objects.filter(deleted_at__isnull=True).annotate(
            products_count=Count("products", filter=Q(products__deleted_at__isnull=True))
        )
        search = self.request.query_params.get("search")
        return qs.filter(name__icontains=search) if search else qs.order_by("name")


class AdminBrandDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("categories")]
    serializer_class = AdminBrandSerializer

    def get_queryset(self):
        return Brand.objects.filter(deleted_at__isnull=True)

    def destroy(self, request, *args, **kwargs):
        brand = self.get_object()
        if brand.products.filter(deleted_at__isnull=True).exists():
            return Response(
                {"detail": "این برند محصول فعال دارد؛ ابتدا محصولات را به برند دیگری منتقل یا حذف کنید."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        brand.deleted_at = timezone.now()
        brand.save(update_fields=["deleted_at"])
        log_admin_action(user=request.user, action="delete", model_name="Brand", object_id=brand.pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# محصول
# ---------------------------------------------------------------------------


class AdminSeoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeoMetadata
        fields = ["meta_title", "meta_description", "canonical", "robots", "og_title", "og_description", "og_image"]


class AdminProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "url", "alt_text", "sort_order", "is_primary"]


class AdminProductListSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    brand = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    variants_count = serializers.IntegerField(read_only=True)
    price_min = serializers.IntegerField(read_only=True)
    price_max = serializers.IntegerField(read_only=True)
    stock_available = serializers.IntegerField(read_only=True)
    skus = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "brand", "category", "condition", "grade", "is_presale", "status", "is_visible_on_site", "priority",
            "primary_image", "variants_count", "price_min", "price_max", "stock_available", "skus", "updated_at",
        ]

    def get_id(self, obj) -> str:
        return str(obj.pk)

    def get_brand(self, obj) -> dict:
        return {"id": str(obj.brand_id), "name": obj.brand.name}

    def get_category(self, obj) -> dict:
        return {"id": str(obj.category_id), "name": obj.category.name}

    def get_primary_image(self, obj) -> str | None:
        images = sorted(obj.images.all(), key=lambda i: (not i.is_primary, i.sort_order))
        return images[0].url if images else None

    def get_skus(self, obj) -> list[str]:
        return [v.sku for v in obj.variants.all() if v.deleted_at is None]


class AdminProductSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    brand = serializers.PrimaryKeyRelatedField(queryset=Brand.objects.filter(deleted_at__isnull=True))
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.filter(deleted_at__isnull=True))
    seo = AdminSeoSerializer(required=False, allow_null=True)
    images = AdminProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "brand", "category", "condition", "grade", "is_presale", "status",
            "is_visible_on_site", "is_visible_in_search", "is_visible_in_category", "priority",
            "short_description", "description", "model_number", "gtin", "part_number",
            "warranty_months", "warranty_provider", "requires_serial", "shipping_note", "return_policy_note",
            "seo", "images", "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def get_id(self, obj) -> str:
        return str(obj.pk)

    def validate(self, attrs):
        slug = attrs.get("slug") or (self.instance.slug if self.instance else "") or slugify(attrs.get("name", ""), allow_unicode=False)
        if not slug:
            raise serializers.ValidationError({"slug": "slug لاتین لازم است."})
        qs = Product.objects.filter(slug=slug, deleted_at__isnull=True)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({"slug": "این slug قبلاً استفاده شده است."})
        attrs["slug"] = slug
        return attrs

    def _save_seo(self, product, seo_data):
        if seo_data is None:
            return
        seo, _ = SeoMetadata.objects.get_or_create(product=product)
        for key, value in seo_data.items():
            setattr(seo, key, value or None)
        seo.save()

    def create(self, validated_data):
        seo_data = validated_data.pop("seo", None)
        product = super().create(validated_data)
        self._save_seo(product, seo_data)
        return product

    def update(self, instance, validated_data):
        seo_data = validated_data.pop("seo", None)
        product = super().update(instance, validated_data)
        self._save_seo(product, seo_data)
        return product

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["brand"] = str(instance.brand_id)
        data["category"] = str(instance.category_id)
        seo = getattr(instance, "seo", None) if hasattr(instance, "seo") else None
        data["seo"] = AdminSeoSerializer(seo).data if seo else None
        data["storefront_url"] = f"/products/{instance.slug}"
        return data


class AdminProductFilter(django_filters.FilterSet):
    category = django_filters.NumberFilter(field_name="category_id")
    brand = django_filters.NumberFilter(field_name="brand_id")
    status = django_filters.CharFilter(field_name="status")
    condition = django_filters.CharFilter(field_name="condition")
    grade = django_filters.CharFilter(field_name="grade")
    is_presale = django_filters.BooleanFilter(field_name="is_presale")
    stock = django_filters.CharFilter(method="filter_stock")
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = Product
        fields = []

    def filter_search(self, queryset, name, value):
        value = value.strip()
        if not value:
            return queryset
        return queryset.filter(Q(name__icontains=value) | Q(variants__sku__icontains=value)).distinct()

    def filter_stock(self, queryset, name, value):
        if value == "out":
            return queryset.filter(stock_available__lte=0)
        if value == "in":
            return queryset.filter(stock_available__gt=0)
        if value == "low":
            return queryset.filter(
                variants__inventory__low_stock_threshold__isnull=False,
                variants__inventory__available_quantity__lte=F("variants__inventory__low_stock_threshold"),
                variants__deleted_at__isnull=True,
            ).distinct()
        return queryset


def _product_queryset():
    live = Q(variants__deleted_at__isnull=True)
    return (
        Product.objects.filter(deleted_at__isnull=True)
        .select_related("brand", "category")
        .prefetch_related("images", "variants")
        .annotate(
            variants_count=Count("variants", filter=live, distinct=True),
            price_min=Min("variants__final_price", filter=live),
            price_max=Max("variants__final_price", filter=live),
            stock_available=Sum("variants__inventory__available_quantity", filter=live),
        )
    )


class AdminProductListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("products")]
    filterset_class = AdminProductFilter

    def get_queryset(self):
        return _product_queryset().order_by("-priority", "-updated_at")

    def get_serializer_class(self):
        return AdminProductListSerializer if self.request.method == "GET" else AdminProductSerializer

    def create(self, request, *args, **kwargs):
        serializer = AdminProductSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        log_admin_action(user=request.user, action="create", model_name="Product", object_id=product.pk)
        return Response(AdminProductSerializer(product).data, status=status.HTTP_201_CREATED)


class AdminProductDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("products")]
    serializer_class = AdminProductSerializer

    def get_queryset(self):
        return Product.objects.filter(deleted_at__isnull=True).select_related("brand", "category").prefetch_related("images")

    def perform_update(self, serializer):
        super().perform_update(serializer)
        _revalidate_product(serializer.instance)

    def destroy(self, request, *args, **kwargs):
        """حذف نرم — سفارش‌های قدیمی snapshot دارند ولی FK واریانت هنوز به این محصول است."""
        product = self.get_object()
        now = timezone.now()
        product.deleted_at = now
        product.save(update_fields=["deleted_at", "updated_at"])
        product.variants.filter(deleted_at__isnull=True).update(deleted_at=now)
        log_admin_action(user=request.user, action="delete", model_name="Product", object_id=product.pk)
        _revalidate_product(product)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# تصاویر
# ---------------------------------------------------------------------------


class AdminProductImageListView(APIView):
    """`POST` multipart: `files` (چندتایی) + `alts` (هم‌ترتیب، اجباری)."""

    permission_classes = [require_section("products", action="edit")]
    parser_classes = [MultiPartParser]

    def post(self, request, pk):
        product = Product.objects.get(pk=pk, deleted_at__isnull=True)
        files = request.FILES.getlist("files")
        alts = request.data.getlist("alts")
        if not files or len(alts) != len(files) or any(not a.strip() for a in alts):
            return Response({"detail": "برای هر تصویر متن جایگزین (alt) لازم است."}, status=status.HTTP_400_BAD_REQUEST)
        next_order = (product.images.aggregate(m=Max("sort_order"))["m"] or 0) + 1
        has_primary = product.images.filter(is_primary=True).exists()
        created = []
        for index, (file, alt) in enumerate(zip(files, alts)):
            try:
                url = save_image_as_webp(file, "products")
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            created.append(
                ProductImage.objects.create(
                    product=product, url=url, alt_text=alt.strip(), sort_order=next_order + index,
                    is_primary=not has_primary and index == 0,
                )
            )
        log_admin_action(user=request.user, action="upload_images", model_name="Product", object_id=product.pk)
        _revalidate_product(product)
        return Response(AdminProductImageSerializer(created, many=True).data, status=status.HTTP_201_CREATED)


class AdminProductImageDetailView(APIView):
    permission_classes = [require_section("products", action="edit")]

    def patch(self, request, pk, image_id):
        image = ProductImage.objects.select_related("product").get(pk=image_id, product_id=pk)
        if "alt_text" in request.data:
            alt = str(request.data.get("alt_text") or "").strip()
            if not alt:
                return Response({"detail": "متن جایگزین (alt) خالی نمی‌تواند باشد."}, status=status.HTTP_400_BAD_REQUEST)
            image.alt_text = alt
        if request.data.get("is_primary"):
            ProductImage.objects.filter(product_id=pk).update(is_primary=False)
            image.is_primary = True
        image.save()
        _revalidate_product(image.product)
        return Response(AdminProductImageSerializer(image).data)

    def delete(self, request, pk, image_id):
        image = ProductImage.objects.select_related("product").get(pk=image_id, product_id=pk)
        was_primary = image.is_primary
        image.delete()
        if was_primary:
            first = ProductImage.objects.filter(product_id=pk).order_by("sort_order").first()
            if first:
                first.is_primary = True
                first.save(update_fields=["is_primary"])
        _revalidate_product(image.product)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminProductImageReorderView(APIView):
    permission_classes = [require_section("products", action="edit")]

    def post(self, request, pk):
        ids = [int(i) for i in request.data.get("ids", [])]
        images = {img.pk: img for img in ProductImage.objects.filter(product_id=pk)}
        if set(ids) != set(images):
            return Response({"detail": "فهرست تصاویر ناقص است."}, status=status.HTTP_400_BAD_REQUEST)
        for order, image_id in enumerate(ids, start=1):
            images[image_id].sort_order = order
        ProductImage.objects.bulk_update(images.values(), ["sort_order"])
        _revalidate_product(get_object_or_404(Product, pk=pk))
        return Response(AdminProductImageSerializer(sorted(images.values(), key=lambda i: i.sort_order), many=True).data)


# ---------------------------------------------------------------------------
# مشخصات سطح محصول (غیر محور)
# ---------------------------------------------------------------------------


def _definitions_for(product: Product):
    return SpecificationDefinition.objects.filter(Q(category=product.category) | Q(category__isnull=True)).prefetch_related("values")


def _definition_payload(d: SpecificationDefinition) -> dict:
    return {
        "id": str(d.pk), "key": d.key, "name_fa": d.name_fa, "type": d.type, "unit": d.unit,
        "is_required": d.is_required, "is_variant_axis": d.is_variant_axis,
        "values": [{"id": str(v.pk), "value": v.value, "swatch_hex": v.swatch_hex} for v in d.values.all()],
    }


class AdminProductSpecsView(APIView):
    """`GET` تعریف‌های دسته + مقادیر فعلی؛ `PUT {specs: [{definitionId, valueId, customValue}]}`
    کل مشخصات سطح محصول را جایگزین می‌کند (محورهای واریانت اینجا نیستند)."""

    permission_classes = [require_section("products")]

    def get(self, request, pk):
        product = Product.objects.get(pk=pk, deleted_at__isnull=True)
        definitions = _definitions_for(product).order_by("sort_order", "id")
        current = ProductSpecification.objects.filter(product=product, variant__isnull=True)
        return Response({
            "definitions": [_definition_payload(d) for d in definitions],
            "specs": [
                {"definition_id": str(s.definition_id), "value_id": str(s.value_id) if s.value_id else None,
                 "custom_value": s.custom_value or ""}
                for s in current
            ],
        })

    @transaction.atomic
    def put(self, request, pk):
        product = Product.objects.get(pk=pk, deleted_at__isnull=True)
        definitions = {d.pk: d for d in _definitions_for(product).filter(is_variant_axis=False)}
        rows = request.data.get("specs", [])
        ProductSpecification.objects.filter(product=product, variant__isnull=True).delete()
        for row in rows:
            definition = definitions.get(int(row.get("definition_id") or 0))
            if definition is None:
                return Response({"detail": "مشخصه‌ی نامعتبر برای این دسته."}, status=status.HTTP_400_BAD_REQUEST)
            value_id = row.get("value_id")
            custom = str(row.get("custom_value") or "").strip()
            value = SpecificationValue.objects.filter(pk=value_id, definition=definition).first() if value_id else None
            if value is None and not custom:
                continue
            numeric = None
            if definition.type == "NUMBER" and custom:
                try:
                    numeric = float(custom)
                except ValueError:
                    return Response({"detail": f"«{definition.name_fa}» باید عدد باشد."}, status=status.HTTP_400_BAD_REQUEST)
            ProductSpecification.objects.create(
                product=product, definition=definition, value=value,
                custom_value=None if value else custom, numeric_value=numeric,
            )
        missing = [
            d.name_fa for d in definitions.values()
            if d.is_required and not ProductSpecification.objects.filter(product=product, variant__isnull=True, definition=d).exists()
        ]
        if missing:
            transaction.set_rollback(True)
            return Response({"detail": f"مشخصه‌های اجباری خالی‌اند: {'، '.join(missing)}"}, status=status.HTTP_400_BAD_REQUEST)
        log_admin_action(user=request.user, action="update_specs", model_name="Product", object_id=product.pk)
        _revalidate_product(product)
        return self.get(request, pk)


# ---------------------------------------------------------------------------
# ویرایشگر واریانت
# ---------------------------------------------------------------------------


def _variant_rows(product: Product, *, include_cost: bool) -> list[dict]:
    variants = (
        product.variants.select_related("inventory")
        .prefetch_related("specifications__definition", "specifications__value")
        .order_by("id")
    )
    axis_order = [str(d.pk) for d in _definitions_for(product).filter(is_variant_axis=True).order_by("sort_order", "id")]
    rows = []
    for v in variants:
        axis_values, axis_text = {}, {}
        for spec in v.specifications.all():
            if spec.definition.is_variant_axis and spec.value_id:
                axis_values[str(spec.definition_id)] = str(spec.value_id)
                axis_text[str(spec.definition_id)] = spec.value.value
        inventory = getattr(v, "inventory", None)
        row = {
            "id": str(v.pk),
            "sku": v.sku,
            "name": v.name or "",
            "label": build_variant_label(axis_text, [{"specDefId": d} for d in axis_order]),
            "axis_values": axis_values,
            "final_price": v.final_price,
            "compare_at_price": v.compare_at_price,
            "is_default": v.is_default,
            "is_preorder": v.is_preorder,
            "is_active": v.deleted_at is None,
            "stock": inventory.quantity if inventory else 0,
            "reserved": inventory.reserved_quantity if inventory else 0,
            "available": inventory.available_quantity if inventory else 0,
            "has_orders": OrderItem.objects.filter(variant=v).exists(),
        }
        if include_cost:
            row.update({field: getattr(v, field) for field in _COST_FIELDS})
        rows.append(row)
    return rows


def _preview_labels(axes: list[str], rows: list[dict]) -> list[str]:
    value_text = {
        str(v.pk): v.value for v in SpecificationValue.objects.filter(pk__in={
            int(vid) for r in rows for vid in (r.get("axis_values") or {}).values() if str(vid).isdigit()
        })
    }
    refs = [{"specDefId": str(a)} for a in axes]
    return [
        build_variant_label({k: value_text.get(str(vid), "") for k, vid in (r.get("axis_values") or {}).items()}, refs)
        for r in rows
    ]


class AdminVariantPreviewView(APIView):
    """`POST {axes: [defId], rows: [{axisValues}]}` → `{labels}` — برچسب را
    سرور می‌سازد (همان build_variant_label فروشگاه)، نه فرانت."""

    permission_classes = [require_section("products")]

    def post(self, request, pk):
        axes = [str(a) for a in request.data.get("axes", [])]
        return Response({"labels": _preview_labels(axes, request.data.get("rows", []))})


class AdminProductVariantsView(APIView):
    """`GET` جدول واریانت‌ها؛ `PUT {axes, rows}` کل جدول را ذخیره می‌کند:
    ردیف بدون id ساخته، با id به‌روز، و ردیف حذف‌شده — اگر سفارش دارد حذف نرم
    (`deleted_at`)، وگرنه حذف واقعی. محصول تک‌واریانت همین جدول با یک ردیف است."""

    permission_classes = [require_section("products")]

    def get(self, request, pk):
        product = Product.objects.get(pk=pk, deleted_at__isnull=True)
        include_cost = _can(request.user, "cost_price", "view")
        axes = _definitions_for(product).filter(is_variant_axis=True).order_by("sort_order", "id")
        return Response({
            "axes": [_definition_payload(d) for d in axes],
            "used_axes": sorted({k for r in _variant_rows(product, include_cost=False) for k in r["axis_values"]}),
            "rows": _variant_rows(product, include_cost=include_cost),
            "can_edit_cost": _can(request.user, "cost_price", "edit"),
        })

    def _validate(self, product, axes, rows):
        axis_defs = {str(d.pk): d for d in _definitions_for(product).filter(is_variant_axis=True)}
        if any(a not in axis_defs for a in axes):
            return "محور نامعتبر برای دسته‌ی این محصول."
        active = [r for r in rows if r.get("is_active", True)]
        if not active:
            return "دست‌کم یک واریانت فعال لازم است."
        if sum(1 for r in active if r.get("is_default")) != 1:
            return "دقیقاً یک واریانت فعال باید پیش‌فرض باشد."
        skus = [str(r.get("sku") or "").strip() for r in rows]
        if any(not s for s in skus) or len(set(skus)) != len(skus):
            return "SKU هر واریانت باید پر و یکتا باشد."
        clash = ProductVariant.objects.filter(sku__in=skus, deleted_at__isnull=True).exclude(product=product)
        if clash.exists():
            return f"SKU «{clash.first().sku}» برای محصول دیگری ثبت شده است."
        combos = set()
        for r in active:
            values = r.get("axis_values") or {}
            if set(values) != set(axes):
                return "برای هر واریانت همه‌ی محورها باید مقدار داشته باشند."
            for def_id, value_id in values.items():
                if not SpecificationValue.objects.filter(pk=value_id, definition_id=def_id).exists():
                    return "مقدار محور نامعتبر است."
            key = tuple(sorted((k, str(v)) for k, v in values.items()))
            if key in combos:
                return "دو واریانت فعال با ترکیب محور یکسان مجاز نیست."
            combos.add(key)
            if int(r.get("final_price") or 0) <= 0:
                return "قیمت نهایی هر واریانت فعال باید بیشتر از صفر باشد."
        return None

    @transaction.atomic
    def put(self, request, pk):
        product = Product.objects.select_for_update().get(pk=pk, deleted_at__isnull=True)
        if not _can(request.user, "products", "edit"):
            return Response({"detail": "اجازه‌ی ویرایش محصول ندارید."}, status=status.HTTP_403_FORBIDDEN)
        axes = [str(a) for a in request.data.get("axes", [])]
        rows = request.data.get("rows", [])
        error = self._validate(product, axes, rows)
        if error:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)

        can_cost = _can(request.user, "cost_price", "edit")
        existing = {str(v.pk): v for v in product.variants.all()}
        now = timezone.now()
        requested_ids = {str(r["id"]) for r in rows if r.get("id")}
        # حذف‌شده‌ها اول — تا ردیف تازه بتواند SKU ردیف حذف‌شده را بگیرد.
        for variant_id, variant in existing.items():
            if variant_id in requested_ids:
                continue
            if OrderItem.objects.filter(variant=variant).exists():
                variant.is_default = False
                variant.deleted_at = variant.deleted_at or now
                variant.save(update_fields=["is_default", "deleted_at", "updated_at"])
            else:
                variant.delete()
        # پیش‌فرض قبلی را اول بردار تا قید «یک پیش‌فرض در هر محصول» وسط ذخیره نشکند.
        product.variants.filter(is_default=True).update(is_default=False)
        for r in rows:
            variant = existing.get(str(r.get("id"))) if r.get("id") else None
            old_price = variant.final_price if variant else None
            if variant is None:
                variant = ProductVariant(product=product)
            variant.sku = str(r["sku"]).strip()
            variant.name = str(r.get("name") or "").strip() or None
            variant.final_price = int(r.get("final_price") or 0)
            compare = r.get("compare_at_price")
            variant.compare_at_price = int(compare) if compare not in (None, "", 0) else None
            variant.is_preorder = bool(r.get("is_preorder"))
            variant.is_default = bool(r.get("is_default")) and bool(r.get("is_active", True))
            variant.deleted_at = None if r.get("is_active", True) else (variant.deleted_at or now)
            if can_cost:
                for field in _COST_FIELDS:
                    if field in r:
                        setattr(variant, field, r[field] if r[field] != "" else None)
                if not variant.price_model:
                    variant.price_model = "FIXED"
            variant.save()
            if old_price is not None and old_price != variant.final_price:
                PriceHistory.objects.create(
                    variant=variant, previous_price=old_price, new_price=variant.final_price,
                    changed_by=request.user, reason="ویرایش جدول واریانت",
                )

            ProductSpecification.objects.filter(variant=variant, definition__is_variant_axis=True).delete()
            for def_id, value_id in (r.get("axis_values") or {}).items():
                ProductSpecification.objects.create(variant=variant, definition_id=int(def_id), value_id=int(value_id))

            inventory, _ = Inventory.objects.get_or_create(variant=variant)
            target = r.get("stock")
            if target is not None and int(target) != inventory.quantity:
                try:
                    Inventory.objects.adjust(
                        variant, int(target) - inventory.quantity, note="ویرایش جدول واریانت", user=request.user
                    )
                except InsufficientStockError:
                    transaction.set_rollback(True)
                    return Response({"detail": f"موجودی «{variant.sku}» نمی‌تواند منفی شود."}, status=status.HTTP_400_BAD_REQUEST)

        # F-03 — واریانت‌های «همکار + سود» بلافاصله با موتور قیمت بازمحاسبه می‌شوند.
        from apps.catalog import pricing

        pricing.recalculate_variants(
            list(pricing.cost_plus_variants().filter(product=product)), user=request.user, reason="ویرایش جدول واریانت"
        )
        log_admin_action(user=request.user, action="update_variants", model_name="Product", object_id=product.pk)
        _revalidate_product(product)
        return self.get(request, pk)
