"""G-01 — ویرایش متن‌های «درباره ما» و اسناد «قوانین» از پنل (بخش تنظیمات).
متن پیش‌فرض نداریم: هر بخش/سند خالی در فروشگاه پنهان می‌شود."""

from django.db import transaction
from rest_framework import serializers
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.content.models import LEGAL_DOCUMENT_CHOICES, AboutPage, FaqItem, LegalDocument

from .activity import AdminActivityLogMixin, log_admin_action
from .permissions import require_section
from .revalidate import revalidate_storefront


def _clean_rows(value, keys: list[str], label: str) -> list[dict]:
    if not isinstance(value, list):
        raise serializers.ValidationError(f"{label} باید فهرست باشد.")
    rows = []
    for item in value:
        if not isinstance(item, dict):
            raise serializers.ValidationError(f"هر ردیف {label} باید شیء باشد.")
        row = {k: str(item.get(k) or "").strip() for k in keys}
        if any(row.values()):
            rows.append(row)
    return rows


class AboutPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AboutPage
        exclude = ["id"]
        read_only_fields = ["updated_at"]

    def validate_principles(self, value):
        return _clean_rows(value, ["title", "body"], "اصول")

    def validate_timeline(self, value):
        return _clean_rows(value, ["year", "note"], "خط زمانی")

    def validate_team(self, value):
        return _clean_rows(value, ["name", "role"], "تیم")


class AdminAboutPageView(AdminActivityLogMixin, RetrieveUpdateAPIView):
    permission_classes = [require_section("settings")]
    serializer_class = AboutPageSerializer

    def get_object(self):
        return AboutPage.load()

    def perform_update(self, serializer):
        super().perform_update(serializer)
        revalidate_storefront("/about")


class LegalDocumentSerializer(serializers.ModelSerializer):
    label = serializers.CharField(source="get_key_display", read_only=True)

    class Meta:
        model = LegalDocument
        fields = ["key", "label", "title", "body", "updated_at"]
        read_only_fields = ["key", "updated_at"]


def _ensure_documents():
    existing = set(LegalDocument.objects.values_list("key", flat=True))
    LegalDocument.objects.bulk_create([LegalDocument(key=k) for k, _ in LEGAL_DOCUMENT_CHOICES if k not in existing])


class AdminLegalDocumentListView(ListAPIView):
    permission_classes = [require_section("settings")]
    serializer_class = LegalDocumentSerializer
    pagination_class = None

    def get_queryset(self):
        _ensure_documents()
        return LegalDocument.objects.all()


class AdminLegalDocumentDetailView(AdminActivityLogMixin, RetrieveUpdateAPIView):
    permission_classes = [require_section("settings")]
    serializer_class = LegalDocumentSerializer
    lookup_field = "key"

    def get_queryset(self):
        _ensure_documents()
        return LegalDocument.objects.all()

    def perform_update(self, serializer):
        super().perform_update(serializer)
        revalidate_storefront("/legal")


class FaqItemSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=300, trim_whitespace=True)
    answer = serializers.CharField(max_length=4000, trim_whitespace=True)
    show_on_home = serializers.BooleanField(default=False)


class FaqListSerializer(serializers.Serializer):
    items = FaqItemSerializer(many=True)

    def validate_items(self, value):
        if len(value) > 60:
            raise serializers.ValidationError("حداکثر ۶۰ سوال.")
        return value


class AdminFaqView(APIView):
    """سوالات متداول: GET فهرست مرتب، PUT جایگزینی کل فهرست (ترتیب = ترتیب ارسال)."""

    def get_permissions(self):
        return [require_section("settings", action="view" if self.request.method == "GET" else "edit")()]

    def get(self, request):
        return Response({"items": [_faq_payload(f) for f in FaqItem.objects.all()]})

    @transaction.atomic
    def put(self, request):
        serializer = FaqListSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        FaqItem.objects.all().delete()
        FaqItem.objects.bulk_create(
            FaqItem(sort_order=i, **item) for i, item in enumerate(serializer.validated_data["items"])
        )
        log_admin_action(
            user=request.user, action="faq_update", model_name="FaqItem", object_id="all",
            changes={"count": len(serializer.validated_data["items"])},
        )
        revalidate_storefront("/", "/legal", "/support", "/search")
        return self.get(request)


def _faq_payload(item: FaqItem) -> dict:
    return {"id": str(item.pk), "question": item.question, "answer": item.answer, "show_on_home": item.show_on_home}
