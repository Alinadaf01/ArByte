from django.urls import path

from . import account_views, auth_views, cart_views, views

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

    # D-04 §۱ — auth
    path("auth/otp/request", auth_views.OtpRequestView.as_view(), name="public-otp-request"),
    path("auth/otp/verify", auth_views.OtpVerifyView.as_view(), name="public-otp-verify"),
    path("auth/refresh", auth_views.RefreshView.as_view(), name="public-auth-refresh"),
    path("auth/logout", auth_views.LogoutView.as_view(), name="public-auth-logout"),
    path("auth/me", auth_views.MeView.as_view(), name="public-auth-me"),
    path(
        "auth/impersonate/exchange",
        auth_views.ImpersonateExchangeView.as_view(),
        name="public-impersonate-exchange",
    ),

    # D-04 §۲ — account
    path("account/profile", account_views.ProfileView.as_view(), name="public-account-profile"),
    path("account/addresses", account_views.AddressListCreateView.as_view(), name="public-account-address-list"),
    path(
        "account/addresses/<int:pk>",
        account_views.AddressDetailView.as_view(),
        name="public-account-address-detail",
    ),
    # wishlist/merge باید قبل از wishlist/<int:pk> ثبت شود، وگرنه "merge" را
    # به‌عنوان pk می‌خواند.
    path("account/wishlist/merge", account_views.WishlistMergeView.as_view(), name="public-account-wishlist-merge"),
    path("account/wishlist", account_views.WishlistListCreateView.as_view(), name="public-account-wishlist-list"),
    path(
        "account/wishlist/<int:pk>",
        account_views.WishlistDetailView.as_view(),
        name="public-account-wishlist-detail",
    ),

    # D-04 §۳ — cart (مهمان یا کاربر واردشده، هر دو)
    path("cart", cart_views.CartView.as_view(), name="public-cart"),
    path("cart/items", cart_views.CartItemsView.as_view(), name="public-cart-items"),
    path("cart/items/<int:pk>", cart_views.CartItemDetailView.as_view(), name="public-cart-item-detail"),
]
