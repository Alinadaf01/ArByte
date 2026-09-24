from django.db.models import Count, F, IntegerField, Sum
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.utils.dateparse import parse_date
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.documents.excel import COUNT_FORMAT, TOMAN_FORMAT, Column, build_workbook
from apps.documents.persian import format_jalali_date
from apps.documents.responses import xlsx_filename, xlsx_response
from apps.orders.models import Cart, Order, OrderItem, Payment, Return
from apps.users.models import User

from .permissions import require_section

_TRUNC = {"day": TruncDate, "week": TruncWeek, "month": TruncMonth}


def _date_range(request):
    from_date = parse_date(request.query_params.get("from", "")) if request.query_params.get("from") else None
    to_date = parse_date(request.query_params.get("to", "")) if request.query_params.get("to") else None
    return from_date, to_date


def _paid_orders_in_range(from_date, to_date):
    qs = Order.objects.filter(paid_at__isnull=False)
    if from_date:
        qs = qs.filter(paid_at__date__gte=from_date)
    if to_date:
        qs = qs.filter(paid_at__date__lte=to_date)
    return qs


class AdminSalesReportView(APIView):
    permission_classes = [require_section("reports")]

    def get(self, request):
        from_date, to_date = _date_range(request)
        group_by = request.query_params.get("groupBy", "day")
        trunc = _TRUNC.get(group_by, TruncDate)

        qs = _paid_orders_in_range(from_date, to_date)
        rows = (
            qs.annotate(period=trunc("paid_at"))
            .values("period")
            .annotate(total=Sum("total"), order_count=Count("id"))
            .order_by("period")
        )
        series = [{"period": row["period"].isoformat(), "total": row["total"], "order_count": row["order_count"]} for row in rows]
        order_count = sum(r["order_count"] for r in series)
        total = sum(r["total"] for r in series)
        average_order_value = round(total / order_count) if order_count else 0
        return Response({"series": series, "average_order_value": average_order_value})


_GROUP_BY_LABELS = {"day": "روزانه", "week": "هفتگی", "month": "ماهانه"}


class AdminSalesReportExportView(APIView):
    permission_classes = [require_section("reports")]

    _COLUMNS = [
        Column("period", "دوره"),
        Column("total", "مبلغ فروش", TOMAN_FORMAT),
        Column("order_count", "تعداد سفارش", COUNT_FORMAT),
    ]

    def get(self, request):
        from_date, to_date = _date_range(request)
        group_by = request.query_params.get("groupBy", "day")
        trunc = _TRUNC.get(group_by, TruncDate)

        qs = _paid_orders_in_range(from_date, to_date)
        db_rows = (
            qs.annotate(period=trunc("paid_at"))
            .values("period")
            .annotate(total=Sum("total"), order_count=Count("id"))
            .order_by("period")
        )
        rows = [
            {"period": format_jalali_date(row["period"]), "total": row["total"], "order_count": row["order_count"]}
            for row in db_rows
        ]

        bits = [f"تفکیک: {_GROUP_BY_LABELS.get(group_by, group_by)}"]
        if from_date:
            bits.append(f"از {format_jalali_date(from_date)}")
        if to_date:
            bits.append(f"تا {format_jalali_date(to_date)}")

        workbook = build_workbook(
            sheet_name="گزارش فروش",
            report_title="گزارش فروش دوره‌ای",
            columns=self._COLUMNS,
            rows=rows,
            filter_summary=" ".join(bits),
            generated_by=request.user.get_full_name(),
            totals={
                "total": sum(row["total"] for row in rows),
                "order_count": sum(row["order_count"] for row in rows),
            },
        )
        return xlsx_response(workbook, xlsx_filename("sales-report"))


class AdminSalesReportPdfView(APIView):
    permission_classes = [require_section("reports")]

    def get(self, request):
        from apps.documents.responses import pdf_filename, pdf_response
        from apps.documents.sales_report import render_sales_report_pdf

        from_date, to_date = _date_range(request)
        pdf_bytes = render_sales_report_pdf(
            date_from=from_date, date_to=to_date, generated_by_name=request.user.get_full_name()
        )
        return pdf_response(pdf_bytes, pdf_filename("sales-report"))


class AdminTopProductsReportView(APIView):
    permission_classes = [require_section("reports")]

    def get(self, request):
        from_date, to_date = _date_range(request)
        by = request.query_params.get("by", "quantity")

        items = OrderItem.objects.filter(order__paid_at__isnull=False, product__isnull=False)
        if from_date:
            items = items.filter(order__paid_at__date__gte=from_date)
        if to_date:
            items = items.filter(order__paid_at__date__lte=to_date)

        rows = (
            items.values("product_id", "product__name", "product__sku")
            .annotate(units_sold=Sum("quantity"), revenue=Sum(F("price") * F("quantity"), output_field=IntegerField()))
            .order_by("-revenue" if by == "revenue" else "-units_sold")
        )
        return Response(
            [
                {
                    "product": {"id": row["product_id"], "name": row["product__name"], "sku": row["product__sku"]},
                    "units_sold": row["units_sold"],
                    "revenue": row["revenue"],
                }
                for row in rows
            ]
        )


