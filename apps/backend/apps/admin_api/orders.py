import datetime

import django_filters
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders import order_status
from apps.orders.models import Order, Shipment
from apps.orders.order_status import InvalidOrderTransition

from .activity import log_admin_action
from .permissions import require_section

# D-05 §۱/۶ — نام‌های فیلد با apps/orders/models.py بازنویسی‌شده (۹ وضعیت
# آربایت) هماهنگ شد: number->order_number، total->final_total،
# discount->discount_total، OrderStatusLog->status_history، gateway->method/
# provider/gateway، ref_id->provider_ref. tax حذف شد (نه در Prisma، پیکربندی
# نرخ مالیات هیچ‌وقت نبود).
ORDER_PREFETCH = ("items", "payments", "status_history")

# سفارش‌هایی که فاکتور رسمی معنا دارد — بعد از تأیید پرداخت.
_INVOICEABLE_STATUSES = {"PAID", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"}


class AdminOrderItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    variant = serializers.IntegerField(source="variant_id", allow_null=True)
    product_name = serializers.CharField(source="product_name_snapshot")
    variant_name = serializers.CharField(source="variant_name_snapshot", allow_null=True)
    sku = serializers.CharField(source="sku_snapshot")
    price = serializers.IntegerField(source="unit_price")
    quantity = serializers.IntegerField()
    discount = serializers.IntegerField()
    subtotal = serializers.IntegerField()
    final_price = serializers.IntegerField()


class AdminPaymentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    method = serializers.CharField()
    provider = serializers.CharField()
    gateway = serializers.CharField(allow_null=True)
    amount = serializers.IntegerField()
    status = serializers.CharField()
    provider_ref = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class AdminShipmentSerializer(serializers.Serializer):
    provider = serializers.CharField()
    cost = serializers.IntegerField()
    tracking_number = serializers.CharField(allow_null=True)
    tracking_url = serializers.CharField(allow_null=True)
    shipped_at = serializers.DateTimeField(allow_null=True)
    delivered_at = serializers.DateTimeField(allow_null=True)


class AdminOrderStatusHistorySerializer(serializers.Serializer):
    from_status = serializers.CharField(allow_null=True)
    to_status = serializers.CharField()
    note = serializers.CharField(allow_null=True)
    changed_by = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField()

    def get_changed_by(self, obj) -> str | None:
        return obj.changed_by.get_full_name() if obj.changed_by else None


class AdminOrderSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    user = serializers.IntegerField(source="user_id")
    items = AdminOrderItemSerializer(many=True, read_only=True)
    payments = AdminPaymentSerializer(many=True, read_only=True)
    status_history = AdminOrderStatusHistorySerializer(many=True, read_only=True)
    shipment = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "user", "status", "payment_status",
            "shipping_recipient_name", "shipping_mobile", "shipping_province",
            "shipping_city", "shipping_address_line", "shipping_postal_code",
            "subtotal", "discount_total", "shipping_cost", "final_total", "cancel_reason",
            "items", "payments", "shipment", "status_history",
            "created_at", "updated_at", "paid_at", "shipped_at", "delivered_at",
        ]

    def get_id(self, obj: Order) -> str:
        return str(obj.pk)

    def get_shipment(self, obj: Order) -> dict | None:
        shipment = getattr(obj, "shipment", None)
        return AdminShipmentSerializer(shipment).data if shipment else None


class AdminOrderFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status")
    user = django_filters.NumberFilter(field_name="user_id")
    dateFrom = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    dateTo = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")
    search = django_filters.CharFilter(field_name="order_number", lookup_expr="icontains")

    class Meta:
        model = Order
        fields = []


class AdminOrderListView(ListAPIView):
    permission_classes = [require_section("orders")]
    serializer_class = AdminOrderSerializer
    filterset_class = AdminOrderFilter
    queryset = Order.objects.select_related("user", "shipment").prefetch_related(*ORDER_PREFETCH)


class AdminOrderDetailView(RetrieveAPIView):
    permission_classes = [require_section("orders")]
    serializer_class = AdminOrderSerializer
    queryset = Order.objects.select_related("user", "shipment").prefetch_related(*ORDER_PREFETCH)


def _transition_response(order: Order, to_status: str, /, **kwargs) -> Response:
    try:
        order_status.transition_to(order, to_status, **kwargs)
    except InvalidOrderTransition as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    order.refresh_from_db()
    return Response(AdminOrderSerializer(order).data)


class AdminOrderInvoicePdfView(APIView):
    """Same document and cache as the customer-facing invoice — see
    apps/documents/invoice.py."""

    permission_classes = [require_section("orders")]

    def get(self, request, pk):
        from apps.documents.invoice import get_invoice_pdf
        from apps.documents.responses import pdf_filename, pdf_response

        order = Order.objects.get(pk=pk)
        if order.status not in _INVOICEABLE_STATUSES:
            return Response(
                {"detail": "فاکتور فقط برای سفارش‌های پرداخت‌شده در دسترس است."}, status=status.HTTP_400_BAD_REQUEST
            )
        pdf_bytes = get_invoice_pdf(order, generated_by_name=request.user.get_full_name())
        return pdf_response(pdf_bytes, pdf_filename(f"invoice-{order.order_number}"))


