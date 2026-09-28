from django.contrib import admin

from .models import (
    Cart,
    CartItem,
    CouponUsage,
    Order,
    OrderItem,
    OrderStatusHistory,
    Payment,
    PaymentReceipt,
    Return,
    ReturnItem,
    Shipment,
)


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
    readonly_fields = ["product_name_snapshot", "sku_snapshot", "unit_price", "quantity", "final_price"]


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ["from_status", "to_status", "note", "changed_by", "created_at"]
    can_delete = False


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = ["method", "provider", "gateway", "amount", "provider_ref", "status", "created_at"]


class ShipmentInline(admin.StackedInline):
    model = Shipment
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["order_number", "user", "status", "payment_status", "final_total", "created_at"]
    list_filter = ["status", "payment_status"]
    search_fields = ["order_number", "user__phone"]
    readonly_fields = ["order_number", "created_at", "updated_at"]
    inlines = [OrderItemInline, PaymentInline, ShipmentInline, OrderStatusHistoryInline]

    def has_delete_permission(self, request, obj=None):
        # Orders are never hard-deleted — use order_status.transition_to(..., "CANCELLED") instead.
        return False


class PaymentReceiptInline(admin.TabularInline):
    model = PaymentReceipt
    extra = 0
    readonly_fields = ["user", "file", "amount", "status", "uploaded_at"]


class ReturnItemInline(admin.TabularInline):
    model = ReturnItem
    extra = 0


@admin.register(Return)
class ReturnAdmin(admin.ModelAdmin):
    list_display = ["order", "status", "created_at"]
    list_filter = ["status"]
    inlines = [ReturnItemInline]


@admin.register(CouponUsage)
class CouponUsageAdmin(admin.ModelAdmin):
    list_display = ["coupon", "order", "user", "discount_amount", "created_at"]
    list_filter = ["coupon"]
