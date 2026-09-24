import django_filters
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import InvalidOrderTransition, Return

from .activity import log_admin_action
from .permissions import require_section


class AdminReturnSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    order = serializers.IntegerField(source="order_id")
    items = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Return
        fields = ["id", "order", "items", "status", "reason", "admin_note", "created_at", "updated_at"]

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
    queryset = Return.objects.select_related("order").order_by("-created_at")


class AdminReturnDetailView(RetrieveAPIView):
    permission_classes = [require_section("returns")]
    serializer_class = AdminReturnSerializer
    queryset = Return.objects.select_related("order")


def _return_transition(return_obj: Return, method_name: str) -> Response:
    try:
        getattr(return_obj, method_name)()
    except InvalidOrderTransition as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return_obj.refresh_from_db()
    return Response(AdminReturnSerializer(return_obj).data)


class AdminReturnApproveView(APIView):
    permission_classes = [require_section("returns", action="edit")]

    def post(self, request, pk):
        return_obj = Return.objects.get(pk=pk)
        response = _return_transition(return_obj, "approve")
        if response.status_code == 200:
            log_admin_action(user=request.user, action="approve", model_name="Return", object_id=return_obj.pk)
        return response


class AdminReturnRejectView(APIView):
    permission_classes = [require_section("returns", action="edit")]

    def post(self, request, pk):
        return_obj = Return.objects.get(pk=pk)
        response = _return_transition(return_obj, "reject")
        if response.status_code == 200:
            log_admin_action(user=request.user, action="reject", model_name="Return", object_id=return_obj.pk)
        return response


class AdminReturnMarkReceivedView(APIView):
    permission_classes = [require_section("returns", action="edit")]

    def post(self, request, pk):
        return_obj = Return.objects.get(pk=pk)
        response = _return_transition(return_obj, "mark_received")
        if response.status_code == 200:
            log_admin_action(user=request.user, action="mark_received", model_name="Return", object_id=return_obj.pk)
        return response


class AdminReturnMarkRefundedView(APIView):
    permission_classes = [require_section("returns", action="edit")]

    def post(self, request, pk):
        return_obj = Return.objects.get(pk=pk)
        response = _return_transition(return_obj, "mark_refunded")
        if response.status_code == 200:
            log_admin_action(user=request.user, action="mark_refunded", model_name="Return", object_id=return_obj.pk)
        return response
