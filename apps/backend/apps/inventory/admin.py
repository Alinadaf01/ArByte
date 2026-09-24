from django.contrib import admin

from .models import Inventory, InventoryTransaction


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ["variant", "quantity", "reserved_quantity", "available_quantity", "low_stock_threshold"]
    search_fields = ["variant__sku", "variant__product__name"]
    readonly_fields = ["available_quantity", "version", "created_at", "updated_at"]


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    list_display = ["variant", "type", "quantity_change", "quantity_after", "reference", "user", "created_at"]
    list_filter = ["type"]
    search_fields = ["variant__sku", "variant__product__name", "reference"]
    readonly_fields = ["quantity_before", "quantity_after", "created_at"]

    def has_change_permission(self, request, obj=None):
        # Ledger entries are append-only — use the InventoryManager methods
        # (stock_in/stock_out/adjust/reserve/release) to add new ones.
        return False
