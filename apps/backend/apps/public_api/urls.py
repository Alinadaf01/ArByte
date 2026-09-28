from django.urls import path

from . import views

# Mounted at /api/v1/ (config/urls.py). Mirrors
# apps/api/src/modules/catalog/catalog.controller.ts +
# content.controller.ts + health.controller.ts route order — "categories/
# top-level" must be registered before "categories/<slug>" for the same
# reason as Nest's own comment there (otherwise "top-level" is read as a slug).
urlpatterns = [
    path("health", views.HealthView.as_view(), name="public-health"),
    path("content/homepage", views.HomepageView.as_view(), name="public-homepage"),
    path("catalog/categories", views.CategoryTreeView.as_view(), name="public-category-tree"),
    path("catalog/categories/top-level", views.TopLevelCategoriesView.as_view(), name="public-category-top-level"),
    path("catalog/categories/<slug:slug>", views.CategoryDetailView.as_view(), name="public-category-detail"),
    path("catalog/products", views.ProductListView.as_view(), name="public-product-list"),
    path("catalog/products/<slug:slug>", views.ProductDetailView.as_view(), name="public-product-detail"),
    path("catalog/filters", views.CatalogFiltersView.as_view(), name="public-catalog-filters"),
    path("catalog/search", views.ProductSearchView.as_view(), name="public-catalog-search"),
]
