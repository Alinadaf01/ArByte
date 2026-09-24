import django_filters
from django.db.models import F
from django.utils.dateparse import parse_date
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Product
from apps.documents.excel import COUNT_FORMAT, Column, build_workbook
from apps.documents.persian import format_jalali_date
from apps.documents.responses import xlsx_filename, xlsx_response
from apps.documents.stock_ledger import TYPE_LABELS
from apps.inventory.models import StockAlert, StockMovement

from .activity import log_admin_action
from .permissions import require_section
from .sections import perm_string


def _can_view_cost_price(request) -> bool:
    user = getattr(request, "user", None)
    return bool(user and (user.is_superuser or user.has_perm(perm_string("cost_price", "view"))))


class AdminInventoryRowSerializer(serializers.Serializer):
    product = serializers.SerializerMethodField()
    stock_count = serializers.IntegerField()
    reorder_point = serializers.SerializerMethodField()
    is_low = serializers.SerializerMethodField()
    stock_value = serializers.SerializerMethodField()

    def get_product(self, obj: Product) -> dict:
        return {"id": obj.pk, "name": obj.name, "sku": obj.sku}

    def get_reorder_point(self, obj: Product) -> int | None:
        alert = getattr(obj, "stock_alert", None)
        return alert.reorder_point if alert else None

    def get_is_low(self, obj: Product) -> bool:
        alert = getattr(obj, "stock_alert", None)
        return bool(alert and alert.is_triggered)

    def get_stock_value(self, obj: Product) -> int | None:
        # cost_price-derived — same "cost_price" permission as the product
        # serializer's own field (§7.5 sensitive sections).
        if not _can_view_cost_price(self.context.get("request")):
            return None
        return obj.stock_count * obj.cost_price if obj.cost_price is not None else None


