"""F-02 §۴ — موجودی هر واریانت (موجود/رزرو/قابل فروش/آستانه)، تراکنش دستی
(STOCK_IN/STOCK_OUT/ADJUSTMENT با دلیل) و کاردکس با خروجی Excel/PDF. رزرو و
آزادسازی فقط سیستمی‌اند (چک‌اوت/لغو) — از این مسیرها ساخته نمی‌شوند."""

import datetime

from django.db.models import F, Q
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import ProductVariant
from apps.inventory.models import InsufficientStockError, Inventory, InventoryTransaction

from .activity import log_admin_action
from .permissions import require_section

_MANUAL_TYPES = {"STOCK_IN", "STOCK_OUT", "ADJUSTMENT"}


class AdminInventoryRowSerializer(serializers.ModelSerializer):
    variant_id = serializers.CharField(source="variant.pk")
    sku = serializers.CharField(source="variant.sku")
    variant_name = serializers.CharField(source="variant.name", allow_null=True)
    product_id = serializers.CharField(source="variant.product_id")
    product_name = serializers.CharField(source="variant.product.name")
    is_low = serializers.SerializerMethodField()

    class Meta:
        model = Inventory
        fields = [
            "variant_id", "sku", "variant_name", "product_id", "product_name",
            "quantity", "reserved_quantity", "available_quantity", "low_stock_threshold", "is_low", "updated_at",
        ]

    def get_is_low(self, obj) -> bool:
        return obj.low_stock_threshold is not None and obj.available_quantity <= obj.low_stock_threshold


class AdminInventoryListView(ListAPIView):
    permission_classes = [require_section("inventory")]
    serializer_class = AdminInventoryRowSerializer

    def get_queryset(self):
        qs = Inventory.objects.select_related("variant__product").filter(
            variant__deleted_at__isnull=True, variant__product__deleted_at__isnull=True
        )
        params = self.request.query_params
        if params.get("search"):
            term = params["search"].strip()
            qs = qs.filter(Q(variant__sku__icontains=term) | Q(variant__product__name__icontains=term))
        if params.get("category"):
            qs = qs.filter(variant__product__category_id=params["category"])
        if params.get("isLow") in ("true", "1"):
            qs = qs.filter(low_stock_threshold__isnull=False, available_quantity__lte=F("low_stock_threshold"))
        if params.get("outOfStock") in ("true", "1"):
            qs = qs.filter(available_quantity__lte=0)
        return qs.order_by("variant__product__name", "variant__sku")


class AdminInventoryThresholdView(APIView):
    """`PATCH /admin/inventory/<variant_id>/ {lowStockThreshold}` — null = بدون هشدار."""

    permission_classes = [require_section("inventory", action="edit")]

    def patch(self, request, variant_id):
        inventory, _ = Inventory.objects.get_or_create(variant_id=variant_id)
        raw = request.data.get("low_stock_threshold")
        if raw in (None, ""):
            inventory.low_stock_threshold = None
        else:
            try:
                value = int(raw)
            except (TypeError, ValueError):
                value = -1
            if value < 0:
                return Response({"detail": "آستانه باید عدد صفر یا مثبت باشد."}, status=status.HTTP_400_BAD_REQUEST)
            inventory.low_stock_threshold = value
        inventory.save(update_fields=["low_stock_threshold", "updated_at"])
        log_admin_action(user=request.user, action="set_low_stock_threshold", model_name="Inventory", object_id=inventory.pk)
        inventory.refresh_from_db()
        return Response(AdminInventoryRowSerializer(inventory).data)


class AdminInventoryTransactionSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    sku = serializers.CharField(source="variant.sku")
    product_name = serializers.CharField(source="variant.product.name")
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = InventoryTransaction
        fields = [
            "id", "sku", "product_name", "type", "quantity_change", "quantity_before", "quantity_after",
            "reference", "note", "user_name", "created_at",
        ]

    def get_id(self, obj) -> str:
        return str(obj.pk)

    def get_user_name(self, obj) -> str | None:
        return obj.user.get_full_name() if obj.user else None


def _ledger_queryset(params):
    qs = InventoryTransaction.objects.select_related("variant__product", "user").order_by("-created_at", "-id")
    if params.get("variant"):
        qs = qs.filter(variant_id=params["variant"])
    if params.get("type"):
        qs = qs.filter(type=params["type"])
    if params.get("search"):
        term = params["search"].strip()
        qs = qs.filter(Q(variant__sku__icontains=term) | Q(variant__product__name__icontains=term) | Q(reference__icontains=term))
    date_from = params.get("dateFrom")
    date_to = params.get("dateTo")
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)
    return qs


