import datetime

import django_filters
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders import order_status, payment_state
from apps.orders.models import Order, OrderItemUnit, Payment, Shipment
from apps.orders.order_status import InvalidOrderTransition, MissingSerialNumbers

from .activity import log_admin_action
from .permissions import require_section

# D-05 §۱/۶ — نام‌های فیلد با apps/orders/models.py بازنویسی‌شده (۹ وضعیت
# آربایت) هماهنگ شد: number->order_number، total->final_total،
# discount->discount_total، OrderStatusLog->status_history، gateway->method/
# provider/gateway، ref_id->provider_ref. tax حذف شد (نه در Prisma، پیکربندی
# نرخ مالیات هیچ‌وقت نبود).
ORDER_PREFETCH = ("items__units", "payments__receipts", "status_history")

# F-01 §۳ — گذارهایی که ادمین دستی از پنل می‌زند. PENDING→AWAITING_PAYMENT
# سیستمی است (چک‌اوت)؛ PAYMENT_REVIEW→AWAITING_PAYMENT فقط با رد رسید
# (payments.py) تا دلیل رد ثبت و پیامک/وضعیت پرداخت هم‌گام بماند.
_SYSTEM_ONLY_TRANSITIONS = {("PENDING", "AWAITING_PAYMENT"), ("PAYMENT_REVIEW", "AWAITING_PAYMENT")}


def admin_transitions(from_status: str) -> list[str]:
    return [
        to for to in order_status.ORDER_STATUS_TRANSITIONS.get(from_status, ())
        if (from_status, to) not in _SYSTEM_ONLY_TRANSITIONS
    ]

# سفارش‌هایی که فاکتور رسمی معنا دارد — بعد از تأیید پرداخت.
_INVOICEABLE_STATUSES = {"PAID", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"}


class AdminOrderUnitSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    serial_number = serializers.CharField(allow_null=True)
    certificate_id = serializers.CharField()


class AdminOrderItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    units = AdminOrderUnitSerializer(many=True, read_only=True)
    variant = serializers.IntegerField(source="variant_id", allow_null=True)
    product_name = serializers.CharField(source="product_name_snapshot")
    variant_name = serializers.CharField(source="variant_name_snapshot", allow_null=True)
    sku = serializers.CharField(source="sku_snapshot")
    price = serializers.IntegerField(source="unit_price")
    quantity = serializers.IntegerField()
    discount = serializers.IntegerField()
    subtotal = serializers.IntegerField()
    final_price = serializers.IntegerField()


class AdminOrderReceiptSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    amount = serializers.IntegerField()
    status = serializers.CharField()
    uploaded_at = serializers.DateTimeField()
    reviewed_at = serializers.DateTimeField(allow_null=True)
    rejection_reason = serializers.CharField(allow_null=True)
    file_url = serializers.SerializerMethodField()

    def get_file_url(self, obj) -> str:
        return f"/api/admin/payments/receipts/{obj.pk}/file/"


class AdminPaymentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    receipts = AdminOrderReceiptSerializer(many=True, read_only=True)
    method = serializers.CharField()
    provider = serializers.CharField()
    gateway = serializers.CharField(allow_null=True)
    amount = serializers.IntegerField()
    status = serializers.CharField()
    provider_ref = serializers.CharField(allow_null=True)
    paid_at = serializers.DateTimeField(allow_null=True)
    failure_reason = serializers.CharField()
    bale = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()

    def get_bale(self, obj) -> dict | None:
        """AUDIT-2 §۶/§۸ — آخرین جلسه‌ی بله (بدون توکن/chat_id)."""
        if obj.method != "GATEWAY":
            return None
        session = obj.bale_sessions.order_by("-created_at").first()
        if session is None:
            return None
        return {
            "status": session.status,
            "providerPaymentChargeId": session.provider_payment_charge_id,
            "amountRial": session.amount_rial,
            "createdAt": session.created_at,
            "paidAt": session.paid_at,
            "failureReason": session.failure_reason,
        }


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
    user_phone = serializers.CharField(source="user.phone", default=None)
    allowed_transitions = serializers.SerializerMethodField()
    missing_serial_item_ids = serializers.SerializerMethodField()
    payment_breakdown = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "user", "status", "payment_status", "payment_plan", "payment_breakdown",
            "shipping_recipient_name", "shipping_mobile", "shipping_province",
            "shipping_city", "shipping_address_line", "shipping_postal_code",
            "subtotal", "discount_total", "shipping_cost", "final_total", "cancel_reason",
            "shipping_method_name", "invoice_type", "company_name", "national_id", "economic_code",
            "registration_number", "user_phone", "allowed_transitions", "missing_serial_item_ids",
            "items", "payments", "shipment", "status_history",
            "created_at", "updated_at", "paid_at", "shipped_at", "delivered_at",
        ]

    def get_id(self, obj: Order) -> str:
        return str(obj.pk)

    def get_payment_breakdown(self, obj: Order) -> dict:
        return payment_state.breakdown(obj)

    def get_allowed_transitions(self, obj: Order) -> list[str]:
        return admin_transitions(obj.status)

    def get_missing_serial_item_ids(self, obj: Order) -> list[int]:
        return order_status._missing_serial_item_ids(obj)

    def get_shipment(self, obj: Order) -> dict | None:
        shipment = getattr(obj, "shipment", None)
        return AdminShipmentSerializer(shipment).data if shipment else None


class AdminOrderFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status")
    user = django_filters.NumberFilter(field_name="user_id")
    dateFrom = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    dateTo = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")
    search = django_filters.CharFilter(method="filter_search")
    readyWithoutSerial = django_filters.BooleanFilter(method="filter_ready_without_serial")

    class Meta:
        model = Order
        fields = []

    def filter_search(self, queryset, name, value):
        """F-01 §۳ — شماره سفارش یا موبایل (گیرنده یا صاحب حساب)."""
        value = value.strip()
        if not value:
            return queryset
        return queryset.filter(
            Q(order_number__icontains=value) | Q(shipping_mobile__icontains=value) | Q(user__phone__icontains=value)
        )

    def filter_ready_without_serial(self, queryset, name, value):
        """داشبورد — «آماده‌ی ارسال بدون سریال»: در حال پردازش با دست‌کم یک واحد بی‌سریال."""
        if not value:
            return queryset
        return queryset.filter(
            Q(items__units__serial_number__isnull=True) | Q(items__units__serial_number=""), status="PROCESSING"
        ).distinct()


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
    except MissingSerialNumbers as exc:
        return Response(
            {"detail": str(exc), "orderItemIds": exc.order_item_ids},
            status=status.HTTP_400_BAD_REQUEST,
        )
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
        pdf_bytes = get_invoice_pdf(order)
        return pdf_response(pdf_bytes, pdf_filename(f"invoice-{order.order_number}"))


class AdminOrderPackingSlipPdfView(APIView):
    permission_classes = [require_section("orders")]

    def get(self, request, pk):
        from apps.documents.packing_slip import render_packing_slip_pdf
        from apps.documents.responses import pdf_filename, pdf_response

        order = Order.objects.prefetch_related("items__units").get(pk=pk)
        pdf_bytes = render_packing_slip_pdf(order)
        return pdf_response(pdf_bytes, pdf_filename(f"packing-slip-{order.order_number}"))


class AdminOrderWarrantyCardsPdfView(APIView):
    permission_classes = [require_section("orders")]

    def get(self, request, pk):
        from apps.documents.responses import pdf_filename, pdf_response
        from apps.documents.warranty_card import render_warranty_cards_pdf

        order = Order.objects.get(pk=pk)
        pdf_bytes = render_warranty_cards_pdf(order)
        return pdf_response(pdf_bytes, pdf_filename(f"warranty-cards-{order.order_number}"))


class AdminOrderShippingLabelPdfView(APIView):
    permission_classes = [require_section("orders")]

    def get(self, request, pk):
        from apps.documents.responses import pdf_filename, pdf_response
        from apps.documents.shipping_label import render_shipping_label_pdf

        order = Order.objects.select_related("shipment").get(pk=pk)
        pdf_bytes = render_shipping_label_pdf(order)
        return pdf_response(pdf_bytes, pdf_filename(f"shipping-label-{order.order_number}"))


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
        pdf_bytes = render_daily_shipping_list_pdf(orders, target_date=target_date)
        return pdf_response(pdf_bytes, pdf_filename(f"daily-shipping-list-{target_date.isoformat()}"))


