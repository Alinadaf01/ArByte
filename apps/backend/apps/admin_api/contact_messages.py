import django_filters
from rest_framework import serializers
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView

from apps.content.models import ContactMessage

from .activity import AdminActivityLogMixin
from .permissions import require_section


class AdminContactMessageSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = ContactMessage
        fields = [
            "id", "name", "email", "phone", "subject", "message",
            "newsletter", "is_read", "admin_note", "ip_address", "submitted_at",
        ]
        read_only_fields = ["name", "email", "phone", "subject", "message", "newsletter", "ip_address", "submitted_at"]

    def get_id(self, obj: ContactMessage) -> str:
        return str(obj.pk)


class AdminMessageFilter(django_filters.FilterSet):
    isRead = django_filters.BooleanFilter(field_name="is_read")
    subject = django_filters.CharFilter(field_name="subject")

    class Meta:
        model = ContactMessage
        fields = []


class AdminMessageListView(ListAPIView):
    permission_classes = [require_section("messages")]
    serializer_class = AdminContactMessageSerializer
    filterset_class = AdminMessageFilter
    queryset = ContactMessage.objects.all()


class AdminMessageDetailView(AdminActivityLogMixin, RetrieveUpdateAPIView):
    permission_classes = [require_section("messages")]
    serializer_class = AdminContactMessageSerializer
    queryset = ContactMessage.objects.all()