class AdminInventoryTransactionListCreateView(ListAPIView):
    """`GET` کاردکس با فیلتر (`?format=xlsx` یا `?format=pdf` برای خروجی)؛
    `POST {variant, type, quantity, note}` تراکنش دستی."""

    permission_classes = [require_section("stock_ledger")]
    serializer_class = AdminInventoryTransactionSerializer

    def get_queryset(self):
        return _ledger_queryset(self.request.query_params)

    def list(self, request, *args, **kwargs):
        export = request.query_params.get("format")
        if export == "xlsx":
            return self._xlsx(request)
        if export == "pdf":
            return self._pdf(request)
        return super().list(request, *args, **kwargs)

    def _xlsx(self, request):
        from apps.documents.excel import COUNT_FORMAT, Column, build_workbook
        from apps.documents.responses import xlsx_filename, xlsx_response

        type_labels = dict(InventoryTransaction._meta.get_field("type").choices)
        rows = [
            {
                "date": t.created_at.strftime("%Y-%m-%d %H:%M"), "sku": t.variant.sku, "product": t.variant.product.name,
                "type": type_labels.get(t.type, t.type), "change": t.quantity_change, "before": t.quantity_before,
                "after": t.quantity_after, "reference": t.reference or "", "note": t.note or "",
                "user": t.user.get_full_name() if t.user else "",
            }
            for t in self.get_queryset()[:5000]
        ]
        workbook = build_workbook(
            sheet_name="کاردکس", report_title="کاردکس کالا", rows=rows, generated_by=request.user.get_full_name(),
            columns=[
                Column("date", "تاریخ"), Column("sku", "SKU"), Column("product", "محصول"), Column("type", "نوع"),
                Column("change", "تغییر", COUNT_FORMAT), Column("before", "قبل", COUNT_FORMAT),
                Column("after", "بعد", COUNT_FORMAT), Column("reference", "مرجع"), Column("note", "توضیح"),
                Column("user", "کاربر"),
            ],
        )
        return xlsx_response(workbook, xlsx_filename("stock-ledger"))

    def _pdf(self, request):
        from apps.documents.responses import pdf_filename, pdf_response
        from apps.documents.stock_ledger import render_stock_ledger_pdf

        params = request.query_params
        parse = lambda v: datetime.date.fromisoformat(v) if v else None  # noqa: E731
        pdf_bytes = render_stock_ledger_pdf(
            self.get_queryset(), date_from=parse(params.get("dateFrom")), date_to=parse(params.get("dateTo")),
            generated_by_name=request.user.get_full_name(),
        )
        return pdf_response(pdf_bytes, pdf_filename("stock-ledger"))

    def post(self, request, *args, **kwargs):
        tx_type = request.data.get("type")
        note = str(request.data.get("note") or "").strip()
        if tx_type not in _MANUAL_TYPES:
            return Response({"detail": "فقط ورود، خروج یا اصلاح دستی مجاز است."}, status=status.HTTP_400_BAD_REQUEST)
        if not note:
            return Response({"detail": "دلیل تراکنش الزامی است."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            quantity = int(request.data.get("quantity"))
        except (TypeError, ValueError):
            return Response({"detail": "تعداد باید عدد صحیح باشد."}, status=status.HTTP_400_BAD_REQUEST)
        variant = ProductVariant.objects.filter(pk=request.data.get("variant"), deleted_at__isnull=True).first()
        if variant is None:
            return Response({"detail": "واریانت پیدا نشد."}, status=status.HTTP_400_BAD_REQUEST)
        Inventory.objects.get_or_create(variant=variant)
        try:
            if tx_type == "STOCK_IN":
                if quantity <= 0:
                    raise ValueError("تعداد ورود باید مثبت باشد.")
                tx = Inventory.objects.stock_in(variant, quantity, note=note, user=request.user)
            elif tx_type == "STOCK_OUT":
                if quantity <= 0:
                    raise ValueError("تعداد خروج باید مثبت باشد.")
                tx = Inventory.objects.stock_out(variant, quantity, note=note, user=request.user)
            else:
                tx = Inventory.objects.adjust(variant, quantity, note=note, user=request.user)
        except (ValueError, InsufficientStockError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        log_admin_action(user=request.user, action=f"inventory:{tx_type}", model_name="InventoryTransaction", object_id=tx.pk)
        return Response(AdminInventoryTransactionSerializer(tx).data, status=status.HTTP_201_CREATED)


class AdminStocktakePdfView(APIView):
    """برگه‌ی انبارگردانی — موجودی سیستمی هر واریانت با ستون شمارش دستی."""

    permission_classes = [require_section("inventory")]

    def get(self, request):
        from apps.documents.responses import pdf_filename, pdf_response
        from apps.documents.stocktake import render_stocktake_pdf

        variants = ProductVariant.objects.filter(deleted_at__isnull=True, product__deleted_at__isnull=True)
        if request.query_params.get("category"):
            variants = variants.filter(product__category_id=request.query_params["category"])
        pdf_bytes = render_stocktake_pdf(variants.order_by("product__name", "sku"), generated_by_name=request.user.get_full_name())
        return pdf_response(pdf_bytes, pdf_filename("stocktake-sheet"))
