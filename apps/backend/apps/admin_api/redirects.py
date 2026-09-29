"""G-02 — مدیریت ریدایرکت‌ها (بخش تنظیمات). ریدایرکت‌های خودکار (تغییر slug،
حذف محصول) هم این‌جا دیده و ویرایش می‌شوند."""

import django_filters
from django.db.models import Q
from rest_framework import serializers
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView

from apps.content.models import Redirect

from .activity import AdminActivityLogMixin
from .permissions import require_section


class AdminRedirectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Redirect
        fields = [
            "id",
            "from_path",
            "to_path",
            "status_code",
            "is_active",
            "is_auto",
            "hits",
            "last_hit_at",
            "created_at",
        ]
        read_only_fields = ["is_auto", "hits", "last_hit_at", "created_at"]

    def validate(self, attrs):
        from_path = Redirect.normalize(attrs.get("from_path", getattr(self.instance, "from_path", "")))
        to_path = Redirect.normalize(attrs.get("to_path", getattr(self.instance, "to_path", "")))
        if from_path.startswith("http"):
            raise serializers.ValidationError({"from_path": "مسیر مبدأ باید نسبی باشد (مثلاً /products/old)."})
        if from_path == to_path:
            raise serializers.ValidationError({"to_path": "مقصد نمی‌تواند با مبدأ یکی باشد."})
        loop = Redirect.objects.filter(from_path=to_path, to_path=from_path)
        if self.instance:
            loop = loop.exclude(pk=self.instance.pk)
        if loop.exists():
            raise serializers.ValidationError({"to_path": "این ریدایرکت یک حلقه می‌سازد."})
        clash = Redirect.objects.filter(from_path=from_path)
        if self.instance:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError({"from_path": "برای این مسیر قبلاً ریدایرکت تعریف شده است."})
        attrs["from_path"], attrs["to_path"] = from_path, to_path
        return attrs


class AdminRedirectFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    isAuto = django_filters.BooleanFilter(field_name="is_auto")

    class Meta:
        model = Redirect
        fields = []

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(from_path__icontains=value) | Q(to_path__icontains=value))


class AdminRedirectListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("settings")]
    serializer_class = AdminRedirectSerializer
    filterset_class = AdminRedirectFilter
    queryset = Redirect.objects.all()


class AdminRedirectDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("settings")]
    serializer_class = AdminRedirectSerializer
    queryset = Redirect.objects.all()
