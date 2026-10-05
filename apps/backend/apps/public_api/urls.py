from django.urls import path

from . import (
    account_views,
    auth_views,
    cart_views,
    checkout_views,
    content_views,
    order_views,
    payment_views,
    seo_views,
    views,
)

# Mounted at /api/v1/ (config/urls.py). Mirrors
# apps/api/src/modules/catalog/catalog.controller.ts +
# content.controller.ts + health.controller.ts route order — "categories/
# top-level" must be registered before "categories/<slug>" for the same
# reason as Nest's own comment there (otherwise "top-level" is read as a slug).
urlpatterns = [
    path("health", views.HealthView.as_view(), name="public-health"),
    path("content/about", content_views.AboutView.as_view(), name="public-content-about"),
    path("content/site-info", content_views.SiteInfoView.as_view(), name="public-content-site-info"),
    path("content/legal", content_views.LegalView.as_view(), name="public-content-legal"),
    path("blog", content_views.BlogListView.as_view(), name="public-blog-list"),
    path("blog/categories", content_views.BlogCategoriesView.as_view(), name="public-blog-categories"),
    path("blog/<slug:slug>", content_views.BlogDetailView.as_view(), name="public-blog-detail"),
    path("contact", content_views.ContactView.as_view(), name="public-contact"),
    path("catalog/products/<slug:slug>/reviews", content_views.ProductReviewsView.as_view(), name="public-product-reviews"),
    path("seo/redirects", seo_views.RedirectListView.as_view(), name="public-seo-redirects"),
    path("seo/redirects/<int:pk>/hit", seo_views.RedirectHitView.as_view(), name="public-seo-redirect-hit"),
    path("seo/sitemap", seo_views.SitemapDataView.as_view(), name="public-seo-sitemap"),
    path("analytics/pageview", seo_views.PageViewView.as_view(), name="public-analytics-pageview"),
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
    path("account/devices", account_views.DeviceListView.as_view(), name="public-account-devices"),

    # D-04 §۳ — cart (مهمان یا کاربر واردشده، هر دو)
    path("cart", cart_views.CartView.as_view(), name="public-cart"),
    path("cart/items", cart_views.CartItemsView.as_view(), name="public-cart-items"),
    path("cart/items/<int:pk>", cart_views.CartItemDetailView.as_view(), name="public-cart-item-detail"),
    # E-02 §۳ — کوپن/روش ارسال روی سبد
    path("cart/coupon", cart_views.CartCouponView.as_view(), name="public-cart-coupon"),
    path("cart/shipping-method", cart_views.CartShippingMethodView.as_view(), name="public-cart-shipping-method"),

    # E-02 §۳/۴ — گزینه‌های عمومی چک‌اوت
    path("shipping-methods", checkout_views.ShippingMethodListView.as_view(), name="public-shipping-methods"),
    path("payment-methods", checkout_views.PaymentMethodListView.as_view(), name="public-payment-methods"),
    path("payment-plans", checkout_views.PaymentPlanListView.as_view(), name="public-payment-plans"),
    path(
        "orders/<str:order_number>/payment/online",
        order_views.OrderOnlinePaymentStartView.as_view(),
        name="public-order-payment-online",
    ),
    path(
        "orders/<str:order_number>/payment/move-to-bank",
        order_views.OrderMoveToBankView.as_view(),
        name="public-order-payment-move-to-bank",
    ),

    # D-05 §۲/۵ — سفارش. track باید قبل از <str:order_number> ثبت شود.
    path("orders/track", order_views.OrderTrackView.as_view(), name="public-order-track"),
    path("orders", order_views.OrderListCreateView.as_view(), name="public-order-list-create"),
    path("orders/<str:order_number>", order_views.OrderDetailView.as_view(), name="public-order-detail"),
    path(
        "orders/<str:order_number>/receipt",
        order_views.OrderReceiptUploadView.as_view(),
        name="public-order-receipt-upload",
    ),
    path(
        "orders/<str:order_number>/invoice.pdf",
        order_views.OrderInvoicePdfView.as_view(),
        name="public-order-invoice-pdf",
    ),
    path(
        "orders/<str:order_number>/return",
        order_views.OrderReturnRequestView.as_view(),
        name="public-order-return",
    ),
    path(
        "orders/<str:order_number>/units/<str:certificate_id>/warranty.pdf",
        order_views.OrderWarrantyCardPdfView.as_view(),
        name="public-order-warranty-pdf",
    ),

    # D-05 §۳ — پرداخت درگاهی
    path(
        "orders/<str:order_number>/payment/initiate",
        payment_views.PaymentInitiateView.as_view(),
        name="public-payment-initiate",
    ),
    path("payments/callback/<str:provider>", payment_views.PaymentCallbackView.as_view(), name="public-payment-callback"),
    path("payments/return/<str:provider>", payment_views.PaymentReturnView.as_view(), name="public-payment-return"),
]
