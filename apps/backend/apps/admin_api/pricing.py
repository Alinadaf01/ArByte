"""F-02 §۵ — قیمت‌گذاری انبوه روی واریانت: جدول قابل ویرایش، تغییر گروهی
درصدی/مبلغی با **پیش‌نمایش قبل از اعمال** (یک منطق مشترک برای preview و
apply، پس آنچه پیش‌نمایش نشان می‌دهد دقیقاً همان است که ذخیره می‌شود)، و
تاریخچه‌ی قیمت هر واریانت (`PriceHistory`)."""

import math

from django.db import transaction
from django.db.models import Q
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import PriceHistory, ProductVariant

from .activity import log_admin_action
from .permissions import require_section
from .revalidate import revalidate_storefront

ROUND_TO = 1000  # تومان — قیمت‌های گرد، همان گرد کردن موتور قیمت F-03


class AdminPriceRowSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    product_id = serializers.CharField(source="product.pk")
    product_name = serializers.CharField(source="product.name")
    product_slug = serializers.CharField(source="product.slug")

    class Meta:
        model = ProductVariant
        fields = ["id", "sku", "name", "product_id", "product_name", "product_slug", "final_price", "compare_at_price", "price_model"]

    def get_id(self, obj) -> str:
        return str(obj.pk)


def _variant_queryset(params):
    qs = ProductVariant.objects.select_related("product").filter(deleted_at__isnull=True, product__deleted_at__isnull=True)
    if params.get("search"):
        term = str(params["search"]).strip()
        qs = qs.filter(Q(sku__icontains=term) | Q(product__name__icontains=term))
    if params.get("category"):
        qs = qs.filter(product__category_id=params["category"])
    if params.get("brand"):
        qs = qs.filter(product__brand_id=params["brand"])
    return qs.order_by("product__name", "sku")


class AdminPriceListView(ListAPIView):
    permission_classes = [require_section("pricing")]
    serializer_class = AdminPriceRowSerializer

    def get_queryset(self):
        return _variant_queryset(self.request.query_params)


def _compute_changes(data) -> tuple[list[dict], str | None]:
    """ورودی: یا `changes: [{variant, newPrice}]` (ویرایش جدولی)، یا
    `mode: percent|amount` + `value` + (`variantIds` یا فیلتر). خروجی: ردیف‌های
    {variant, sku, productName, oldPrice, newPrice} فقط برای قیمت‌هایی که واقعاً عوض می‌شوند."""
    if data.get("changes"):
        explicit = {int(c["variant"]): int(c["new_price"]) for c in data["changes"]}
        variants = ProductVariant.objects.select_related("product").filter(pk__in=explicit, deleted_at__isnull=True)
        target = {v: explicit[v.pk] for v in variants}
    else:
        mode = data.get("mode")
        try:
            value = float(data.get("value"))
        except (TypeError, ValueError):
            return [], "مقدار تغییر باید عدد باشد."
        if mode not in ("percent", "amount") or value == 0:
            return [], "نوع تغییر (درصد/مبلغ) و مقدار غیرصفر لازم است."
        ids = data.get("variant_ids")
        variants = _variant_queryset(data if not ids else {}).filter(**({"pk__in": ids} if ids else {}))
        target = {}
        for v in variants:
            raw = v.final_price * (1 + value / 100) if mode == "percent" else v.final_price + value
            target[v] = int(math.ceil(raw / ROUND_TO) * ROUND_TO) if raw > 0 else 0
    rows = []
    for v, new_price in target.items():
        if new_price <= 0:
            return [], f"قیمت جدید «{v.sku}» صفر یا منفی می‌شود."
        if new_price != v.final_price:
            rows.append({"variant": str(v.pk), "sku": v.sku, "product_name": v.product.name, "old_price": v.final_price, "new_price": new_price})
    return rows, None


class AdminBulkPricePreviewView(APIView):
    permission_classes = [require_section("pricing")]

    def post(self, request):
        rows, error = _compute_changes(request.data)
        if error:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"count": len(rows), "changes": rows})


class AdminBulkPriceApplyView(APIView):
    permission_classes = [require_section("pricing", action="edit")]

    @transaction.atomic
    def post(self, request):
        rows, error = _compute_changes(request.data)
        if error:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)
        reason = str(request.data.get("reason") or "").strip() or "ویرایش گروهی قیمت"
        variants = {str(v.pk): v for v in ProductVariant.objects.select_for_update().select_related("product").filter(pk__in=[r["variant"] for r in rows])}
        slugs = set()
        for row in rows:
            variant = variants[row["variant"]]
            PriceHistory.objects.create(
                variant=variant, previous_price=variant.final_price, new_price=row["new_price"],
                changed_by=request.user, reason=reason,
            )
            variant.final_price = row["new_price"]
            variant.save(update_fields=["final_price", "updated_at"])
            slugs.add(variant.product.slug)
        log_admin_action(user=request.user, action="bulk_price_update", model_name="ProductVariant", object_id="",
                         changes={"count": len(rows), "reason": reason})
        revalidate_storefront("/", *(f"/products/{s}" for s in slugs))
        return Response({"count": len(rows), "changes": rows})


class AdminPriceHistoryView(APIView):
    permission_classes = [require_section("pricing")]

    def get(self, request, variant_id):
        entries = PriceHistory.objects.filter(variant_id=variant_id).select_related("changed_by").order_by("-created_at")[:100]
        return Response([
            {
                "previous_price": e.previous_price, "new_price": e.new_price, "reason": e.reason,
                "changed_by": e.changed_by.get_full_name() if e.changed_by else None, "created_at": e.created_at,
            }
            for e in entries
        ])


class AdminPriceListPdfView(APIView):
    """لیست قیمت PDF با همان فیلترهای جدول قیمت (search/category/brand)."""

    permission_classes = [require_section("pricing")]

    def get(self, request):
        from apps.documents.price_list import render_price_list_pdf
        from apps.documents.responses import pdf_filename, pdf_response

        pdf_bytes = render_price_list_pdf(_variant_queryset(request.query_params), generated_by_name=request.user.get_full_name())
        return pdf_response(pdf_bytes, pdf_filename("price-list"))
