from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.public_api.seo_views import torob_feed

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    # D-03 — public catalog/content/health endpoints against the ArByte
    # contract (packages/contracts). Auth/cart/orders are D-04/D-05.
    path("api/v1/", include("apps.public_api.urls")),
    # G-02 — فید ترب؛ فروشگاه `/feeds/*` را به این مسیر rewrite می‌کند.
    path("feeds/torob", torob_feed, name="feed-torob"),
    path("api/", include("apps.admin_api.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
