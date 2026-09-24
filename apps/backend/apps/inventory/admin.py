from django.contrib import admin

from .models import StockAlert, StockMovement


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ["product", "type", "quantity", "balance_after", "reference", "user", "created_at"]
    list_filter = ["type"]
    search_fields = ["product__name", "reference"]
    readonly_fields = ["balance_after", "created_at"]

    def has_change_permission(self, request, obj=None):
        # Ledger entries are append-only — use Product actions / record() to add new ones.
        return False


@admin.register(StockAlert)
class StockAlertAdmin(admin.ModelAdmin):
    list_display = ["product", "reorder_point", "is_active", "is_triggered"]
    list_filter = ["is_active"]
