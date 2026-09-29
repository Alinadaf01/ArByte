from django.utils import timezone
from djangorestframework_camel_case.parser import CamelCaseFormParser, CamelCaseJSONParser, CamelCaseMultiPartParser
from rest_framework import serializers
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView

from apps.content.models import BlogPost

from .activity import AdminActivityLogMixin
from .permissions import require_section
from .revalidate import revalidate_storefront


class AdminBlogPostSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    # `cover_image` (the real ImageField) is writable so the admin panel can
    # upload a file; `resolved_cover_url` is read-only and falls back to
    # `external_cover_url` for older/seeded posts that only have that set —
    # the panel uses it to preview an image even before one is uploaded.
    resolved_cover_url = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            "id", "slug", "title", "excerpt", "category", "sections", "cover_image", "cover_alt", "resolved_cover_url",
            "author", "author_role", "tags", "reading_time", "is_published",
            "meta_title", "meta_description", "published_at",
        ]

    def get_id(self, obj: BlogPost) -> str:
        return str(obj.pk)

    def get_resolved_cover_url(self, obj: BlogPost) -> str:
        return obj.resolved_cover_url

    def _apply_publish_default(self, validated_data: dict, existing: BlogPost | None) -> None:
        # The admin panel only exposes an is_published switch, no date picker
        # for published_at — without this, flipping the switch on leaves
        # published_at null, which crashes the storefront's blog post page
        # (Jalali date conversion throws on a null date) as soon as anyone
        # visits it (BLOG-SEED-TASK.md §5 verification).
        will_be_published = validated_data.get("is_published", existing.is_published if existing else False)
        has_date = validated_data.get("published_at") or (existing and existing.published_at)
        if will_be_published and not has_date:
            validated_data["published_at"] = timezone.now()

    def validate(self, attrs):
        """F-04 — زمان مطالعه خودکار از متن بخش‌ها (~۲۰۰ کلمه در دقیقه)؛ کاور بدون alt پذیرفته نمی‌شود."""
        sections = attrs.get("sections", getattr(self.instance, "sections", None)) or []
        words = sum(len(str(s.get("heading", "")).split()) + len(str(s.get("body", "")).split()) for s in sections if isinstance(s, dict))
        attrs["reading_time"] = max(1, round(words / 200))
        has_cover = attrs.get("cover_image") or getattr(self.instance, "cover_image", None) or getattr(self.instance, "external_cover_url", "")
        if has_cover and not (attrs.get("cover_alt", getattr(self.instance, "cover_alt", "")) or "").strip():
            raise serializers.ValidationError({"cover_alt": "برای تصویر کاور متن جایگزین (alt) لازم است."})
        return attrs

    def create(self, validated_data):
        self._apply_publish_default(validated_data, existing=None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._apply_publish_default(validated_data, existing=instance)
        return super().update(instance, validated_data)


class _BlogRevalidateMixin:
    """G-01 — بعد از ذخیره/حذف، فهرست وبلاگ، خود نوشته و مجله‌ی صفحه اصلی تازه شوند."""

    def _revalidate(self, post):
        revalidate_storefront("/", "/blog", f"/blog/{post.slug}")

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self._revalidate(serializer.instance)

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self._revalidate(serializer.instance)

    def perform_destroy(self, instance):
        self._revalidate(instance)
        super().perform_destroy(instance)


class AdminBlogPostListCreateView(_BlogRevalidateMixin, AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("blog")]
    serializer_class = AdminBlogPostSerializer
    parser_classes = [CamelCaseMultiPartParser, CamelCaseFormParser, CamelCaseJSONParser]
    queryset = BlogPost.objects.all()


class AdminBlogPostDetailView(_BlogRevalidateMixin, AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("blog")]
    serializer_class = AdminBlogPostSerializer
    parser_classes = [CamelCaseMultiPartParser, CamelCaseFormParser, CamelCaseJSONParser]
    queryset = BlogPost.objects.all()