class AdminInventoryFilter(django_filters.FilterSet):
    category = django_filters.NumberFilter(field_name="category_id")
    isLow = django_filters.BooleanFilter(method="filter_is_low")

    class Meta:
        model = Product
        fields = []

    def filter_is_low(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(stock_alert__is_active=True, stock_count__lte=F("stock_alert__reorder_point"))


class AdminInventoryListView(ListAPIView):
    permission_classes = [require_section("inventory")]
    serializer_class = AdminInventoryRowSerializer
    filterset_class = AdminInventoryFilter
    queryset = Product.objects.select_related("stock_alert")


class AdminInventorySummaryView(APIView):
    permission_classes = [require_section("inventory")]

    def get(self, request):
        low_stock_count = StockAlert.objects.filter(
            is_active=True, product__stock_count__lte=F("reorder_point")
        ).count()
        total_stock_value = None
        if _can_view_cost_price(request):
            priced = Product.objects.exclude(cost_price=None)
            if priced.exists():
                total_stock_value = sum(p.stock_count * p.cost_price for p in priced)
        return Response({"total_stock_value": total_stock_value, "low_stock_count": low_stock_count})


class StockAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockAlert
        fields = ["reorder_point", "is_active"]


class AdminInventoryAlertView(APIView):
    permission_classes = [require_section("inventory")]

    def patch(self, request, product_id):
        product = Product.objects.get(pk=product_id)
        alert, _ = StockAlert.objects.get_or_create(product=product)
        serializer = StockAlertSerializer(alert, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_admin_action(user=request.user, action="update", model_name="StockAlert", object_id=product.pk)
        return Response(serializer.data)


class AdminStockMovementSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = ["id", "product", "type", "quantity", "balance_after", "reference", "note", "user", "created_at"]

    def get_id(self, obj: StockMovement) -> str:
        return str(obj.pk)

    def get_user(self, obj: StockMovement) -> str | None:
        return obj.user.get_full_name() if obj.user else None


class AdminStockMovementFilter(django_filters.FilterSet):
    product = django_filters.NumberFilter(field_name="product_id")
    type = django_filters.CharFilter(field_name="type")
    dateFrom = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    dateTo = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = StockMovement
        fields = []


# Only these types can be created manually — sale/return_in are exclusively
# written by the order state machine (ADMIN-API-CONTRACT.md §13).
_MANUAL_MOVEMENT_TYPES = {"purchase", "production", "adjustment", "scrap"}


class CreateStockMovementSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    type = serializers.ChoiceField(choices=sorted(_MANUAL_MOVEMENT_TYPES))
    quantity = serializers.IntegerField()
    note = serializers.CharField(required=False, allow_blank=True, default="")


class AdminStockMovementListCreateView(ListAPIView):
    permission_classes = [require_section("stock_ledger")]
    serializer_class = AdminStockMovementSerializer
    filterset_class = AdminStockMovementFilter
    queryset = StockMovement.objects.select_related("user").order_by("-created_at")

    def post(self, request):
        serializer = CreateStockMovementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            product = Product.objects.get(pk=data["product_id"])
            movement = StockMovement.objects.record(
                product, data["type"], abs(data["quantity"]), note=data.get("note", ""), user=request.user
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        log_admin_action(user=request.user, action="create", model_name="StockMovement", object_id=movement.pk)
        return Response(AdminStockMovementSerializer(movement).data, status=status.HTTP_201_CREATED)


class AdminStockMovementExportView(APIView):
    """Respects the same filters the stock-ledger table has active (§6: 'هر
    خروجی باید فیلترهای فعال جدول را رعایت کند') — same filterset the list
    view itself uses, applied to the same base queryset."""

    permission_classes = [require_section("stock_ledger")]

    _COLUMNS = [
        Column("date", "تاریخ"),
        Column("product", "محصول"),
        Column("sku", "کد کالا"),
        Column("type", "نوع تراکنش"),
        Column("quantity", "مقدار", COUNT_FORMAT),
        Column("balance_after", "مانده پس از تراکنش", COUNT_FORMAT),
        Column("reference", "مرجع"),
        Column("note", "یادداشت"),
        Column("user", "کاربر"),
    ]

    def get(self, request):
        base_qs = StockMovement.objects.select_related("user", "product").order_by("-created_at")
        qs = AdminStockMovementFilter(request.query_params, queryset=base_qs).qs

        bits = []
        date_from = parse_date(request.query_params.get("dateFrom", "")) if request.query_params.get("dateFrom") else None
        date_to = parse_date(request.query_params.get("dateTo", "")) if request.query_params.get("dateTo") else None
        if date_from:
            bits.append(f"از {format_jalali_date(date_from)}")
        if date_to:
            bits.append(f"تا {format_jalali_date(date_to)}")
        filter_summary = " ".join(bits) or "همه بازه‌ها"

        rows = [
            {
                "date": format_jalali_date(movement.created_at),
                "product": movement.product.name,
                "sku": movement.product.sku,
                "type": TYPE_LABELS.get(movement.type, movement.type),
                "quantity": movement.quantity,
                "balance_after": movement.balance_after,
                "reference": movement.reference,
                "note": movement.note,
                "user": movement.user.get_full_name() if movement.user else "",
            }
            for movement in qs
        ]
        workbook = build_workbook(
            sheet_name="کاردکس انبار",
            report_title="کاردکس انبار",
            columns=self._COLUMNS,
            rows=rows,
            filter_summary=filter_summary,
            generated_by=request.user.get_full_name(),
        )
        return xlsx_response(workbook, xlsx_filename("stock-movements"))


class AdminStockLedgerPdfView(APIView):
    """Same filters as AdminStockMovementListCreateView — BACKEND-TASK.md
    §3.6: 'همان فیلترهای فعال را روی سند اعمال کند'."""

    permission_classes = [require_section("stock_ledger")]

    def get(self, request):
        from django.utils.dateparse import parse_date

        from apps.documents.responses import pdf_filename, pdf_response
        from apps.documents.stock_ledger import render_stock_ledger_pdf

        base_qs = StockMovement.objects.select_related("user", "product").order_by("-created_at")
        movements = AdminStockMovementFilter(request.query_params, queryset=base_qs).qs

        date_from = parse_date(request.query_params.get("dateFrom", "")) if request.query_params.get("dateFrom") else None
        date_to = parse_date(request.query_params.get("dateTo", "")) if request.query_params.get("dateTo") else None

        pdf_bytes = render_stock_ledger_pdf(
            movements, date_from=date_from, date_to=date_to, generated_by_name=request.user.get_full_name()
        )
        return pdf_response(pdf_bytes, pdf_filename("stock-ledger"))


class AdminStocktakePdfView(APIView):
    permission_classes = [require_section("inventory")]

    def get(self, request):
        from apps.documents.responses import pdf_filename, pdf_response
        from apps.documents.stocktake import render_stocktake_pdf

        base_qs = Product.objects.select_related("category").order_by("name")
        products = AdminInventoryFilter(request.query_params, queryset=base_qs).qs
        pdf_bytes = render_stocktake_pdf(products, generated_by_name=request.user.get_full_name())
        return pdf_response(pdf_bytes, pdf_filename("stocktake-sheet"))
