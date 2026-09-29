import django_filters
from rest_framework import serializers
from rest_framework.generics import ListAPIView

from apps.analytics.models import AdminActivityLog, AdminLoginAttempt

from .permissions import require_section


class AdminActivityLogSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()

    class Meta:
        model = AdminActivityLog
        fields = ["id", "user", "action", "model_name", "object_id", "changes", "created_at"]

    def get_id(self, obj: AdminActivityLog) -> str:
        return str(obj.pk)

    def get_user(self, obj: AdminActivityLog) -> str | None:
        return obj.user.get_full_name() if obj.user else None


class AdminActivityLogFilter(django_filters.FilterSet):
    user = django_filters.NumberFilter(field_name="user_id")
    model = django_filters.CharFilter(field_name="model_name")
    dateFrom = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    dateTo = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = AdminActivityLog
        fields = []


class AdminActivityLogListView(ListAPIView):
    permission_classes = [require_section("activity_log")]
    serializer_class = AdminActivityLogSerializer
    filterset_class = AdminActivityLogFilter
    queryset = AdminActivityLog.objects.select_related("user")


class AdminLoginAttemptSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AdminLoginAttempt
        fields = ["id", "phone", "ip_address", "user_agent", "success", "reason", "user_name", "created_at"]

    def get_user_name(self, obj) -> str | None:
        return obj.user.get_full_name() or obj.user.phone if obj.user else None


class AdminLoginAttemptFilter(django_filters.FilterSet):
    success = django_filters.BooleanFilter(field_name="success")
    phone = django_filters.CharFilter(field_name="phone", lookup_expr="icontains")

    class Meta:
        model = AdminLoginAttempt
        fields = []


class AdminLoginAttemptListView(ListAPIView):
    """G-03 — لاگ ورود پنل (موفق، ناموفق، قفل)."""

    permission_classes = [require_section("activity_log")]
    serializer_class = AdminLoginAttemptSerializer
    filterset_class = AdminLoginAttemptFilter
    queryset = AdminLoginAttempt.objects.select_related("user")
