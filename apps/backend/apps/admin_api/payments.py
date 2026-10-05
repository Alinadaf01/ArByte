import django_filters
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders import services as order_services
from apps.orders.models import Payment, PaymentReceipt
from apps.orders.services import CheckoutError

from .activity import log_admin_action
from .permissions import require_section

# D-05 §۳ — پرداخت‌ها/رسیدها (packages/contracts/src/admin/payment.ts).
#
# AUDIT-1 §11 — بخش «payments» در sections.SECTIONS وجود نداشت؛ پس
# require_section("payments") مجوزی را چک می‌کرد که هیچ نقشی نمی‌تواند داشته
# باشد و برای هر ادمین غیر سوپریوزر (حتی «مدیر کل») رسید ۴۰۳ می‌داد. رسید
# بخشی از گردش سفارش است: دیدن = orders.view، تأیید/رد = orders.edit.
PAYMENTS_SECTION = "orders"
# «تأیید/رد رسید» تنها راه واقعی گذار AWAITING_PAYMENT→PAYMENT_REVIEW→PAID
# در روش کارت‌به‌کارت است (order_status.py مستقیم صدا زده نمی‌شود، از
# services.approve_receipt/reject_receipt که هم Payment/Order را sync
# می‌کند هم order_status.transition_to را صدا می‌زند).


class AdminPaymentSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    order_id = serializers.IntegerField()
    order_number = serializers.CharField(source="order.order_number")

    class Meta:
        model = Payment
        fields = [
            "id",
            "order_id",
            "order_number",
            "method",
            "provider",
            "gateway",
            "status",
            "amount",
            "provider_ref",
            "created_at",
        ]

    def get_id(self, obj: Payment) -> str:
        return str(obj.pk)


class AdminPaymentFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status")

    class Meta:
        model = Payment
        fields = []


class AdminPaymentListView(ListAPIView):
    permission_classes = [require_section(PAYMENTS_SECTION, action="view")]
    serializer_class = AdminPaymentSerializer
    filterset_class = AdminPaymentFilter
    queryset = Payment.objects.select_related("order").order_by("-created_at")


class AdminPaymentReceiptSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    payment_id = serializers.IntegerField()
    user_id = serializers.IntegerField()
    file_url = serializers.SerializerMethodField()
    reviewed_by_user_id = serializers.IntegerField(source="reviewed_by_id", allow_null=True)

    class Meta:
        model = PaymentReceipt
        fields = [
            "id",
            "payment_id",
            "user_id",
            "file_url",
            "amount",
            "uploaded_at",
            "status",
            "reviewed_by_user_id",
            "reviewed_at",
            "rejection_reason",
        ]

    def get_id(self, obj: PaymentReceipt) -> str:
        return str(obj.pk)

    def get_file_url(self, obj: PaymentReceipt) -> str:
        # D-05 §۳ — «نه عمومی»؛ لینک مستقیم media نیست، endpoint احراز‌هویت‌شده.
        return f"/api/admin/payments/receipts/{obj.pk}/file/"


class AdminPaymentReceiptListView(ListAPIView):
    permission_classes = [require_section(PAYMENTS_SECTION, action="view")]
    serializer_class = AdminPaymentReceiptSerializer
    queryset = PaymentReceipt.objects.select_related("payment__order").order_by("-uploaded_at")


class AdminPaymentReceiptFileView(APIView):
    """فایل رسید هرگز از مسیر MEDIA_URL عمومی سرو نمی‌شود — فقط از همین
    endpoint احراز‌هویت‌شده (require_section)، چون این پروژه MinIO/presigned
    URL واقعی سیم‌کشی نکرده (D-05 §۳، انحراف مستند — گزارش تسک)."""

    permission_classes = [require_section(PAYMENTS_SECTION, action="view")]

    def get(self, request, pk):
        from django.http import FileResponse

        try:
            receipt = PaymentReceipt.objects.select_related("payment__order").get(pk=pk)
            handle = receipt.file.open("rb")
        except (PaymentReceipt.DoesNotExist, FileNotFoundError):
            return Response({"detail": "رسید پیدا نشد."}, status=status.HTTP_404_NOT_FOUND)
        # نوع از محتوای واقعی (نه پسوند/ادعای مرورگر)؛ inline تا پنل پیش‌نمایش کند.
        content_type = order_services.sniff_receipt_type(handle) or "application/octet-stream"
        response = FileResponse(
            handle,
            content_type=content_type,
            as_attachment=False,
            filename=f"receipt-{receipt.payment.order.order_number}-{receipt.pk}",
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response


class AdminPaymentReceiptReviewView(APIView):
    """`PATCH /admin/payments/receipts/:id` — بدنه‌ی discriminated union
    `{decision: "APPROVE"}` یا `{decision: "REJECT", rejectionReason}`
    (packages/contracts/src/admin/payment.ts's ReviewReceiptBodySchema)."""

    permission_classes = [require_section(PAYMENTS_SECTION, action="edit")]

    def patch(self, request, pk):
        try:
            receipt = PaymentReceipt.objects.select_related("payment__order").get(pk=pk)
        except PaymentReceipt.DoesNotExist:
            return Response({"detail": "رسید پیدا نشد."}, status=status.HTTP_404_NOT_FOUND)

        decision = request.data.get("decision")
        try:
            if decision == "APPROVE":
                order_services.approve_receipt(receipt=receipt, admin_user=request.user)
                log_admin_action(
                    user=request.user, action="approve_receipt", model_name="PaymentReceipt", object_id=receipt.pk
                )
            elif decision == "REJECT":
                reason = request.data.get("rejection_reason", "")
                order_services.reject_receipt(receipt=receipt, admin_user=request.user, reason=reason)
                log_admin_action(
                    user=request.user, action="reject_receipt", model_name="PaymentReceipt", object_id=receipt.pk
                )
            else:
                return Response(
                    {"detail": "decision باید APPROVE یا REJECT باشد."}, status=status.HTTP_400_BAD_REQUEST
                )
        except CheckoutError as exc:
            return Response({"detail": exc.message, "code": exc.code}, status=status.HTTP_400_BAD_REQUEST)

        receipt.refresh_from_db()
        return Response(AdminPaymentReceiptSerializer(receipt).data)
