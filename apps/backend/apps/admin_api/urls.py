from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import (
    account_admin,
    activity_log_views,
    auth,
    blog,
    categories,
    contact_messages,
    coupons,
    dashboard,
    homepage,
    inventory,
    orders,
    pricing,
    products,
    reports,
    returns,
    reviews,
    roles,
    search_console,
    settings_admin,
    specs,
    users,
)

urlpatterns = [
    # Auth
    path("admin/auth/login/", auth.AdminLoginView.as_view(), name="admin-login"),
    path("admin/auth/refresh/", TokenRefreshView.as_view(), name="admin-refresh"),
    path("admin/auth/change-password/", auth.AdminChangePasswordView.as_view(), name="admin-change-password"),
    path("admin/me/permissions/", roles.AdminMyPermissionsView.as_view(), name="admin-my-permissions"),
    # Roles & permissions (§7.5)
    path("admin/roles/", roles.AdminRoleListCreateView.as_view(), name="admin-role-list"),
    path("admin/roles/sections/", roles.AdminRoleSectionsView.as_view(), name="admin-role-sections"),
    path("admin/roles/<int:pk>/", roles.AdminRoleDetailView.as_view(), name="admin-role-detail"),
    # Dashboard
    path("admin/dashboard/", dashboard.AdminDashboardView.as_view(), name="admin-dashboard"),
    path("admin/dashboard/mark-seen/", dashboard.AdminDashboardMarkSeenView.as_view(), name="admin-dashboard-mark-seen"),
    # Homepage management
    path("admin/homepage/hero/", homepage.AdminHeroSectionView.as_view(), name="admin-homepage-hero"),
    path("admin/homepage/showcases/", homepage.AdminHomeShowcaseListCreateView.as_view(), name="admin-homepage-showcase-list"),
    path("admin/homepage/showcases/<int:pk>/", homepage.AdminHomeShowcaseDetailView.as_view(), name="admin-homepage-showcase-detail"),
    path("admin/homepage/community-tiles/", homepage.AdminCommunityTileListCreateView.as_view(), name="admin-homepage-tile-list"),
    path("admin/homepage/community-tiles/<int:pk>/", homepage.AdminCommunityTileDetailView.as_view(), name="admin-homepage-tile-detail"),
    # Products
    path("admin/products/", products.AdminProductListCreateView.as_view(), name="admin-product-list"),
    path("admin/products/price-list.pdf", products.AdminPriceListPdfView.as_view(), name="admin-product-price-list-pdf"),
    path("admin/products/<int:pk>/", products.AdminProductDetailView.as_view(), name="admin-product-detail"),
    path("admin/products/<int:product_id>/images/", products.AdminProductImageCreateView.as_view(), name="admin-product-image-create"),
    path("admin/products/<int:product_id>/images/<int:image_id>/", products.AdminProductImageDetailView.as_view(), name="admin-product-image-delete"),
    path("admin/products/<int:product_id>/colors/", products.AdminColorOptionListCreateView.as_view(), name="admin-product-color-list"),
    path("admin/products/<int:product_id>/colors/<int:color_id>/", products.AdminColorOptionDetailView.as_view(), name="admin-product-color-detail"),
    # Price bulk edit
    path("admin/products/prices/", pricing.AdminProductPriceListView.as_view(), name="admin-product-prices"),
    path("admin/products/prices/bulk/", pricing.AdminBulkPriceEditView.as_view(), name="admin-product-prices-bulk"),
    path("admin/products/<int:product_id>/price-history/", pricing.AdminPriceHistoryListView.as_view(), name="admin-price-history"),
    # Categories
    path("admin/categories/", categories.AdminCategoryListCreateView.as_view(), name="admin-category-list"),
    path("admin/categories/<int:pk>/", categories.AdminCategoryDetailView.as_view(), name="admin-category-detail"),
    # Specs / EAV
    path("admin/attributes/", specs.AdminAttributeListCreateView.as_view(), name="admin-attribute-list"),
    path("admin/attributes/<int:pk>/", specs.AdminAttributeDetailView.as_view(), name="admin-attribute-detail"),
    path("admin/attributes/<int:attribute_id>/values/", specs.AdminAttributeValueListCreateView.as_view(), name="admin-attribute-value-list"),
    path("admin/products/<int:product_id>/specs/", specs.AdminProductSpecsView.as_view(), name="admin-product-specs"),
    # Orders
    path("admin/orders/", orders.AdminOrderListView.as_view(), name="admin-order-list"),
    path("admin/orders/<int:pk>/", orders.AdminOrderDetailView.as_view(), name="admin-order-detail"),
    path("admin/orders/<int:pk>/mark-paid/", orders.AdminOrderMarkPaidView.as_view(), name="admin-order-mark-paid"),
    path("admin/orders/<int:pk>/start-processing/", orders.AdminOrderStartProcessingView.as_view(), name="admin-order-start-processing"),
    path("admin/orders/<int:pk>/mark-shipped/", orders.AdminOrderMarkShippedView.as_view(), name="admin-order-mark-shipped"),
    path("admin/orders/<int:pk>/mark-delivered/", orders.AdminOrderMarkDeliveredView.as_view(), name="admin-order-mark-delivered"),
    path("admin/orders/<int:pk>/cancel/", orders.AdminOrderCancelView.as_view(), name="admin-order-cancel"),
    path("admin/orders/<int:pk>/invoice.pdf", orders.AdminOrderInvoicePdfView.as_view(), name="admin-order-invoice-pdf"),
    path("admin/orders/<int:pk>/packing-slip.pdf", orders.AdminOrderPackingSlipPdfView.as_view(), name="admin-order-packing-slip-pdf"),
    path("admin/orders/daily-shipping-list.pdf", orders.AdminDailyShippingListPdfView.as_view(), name="admin-daily-shipping-list-pdf"),
    # Search Console
    path("admin/search-console/performance/", search_console.AdminSearchConsolePerformanceView.as_view(), name="admin-sc-performance"),
    path("admin/search-console/queries/", search_console.AdminSearchConsoleQueriesView.as_view(), name="admin-sc-queries"),
    path("admin/search-console/pages/", search_console.AdminSearchConsolePagesView.as_view(), name="admin-sc-pages"),
    path("admin/search-console/index-status/", search_console.AdminSearchConsoleIndexStatusView.as_view(), name="admin-sc-index-status"),
    path("admin/search-console/sitemap-status/", search_console.AdminSearchConsoleSitemapStatusView.as_view(), name="admin-sc-sitemap-status"),
    # Inventory
    path("admin/inventory/", inventory.AdminInventoryListView.as_view(), name="admin-inventory-list"),
    path("admin/inventory/summary/", inventory.AdminInventorySummaryView.as_view(), name="admin-inventory-summary"),
    path("admin/inventory/stocktake.pdf", inventory.AdminStocktakePdfView.as_view(), name="admin-inventory-stocktake-pdf"),
    path("admin/inventory/<int:product_id>/alert/", inventory.AdminInventoryAlertView.as_view(), name="admin-inventory-alert"),
    # Users
    path("admin/users/", users.AdminUserListCreateView.as_view(), name="admin-user-list"),
    path("admin/users/<int:pk>/", users.AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("admin/users/<int:user_id>/addresses/", users.AdminUserAddressListView.as_view(), name="admin-user-addresses"),
    path("admin/users/<int:user_id>/statement.pdf", users.AdminCustomerStatementPdfView.as_view(), name="admin-user-statement-pdf"),
    # Password management (§7.6) — all superuser-only
    path("admin/users/<int:user_id>/reset-password/", account_admin.AdminResetPasswordView.as_view(), name="admin-user-reset-password"),
    path("admin/users/<int:user_id>/impersonate/", account_admin.AdminImpersonateView.as_view(), name="admin-user-impersonate"),
    path("admin/users/<int:user_id>/force-logout/", account_admin.AdminForceLogoutView.as_view(), name="admin-user-force-logout"),
    # Messages
    path("admin/messages/", contact_messages.AdminMessageListView.as_view(), name="admin-message-list"),
    path("admin/messages/<int:pk>/", contact_messages.AdminMessageDetailView.as_view(), name="admin-message-detail"),
    # Sales reports
    path("admin/reports/sales/", reports.AdminSalesReportView.as_view(), name="admin-report-sales"),
    path("admin/reports/sales/export/", reports.AdminSalesReportExportView.as_view(), name="admin-report-sales-export"),
    path("admin/reports/sales/export.pdf", reports.AdminSalesReportPdfView.as_view(), name="admin-report-sales-pdf"),
    path("admin/reports/top-products/", reports.AdminTopProductsReportView.as_view(), name="admin-report-top-products"),
    path("admin/reports/by-category/", reports.AdminByCategoryReportView.as_view(), name="admin-report-by-category"),
    path("admin/reports/conversion/", reports.AdminConversionReportView.as_view(), name="admin-report-conversion"),
    path("admin/reports/abandoned-carts/", reports.AdminAbandonedCartsReportView.as_view(), name="admin-report-abandoned-carts"),
    path("admin/reports/customers/", reports.AdminCustomersReportView.as_view(), name="admin-report-customers"),
    path("admin/reports/by-gateway/", reports.AdminByGatewayReportView.as_view(), name="admin-report-by-gateway"),
    path("admin/reports/return-rate/", reports.AdminReturnRateReportView.as_view(), name="admin-report-return-rate"),
    path("admin/reports/gross-margin/", reports.AdminGrossMarginReportView.as_view(), name="admin-report-gross-margin"),
    # Settings
    path("admin/settings/site/", settings_admin.AdminSiteSettingsView.as_view(), name="admin-settings-site"),
    path("admin/settings/credentials/", settings_admin.AdminApiCredentialListCreateView.as_view(), name="admin-settings-credential-list"),
    path("admin/settings/credentials/<int:pk>/", settings_admin.AdminApiCredentialDetailView.as_view(), name="admin-settings-credential-detail"),
    path("admin/settings/shipping-methods/", settings_admin.AdminShippingMethodListCreateView.as_view(), name="admin-settings-shipping-list"),
    path("admin/settings/shipping-methods/<int:pk>/", settings_admin.AdminShippingMethodDetailView.as_view(), name="admin-settings-shipping-detail"),
    # Stock ledger
    path("admin/stock-movements/", inventory.AdminStockMovementListCreateView.as_view(), name="admin-stock-movement-list"),
    path("admin/stock-movements/export/", inventory.AdminStockMovementExportView.as_view(), name="admin-stock-movement-export"),
    path("admin/stock-movements/export.pdf", inventory.AdminStockLedgerPdfView.as_view(), name="admin-stock-ledger-pdf"),
    # Reviews
    path("admin/reviews/", reviews.AdminReviewListView.as_view(), name="admin-review-list"),
    path("admin/reviews/<int:pk>/", reviews.AdminReviewDetailView.as_view(), name="admin-review-detail"),
    # Blog
    path("admin/blog/", blog.AdminBlogPostListCreateView.as_view(), name="admin-blog-list"),
    path("admin/blog/<int:pk>/", blog.AdminBlogPostDetailView.as_view(), name="admin-blog-detail"),
    # Coupons
    path("admin/coupons/", coupons.AdminCouponListCreateView.as_view(), name="admin-coupon-list"),
    path("admin/coupons/<int:pk>/", coupons.AdminCouponDetailView.as_view(), name="admin-coupon-detail"),
    # Returns
    path("admin/returns/", returns.AdminReturnListView.as_view(), name="admin-return-list"),
    path("admin/returns/<int:pk>/", returns.AdminReturnDetailView.as_view(), name="admin-return-detail"),
    path("admin/returns/<int:pk>/approve/", returns.AdminReturnApproveView.as_view(), name="admin-return-approve"),
    path("admin/returns/<int:pk>/reject/", returns.AdminReturnRejectView.as_view(), name="admin-return-reject"),
    path("admin/returns/<int:pk>/mark-received/", returns.AdminReturnMarkReceivedView.as_view(), name="admin-return-mark-received"),
    path("admin/returns/<int:pk>/mark-refunded/", returns.AdminReturnMarkRefundedView.as_view(), name="admin-return-mark-refunded"),
    # Activity log
    path("admin/activity-log/", activity_log_views.AdminActivityLogListView.as_view(), name="admin-activity-log"),
]
