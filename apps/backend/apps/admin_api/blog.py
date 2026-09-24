from django.utils import timezone
from djangorestframework_camel_case.parser import CamelCaseFormParser, CamelCaseJSONParser, CamelCaseMultiPartParser
from rest_framework import serializers
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView

from apps.content.models import BlogPost

from .activity import AdminActivityLogMixin
from .permissions import require_section


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
            "id", "slug", "title", "excerpt", "category", "sections", "cover_image", "resolved_cover_url",
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

    def create(self, validated_data):
        self._apply_publish_default(validated_data, existing=None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._apply_publish_default(validated_data, existing=instance)
        return super().update(instance, validated_data)


class AdminBlogPostListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("blog")]
    serializer_class = AdminBlogPostSerializer
    parser_classes = [CamelCaseMultiPartParser, CamelCaseFormParser, CamelCaseJSONParser]
    queryset = BlogPost.objects.all()


class AdminBlogPostDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("blog")]
    serializer_class = AdminBlogPostSerializer
    parser_classes = [CamelCaseMultiPartParser, CamelCaseFormParser, CamelCaseJSONParser]
    queryset = BlogPost.objects.all()
