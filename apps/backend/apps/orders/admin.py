from django.contrib import admin

from .models import Cart, CartItem, Order, OrderItem, OrderStatusLog, Payment, Return


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "session_key", "updated_at"]
    inlines = [CartItemInline]


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product_name", "sku", "price", "color_name", "quantity"]


class OrderStatusLogInline(admin.TabularInline):
    model = OrderStatusLog
    extra = 0
    readonly_fields = ["from_status", "to_status", "note", "user", "created_at"]
    can_delete = False


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = ["gateway", "amount", "authority", "ref_id", "status", "created_at"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["number", "user", "status", "total", "created_at"]
    list_filter = ["status"]
    search_fields = ["number", "user__phone"]
    readonly_fields = ["number", "created_at", "updated_at"]
    inlines = [OrderItemInline, PaymentInline, OrderStatusLogInline]

    def has_delete_permission(self, request, obj=None):
        # Orders are never hard-deleted — use cancel()/mark_returned() instead.
        return False


@admin.register(Return)
class ReturnAdmin(admin.ModelAdmin):
    list_display = ["order", "status", "created_at"]
    list_filter = ["status"]
