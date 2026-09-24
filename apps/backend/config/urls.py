from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    # Public (non-admin) catalog/content/settings/users/orders/analytics
    # endpoints were removed in D-01 (import-and-clean) — rebuilt from
    # scratch against the ArByte contract under /api/v1/ in D-03/D-04/D-05.
    path("api/", include("apps.admin_api.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
