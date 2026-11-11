import django_filters
from rest_framework import serializers
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.views import APIView

from apps.catalog.models import PRODUCT_GRADE_CHOICES
from apps.devicelabels.models import DeviceLabel

from .activity import AdminActivityLogMixin
from .permissions import require_section


class AdminDeviceLabelSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    grade_display = serializers.CharField(source="get_grade_display", read_only=True)

    class Meta:
        model = DeviceLabel
        fields = [
            "id", "code", "device_name", "model_number", "cpu", "ram", "storage", "display",
            "battery_health_percent", "battery_cycle_count", "storage_health_percent", "grade",
            "grade_display", "defect_notes", "created_at", "updated_at",
        ]

    def get_id(self, obj: DeviceLabel) -> str:
        return str(obj.pk)

    def validate_grade(self, value):
        if value and value not in dict(PRODUCT_GRADE_CHOICES):
            raise serializers.ValidationError("گرید نامعتبر است.")
        return value


class AdminDeviceLabelFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = DeviceLabel
        fields = []

    def filter_search(self, queryset, name, value):
        from django.db.models import Q

        value = value.strip()
        if not value:
            return queryset
        return queryset.filter(Q(code__icontains=value) | Q(device_name__icontains=value))


class AdminDeviceLabelListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("device_labels")]
    serializer_class = AdminDeviceLabelSerializer
    filterset_class = AdminDeviceLabelFilter
    queryset = DeviceLabel.objects.all()

    def perform_create(self, serializer):
        serializer.validated_data["created_by"] = self.request.user
        super().perform_create(serializer)


class AdminDeviceLabelDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("device_labels")]
    serializer_class = AdminDeviceLabelSerializer
    queryset = DeviceLabel.objects.all()


class AdminDeviceLabelPdfView(APIView):
    permission_classes = [require_section("device_labels")]

    def get(self, request, pk):
        from django.shortcuts import get_object_or_404

        from apps.documents.device_label import render_device_label_pdf
        from apps.documents.responses import pdf_filename, pdf_response

        label = get_object_or_404(DeviceLabel, pk=pk)
        pdf_bytes = render_device_label_pdf(label)
        return pdf_response(pdf_bytes, pdf_filename(f"label-{label.code}"))