class AdminOrderMarkPaidView(APIView):
    """کارت‌به‌کارت این از طریق تأیید رسید انجام می‌شود
    (AdminReceiptApproveView، apps/admin_api/payments.py)، نه این مسیر —
    این endpoint برای گذار دستی ادمین (مثلاً واریز نقدی خارج از سیستم) باقی
    مانده."""

    permission_classes = [require_section("orders", action="edit")]

    def post(self, request, pk):
        order = Order.objects.get(pk=pk)
        if order.status not in ("AWAITING_PAYMENT", "PAYMENT_REVIEW"):
            return Response({"detail": "این سفارش در مرحله‌ی پرداخت نیست."}, status=status.HTTP_400_BAD_REQUEST)
        # AUDIT-2 — «پرداخت‌شده» یعنی همه‌ی سهم‌های باز تأیید دستی می‌شوند (ثبت در هر Payment)،
        # نه پرچم کلی روی سفارش؛ ترکیب پرداخت در پنل درست می‌ماند.
        open_payments = [p for p in payment_state.active_payments(order) if p.status != "CONFIRMED"]
        if not payment_state.active_payments(order):
            # سفارش بدون ردیف پرداخت (مثلاً واریز نقدی بیرون از سیستم): یک سهم دستی.
            open_payments = [
                Payment.objects.create(
                    order=order, method="MANUAL_CARD_TO_CARD", amount=order.final_total, status="UNPAID"
                )
            ]
        for payment in open_payments:
            payment_state.confirm_payment(payment, provider_ref="manual", user=request.user, note="تأیید دستی ادمین")
        log_admin_action(user=request.user, action="mark_paid", model_name="Order", object_id=order.pk)
        order.refresh_from_db()
        return Response(AdminOrderSerializer(order).data)


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


class AdminOrderTransitionView(APIView):
    """F-01 §۳ — یک مسیر برای همه‌ی گذارهای دستی پنل: `{to, note}`؛ برای
    SHIPPED `provider` و `trackingNumber` هم لازم است. فقط گذارهای
    `admin_transitions()` مجازند (همان فهرستی که پنل دکمه‌اش را نشان می‌دهد)."""

    permission_classes = [require_section("orders", action="edit")]

    def post(self, request, pk):
        order = Order.objects.get(pk=pk)
        to_status = str(request.data.get("to", ""))
        note = str(request.data.get("note", "") or "").strip()
        if to_status not in admin_transitions(order.status):
            return Response({"detail": f"گذار {order.status} → {to_status} از پنل مجاز نیست."}, status=status.HTTP_400_BAD_REQUEST)
        if to_status == "SHIPPED":
            tracking_number = str(request.data.get("tracking_number", "") or "").strip()
            provider = str(request.data.get("provider", "") or "").strip()
            if not tracking_number or not provider:
                return Response({"detail": "شرکت ارسال و کد رهگیری برای ثبت ارسال الزامی است."}, status=status.HTTP_400_BAD_REQUEST)
            Shipment.objects.update_or_create(
                order=order,
                defaults={"provider": provider, "cost": order.shipping_cost, "tracking_number": tracking_number,
                          "shipped_at": timezone.now()},
            )
        response = _transition_response(order, to_status, user=request.user, note=note)
        if response.status_code == 200:
            if to_status == "PAID":
                order_status.sync_payment_status(order, "CONFIRMED")
            log_admin_action(user=request.user, action=f"transition:{to_status}", model_name="Order", object_id=order.pk)
        return response


class AdminOrderSerialsView(APIView):
    """F-01 §۳ — ورود سریال هر واحد: `{units: [{id, serialNumber}]}`. فقط
    تا قبل از READY_TO_SHIP (بعد از آن کارت گارانتی/بسته‌بندی چاپ شده‌اند)."""

    permission_classes = [require_section("orders", action="edit")]
    _EDITABLE_STATUSES = {"PAID", "PROCESSING"}

    def post(self, request, pk):
        order = Order.objects.get(pk=pk)
        if order.status not in self._EDITABLE_STATUSES:
            return Response({"detail": "سریال فقط در وضعیت پرداخت‌شده یا در حال پردازش قابل ثبت است."}, status=status.HTTP_400_BAD_REQUEST)
        rows = request.data.get("units") or []
        units = {u.pk: u for u in OrderItemUnit.objects.filter(order_item__order=order)}
        for row in rows:
            unit = units.get(int(row.get("id", 0) or 0))
            if unit is None:
                return Response({"detail": "واحد متعلق به این سفارش نیست."}, status=status.HTTP_400_BAD_REQUEST)
            unit.serial_number = str(row.get("serial_number", "") or "").strip() or None
            unit.save(update_fields=["serial_number"])
        log_admin_action(user=request.user, action="set_serials", model_name="Order", object_id=order.pk)
        order = Order.objects.select_related("user", "shipment").prefetch_related(*ORDER_PREFETCH).get(pk=order.pk)
        return Response(AdminOrderSerializer(order).data)
