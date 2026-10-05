import django_filters
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders import return_status
from apps.orders.models import Return, ReturnItem
from apps.orders.order_status import InvalidOrderTransition

from .activity import log_admin_action
from .permissions import require_section


class AdminReturnItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    order_item = serializers.IntegerField(source="order_item_id")
    product_name = serializers.CharField(source="order_item.product_name_snapshot")
    variant_name = serializers.CharField(source="order_item.variant_name_snapshot", allow_null=True)
    sku = serializers.CharField(source="order_item.sku_snapshot")
    quantity = serializers.IntegerField()
    decision = serializers.CharField()


class AdminReturnSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    order = serializers.IntegerField(source="order_id")
    order_number = serializers.CharField(source="order.order_number")
    customer_name = serializers.CharField(source="order.shipping_recipient_name")
    customer_phone = serializers.CharField(source="order.shipping_mobile")
    items = AdminReturnItemSerializer(many=True, read_only=True)

    class Meta:
        model = Return
        fields = [
            "id", "order", "order_number", "customer_name", "customer_phone", "items", "status", "reason",
            "description", "admin_note", "created_at", "updated_at",
        ]

    def get_id(self, obj: Return) -> str:
        return str(obj.pk)


class AdminReturnFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status")

    class Meta:
        model = Return
        fields = []


class AdminReturnListView(ListAPIView):
    permission_classes = [require_section("returns")]
    serializer_class = AdminReturnSerializer
    filterset_class = AdminReturnFilter
    queryset = Return.objects.select_related("order").prefetch_related("items__order_item").order_by("-created_at")


class AdminReturnDetailView(RetrieveAPIView):
    permission_classes = [require_section("returns")]
    serializer_class = AdminReturnSerializer
    queryset = Return.objects.select_related("order").prefetch_related("items__order_item")


def _return_transition(return_obj: Return, to_status: str, /, **kwargs) -> Response:
    try:
        return_status.transition_to(return_obj, to_status, **kwargs)
    except InvalidOrderTransition as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return_obj.refresh_from_db()
    return Response(AdminReturnSerializer(return_obj).data)


class AdminReturnApproveView(APIView):
    """F-04 — تصمیم قلم‌به‌قلم: `{items: [{id, approved}], adminNote}`. قلمی که
    نیامده تأیید فرض می‌شود؛ اگر همه رد شوند، کل درخواست REJECTED می‌شود."""

    permission_classes = [require_section("returns", action="edit")]

    @transaction.atomic
    def post(self, request, pk):
        return_obj = get_object_or_404(Return.objects.prefetch_related("items"), pk=pk)
        if return_obj.status != "REQUESTED":
            return Response({"detail": "فقط درخواست ثبت‌شده قابل بررسی است."}, status=status.HTTP_400_BAD_REQUEST)
        decisions = {int(d["id"]): bool(d.get("approved")) for d in request.data.get("items", []) if d.get("id")}
        items = list(return_obj.items.all())
        for item in items:
            item.decision = "APPROVED" if decisions.get(item.pk, True) else "REJECTED"
        ReturnItem.objects.bulk_update(items, ["decision"])
        to_status = "APPROVED" if not items or any(i.decision == "APPROVED" for i in items) else "REJECTED"
        response = _return_transition(return_obj, to_status, admin_note=str(request.data.get("admin_note") or ""))
        if response.status_code == 200:
            log_admin_action(user=request.user, action=to_status.lower(), model_name="Return", object_id=return_obj.pk)
        return response


class AdminReturnRejectView(APIView):
    permission_classes = [require_section("returns", action="edit")]

    def post(self, request, pk):
        return_obj = get_object_or_404(Return, pk=pk)
        admin_note = request.data.get("admin_note", "")
        response = _return_transition(return_obj, "REJECTED", admin_note=admin_note)
        if response.status_code == 200:
            log_admin_action(user=request.user, action="reject", model_name="Return", object_id=return_obj.pk)
        return response


class AdminReturnMarkReceivedView(APIView):
    permission_classes = [require_section("returns", action="edit")]

    def post(self, request, pk):
        return_obj = get_object_or_404(Return, pk=pk)
        response = _return_transition(return_obj, "RECEIVED")
        if response.status_code == 200:
            log_admin_action(user=request.user, action="mark_received", model_name="Return", object_id=return_obj.pk)
        return response


class AdminReturnMarkRefundedView(APIView):
    permission_classes = [require_section("returns", action="edit")]

    def post(self, request, pk):
        return_obj = get_object_or_404(Return, pk=pk)
        response = _return_transition(return_obj, "REFUNDED")
        if response.status_code == 200:
            log_admin_action(user=request.user, action="mark_refunded", model_name="Return", object_id=return_obj.pk)
        return response