class AdminOrderPackingSlipPdfView(APIView):
    permission_classes = [require_section("orders")]

    def get(self, request, pk):
        from apps.documents.packing_slip import render_packing_slip_pdf
        from apps.documents.responses import pdf_filename, pdf_response

        order = Order.objects.prefetch_related("items").get(pk=pk)
        pdf_bytes = render_packing_slip_pdf(order, generated_by_name=request.user.get_full_name())
        return pdf_response(pdf_bytes, pdf_filename(f"packing-slip-{order.order_number}"))


class AdminDailyShippingListPdfView(APIView):
    permission_classes = [require_section("orders")]

    def get(self, request):
        from apps.documents.daily_shipping_list import render_daily_shipping_list_pdf
        from apps.documents.responses import pdf_filename, pdf_response

        date_param = request.query_params.get("date")
        target_date = datetime.date.fromisoformat(date_param) if date_param else timezone.localdate()

        orders = (
            Order.objects.filter(status="PROCESSING", updated_at__date=target_date)
            .prefetch_related("items")
            .order_by("order_number")
        )
        pdf_bytes = render_daily_shipping_list_pdf(
            orders, target_date=target_date, generated_by_name=request.user.get_full_name()
        )
        return pdf_response(pdf_bytes, pdf_filename(f"daily-shipping-list-{target_date.isoformat()}"))


class AdminOrderMarkPaidView(APIView):
    """کارت‌به‌کارت این از طریق تأیید رسید انجام می‌شود
    (AdminReceiptApproveView، apps/admin_api/payments.py)، نه این مسیر —
    این endpoint برای گذار دستی ادمین (مثلاً واریز نقدی خارج از سیستم) باقی
    مانده."""

    permission_classes = [require_section("orders", action="edit")]

    def post(self, request, pk):
        order = Order.objects.get(pk=pk)
        response = _transition_response(order, "PAID", user=request.user)
        if response.status_code == 200:
            order_status.sync_payment_status(order, "CONFIRMED")
            log_admin_action(user=request.user, action="mark_paid", model_name="Order", object_id=order.pk)
        return response


class AdminOrderStartProcessingView(APIView):
    permission_classes = [require_section("orders", action="edit")]

    def post(self, request, pk):
        order = Order.objects.get(pk=pk)
        response = _transition_response(order, "PROCESSING", user=request.user)
        if response.status_code == 200:
            log_admin_action(user=request.user, action="start_processing", model_name="Order", object_id=order.pk)
        return response


class AdminOrderReadyToShipView(APIView):
    permission_classes = [require_section("orders", action="edit")]

    def post(self, request, pk):
        order = Order.objects.get(pk=pk)
        response = _transition_response(order, "READY_TO_SHIP", user=request.user)
        if response.status_code == 200:
            log_admin_action(user=request.user, action="ready_to_ship", model_name="Order", object_id=order.pk)
        return response


class AdminOrderMarkShippedView(APIView):
    """Shipment باید قبل از گذار به SHIPPED با اطلاعات رهگیری ساخته/به‌روز
    شده باشد (order_status.transition_to «SHIPPED» فرض می‌کند از قبل هست)."""

    permission_classes = [require_section("orders", action="edit")]

    def post(self, request, pk):
        order = Order.objects.get(pk=pk)
        tracking_number = request.data.get("tracking_number", "")
        if not tracking_number or not str(tracking_number).strip():
            return Response(
                {"detail": "کد رهگیری برای ثبت ارسال الزامی است."}, status=status.HTTP_400_BAD_REQUEST
            )
        Shipment.objects.update_or_create(
            order=order,
            defaults={
                "provider": request.data.get("provider", "") or "",
                "cost": order.shipping_cost,
                "tracking_number": tracking_number,
                "tracking_url": request.data.get("tracking_url") or None,
            },
        )
        response = _transition_response(order, "SHIPPED", user=request.user)
        if response.status_code == 200:
            log_admin_action(user=request.user, action="mark_shipped", model_name="Order", object_id=order.pk)
        return response


class AdminOrderMarkDeliveredView(APIView):
    permission_classes = [require_section("orders", action="edit")]

    def post(self, request, pk):
        order = Order.objects.get(pk=pk)
        response = _transition_response(order, "DELIVERED", user=request.user)
        if response.status_code == 200:
            log_admin_action(user=request.user, action="mark_delivered", model_name="Order", object_id=order.pk)
        return response


class AdminOrderCancelView(APIView):
    permission_classes = [require_section("orders", action="edit")]

    def post(self, request, pk):
        order = Order.objects.get(pk=pk)
        reason = request.data.get("reason", "")
        response = _transition_response(order, "CANCELLED", note=reason, user=request.user)
        if response.status_code == 200:
            log_admin_action(user=request.user, action="cancel", model_name="Order", object_id=order.pk)
        return response
