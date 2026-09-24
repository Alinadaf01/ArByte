from django.contrib import admin

from .models import AdminActivityLog, DailyStat, PageView


@admin.register(AdminActivityLog)
class AdminActivityLogAdmin(admin.ModelAdmin):
    list_display = ["user", "action", "model_name", "object_id", "created_at"]
    list_filter = ["action", "model_name"]
    search_fields = ["user__phone", "model_name", "object_id"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(PageView)
class PageViewAdmin(admin.ModelAdmin):
    list_display = ["path", "product_slug", "is_bot", "created_at"]
    list_filter = ["is_bot"]
    search_fields = ["path", "product_slug"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(DailyStat)
class DailyStatAdmin(admin.ModelAdmin):
    list_display = ["date", "page_views", "unique_visitors", "orders", "revenue"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
