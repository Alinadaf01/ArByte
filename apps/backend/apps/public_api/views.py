"""D-03 §1 — public /api/v1/ views. Mirrors
apps/api/src/modules/catalog/catalog.controller.ts +
apps/api/src/modules/content/content.controller.ts +
apps/api/src/health/health.controller.ts route-for-route."""

from django.core.cache import cache
from django.db import connection
from rest_framework.response import Response

from . import services
from .envelope import PublicAPIView, paginated_response, success_response
from .errors import ApiError
from .validation import parse_filters_query, parse_product_list_query, parse_search_query


class CategoryTreeView(PublicAPIView):
    def get(self, request):
        data = services.get_category_tree()
        return Response(success_response(data, request.request_id))


class TopLevelCategoriesView(PublicAPIView):
    def get(self, request):
        data = services.get_top_level_category_cards()
        return Response(success_response(data, request.request_id))


class CategoryDetailView(PublicAPIView):
    def get(self, request, slug):
        data = services.get_category_by_slug(slug)
        return Response(success_response(data, request.request_id))


class ProductListView(PublicAPIView):
    def get(self, request):
        query = parse_product_list_query(request.query_params)
        items, total = services.list_products(query)
        return Response(
            paginated_response(items, request.request_id, page=query["page"], per_page=query["perPage"], total=total)
        )


class ProductDetailView(PublicAPIView):
    def get(self, request, slug):
        data = services.get_product_by_slug(slug)
        return Response(success_response(data, request.request_id))


class CatalogFiltersView(PublicAPIView):
    def get(self, request):
        query = parse_filters_query(request.query_params)
        data = services.get_filters(query["category"])
        return Response(success_response(data, request.request_id))


class ProductSearchView(PublicAPIView):
    def get(self, request):
        query = parse_search_query(request.query_params)
        items, total = services.search(query)
        return Response(
            paginated_response(items, request.request_id, page=query["page"], per_page=query["perPage"], total=total)
        )


class HomepageView(PublicAPIView):
    def get(self, request):
        data = services.get_homepage()
        return Response(success_response(data, request.request_id))


class HealthView(PublicAPIView):
    """§۱۱.۱۱۶ برند بوک — mirrors apps/api/src/health/health.controller.ts's
    shape ({status, services: {database, redis, storage}}), 503 if any is
    down. No admin_api equivalent existed before D-03."""

    def get(self, request):
        services_status = {
            "database": self._check_database(),
            "redis": self._check_cache(),
            "storage": {"status": "up"},
        }
        is_healthy = all(s["status"] == "up" for s in services_status.values())
        if not is_healthy:
            raise ApiError(
                "SERVICE_UNAVAILABLE",
                status=503,
                message="حداقل یکی از سرویس‌های زیرساختی در دسترس نیست.",
            )

        return Response({"status": "ok", "services": services_status})

    @staticmethod
    def _check_database() -> dict:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            return {"status": "up"}
        except Exception:  # noqa: BLE001 — health check must never propagate a raw 500
            return {"status": "down"}

    @staticmethod
    def _check_cache() -> dict:
        try:
            cache.set("public_api_health_check", "1", timeout=5)
            cache.get("public_api_health_check")
            return {"status": "up"}
        except Exception:  # noqa: BLE001
            return {"status": "down"}