class AdminByCategoryReportView(APIView):
    permission_classes = [require_section("reports")]

    def get(self, request):
        from_date, to_date = _date_range(request)
        items = OrderItem.objects.filter(order__paid_at__isnull=False, product__isnull=False)
        if from_date:
            items = items.filter(order__paid_at__date__gte=from_date)
        if to_date:
            items = items.filter(order__paid_at__date__lte=to_date)

        rows = (
            items.values("product__category_id", "product__category__name")
            .annotate(total=Sum(F("price") * F("quantity"), output_field=IntegerField()), order_count=Count("order_id", distinct=True))
            .order_by("-total")
        )
        return Response(
            [
                {"category": {"id": row["product__category_id"], "name": row["product__category__name"]}, "total": row["total"], "order_count": row["order_count"]}
                for row in rows
            ]
        )


class AdminConversionReportView(APIView):
    permission_classes = [require_section("reports")]

    def get(self, request):
        from_date, to_date = _date_range(request)
        carts = Cart.objects.all()
        if from_date:
            carts = carts.filter(created_at__date__gte=from_date)
        if to_date:
            carts = carts.filter(created_at__date__lte=to_date)
        carts_created = carts.count()
        orders_paid = _paid_orders_in_range(from_date, to_date).count()
        rate = round(orders_paid / carts_created, 4) if carts_created else 0
        return Response({"carts_created": carts_created, "orders_paid": orders_paid, "rate": rate})


class AdminAbandonedCartsReportView(APIView):
    permission_classes = [require_section("reports")]

    def get(self, request):
        # Checkout empties the cart server-side (see CheckoutView), so a
        # cart from this window that still has items was never converted —
        # the closest signal to "abandoned" this schema can give without a
        # direct Cart -> Order link.
        from_date, to_date = _date_range(request)
        carts = Cart.objects.all()
        if from_date:
            carts = carts.filter(created_at__date__gte=from_date)
        if to_date:
            carts = carts.filter(created_at__date__lte=to_date)
        carts_created = carts.count()
        carts_abandoned = carts.filter(items__isnull=False).distinct().count()
        rate = round(carts_abandoned / carts_created, 4) if carts_created else 0
        return Response({"carts_created": carts_created, "carts_abandoned": carts_abandoned, "rate": rate})


class AdminCustomersReportView(APIView):
    permission_classes = [require_section("reports")]

    def get(self, request):
        from_date, to_date = _date_range(request)
        users = User.objects.all()
        if from_date:
            users = users.filter(created_at__date__gte=from_date)
        if to_date:
            users = users.filter(created_at__date__lte=to_date)
        new_customers = users.count()

        orders_in_range = _paid_orders_in_range(from_date, to_date)
        returning_customers = 0
        for user_id in orders_in_range.values_list("user_id", flat=True).distinct():
            if Order.objects.filter(user_id=user_id, paid_at__isnull=False).count() > 1:
                returning_customers += 1
        return Response({"new_customers": new_customers, "returning_customers": returning_customers})


class AdminByGatewayReportView(APIView):
    permission_classes = [require_section("reports")]

    def get(self, request):
        from_date, to_date = _date_range(request)
        payments = Payment.objects.filter(status="success")
        if from_date:
            payments = payments.filter(verified_at__date__gte=from_date)
        if to_date:
            payments = payments.filter(verified_at__date__lte=to_date)
        rows = (
            payments.values("gateway")
            .annotate(total=Sum("amount"), order_count=Count("order_id", distinct=True))
            .order_by("-total")
        )
        return Response([{"gateway": row["gateway"], "total": row["total"], "order_count": row["order_count"]} for row in rows])


class AdminReturnRateReportView(APIView):
    permission_classes = [require_section("reports")]

    def get(self, request):
        from_date, to_date = _date_range(request)
        delivered = Order.objects.exclude(status__in=["pending", "paid", "processing"])
        returned = Return.objects.all()
        if from_date:
            delivered = delivered.filter(updated_at__date__gte=from_date)
            returned = returned.filter(created_at__date__gte=from_date)
        if to_date:
            delivered = delivered.filter(updated_at__date__lte=to_date)
            returned = returned.filter(created_at__date__lte=to_date)
        orders_delivered = delivered.count()
        orders_returned = returned.count()
        rate = round(orders_returned / orders_delivered, 4) if orders_delivered else 0
        return Response({"orders_delivered": orders_delivered, "orders_returned": orders_returned, "rate": rate})


class AdminGrossMarginReportView(APIView):
    permission_classes = [require_section("reports")]

    def get(self, request):
        from_date, to_date = _date_range(request)
        items = OrderItem.objects.filter(order__paid_at__isnull=False, product__isnull=False).select_related("product")
        if from_date:
            items = items.filter(order__paid_at__date__gte=from_date)
        if to_date:
            items = items.filter(order__paid_at__date__lte=to_date)

        revenue = 0
        cost = 0
        total_units = 0
        priced_units = 0
        for item in items:
            revenue += item.price * item.quantity
            total_units += item.quantity
            if item.product.cost_price is not None:
                cost += item.product.cost_price * item.quantity
                priced_units += item.quantity

        margin = revenue - cost
        coverage_percent = round(priced_units / total_units * 100, 1) if total_units else 0
        return Response({"revenue": revenue, "cost": cost, "margin": margin, "coverage_percent": coverage_percent})
