import django_filters
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders import return_status
from apps.orders.models import Return
from apps.orders.order_status import InvalidOrderTransition

from .activity import log_admin_action
from .permissions import require_section


class AdminReturnItemSerializer(serializers.Serializer):
    order_item = serializers.IntegerField(source="order_item_id")
    quantity = serializers.IntegerField()


class AdminReturnSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    order = serializers.IntegerField(source="order_id")
    items = AdminReturnItemSerializer(many=True, read_only=True)

    class Meta:
        model = Return
        fields = ["id", "order", "items", "status", "reason", "description", "admin_note", "created_at", "updated_at"]

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
    queryset = Return.objects.select_related("order").prefetch_related("items").order_by("-created_at")


class AdminReturnDetailView(RetrieveAPIView):
    permission_classes = [require_section("returns")]
    serializer_class = AdminReturnSerializer
    queryset = Return.objects.select_related("order").prefetch_related("items")


def _return_transition(return_obj: Return, to_status: str, /, **kwargs) -> Response:
    try:
        return_status.transition_to(return_obj, to_status, **kwargs)
    except InvalidOrderTransition as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return_obj.refresh_from_db()
    return Response(AdminReturnSerializer(return_obj).data)


class AdminReturnApproveView(APIView):
    permission_classes = [require_section("returns", action="edit")]

    def post(self, request, pk):
        return_obj = Return.objects.get(pk=pk)
        response = _return_transition(return_obj, "APPROVED")
        if response.status_code == 200:
            log_admin_action(user=request.user, action="approve", model_name="Return", object_id=return_obj.pk)
        return response


class AdminReturnRejectView(APIView):
    permission_classes = [require_section("returns", action="edit")]

    def post(self, request, pk):
        return_obj = Return.objects.get(pk=pk)
        admin_note = request.data.get("admin_note", "")
        response = _return_transition(return_obj, "REJECTED", admin_note=admin_note)
        if response.status_code == 200:
            log_admin_action(user=request.user, action="reject", model_name="Return", object_id=return_obj.pk)
        return response


class AdminReturnMarkReceivedView(APIView):
    permission_classes = [require_section("returns", action="edit")]

    def post(self, request, pk):
        return_obj = Return.objects.get(pk=pk)
        response = _return_transition(return_obj, "RECEIVED")
        if response.status_code == 200:
            log_admin_action(user=request.user, action="mark_received", model_name="Return", object_id=return_obj.pk)
        return response


class AdminReturnMarkRefundedView(APIView):
    permission_classes = [require_section("returns", action="edit")]

    def post(self, request, pk):
        return_obj = Return.objects.get(pk=pk)
        response = _return_transition(return_obj, "REFUNDED")
        if response.status_code == 200:
            log_admin_action(user=request.user, action="mark_refunded", model_name="Return", object_id=return_obj.pk)
        return response
