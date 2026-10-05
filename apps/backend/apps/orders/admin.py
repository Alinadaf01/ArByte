from django.contrib import admin
from django.db import transaction

from .fulfilment import ensure_units
from .models import (
    Cart,
    CartItem,
    CouponUsage,
    Order,
    OrderItem,
    OrderItemUnit,
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
    show_change_link = True  # E-03 §۳ — سریال از صفحه‌ی جدای OrderItem وارد می‌شود، پایین.


class OrderItemUnitInline(admin.TabularInline):
    """E-03 §۳ — ورود سریال. `quantity` قلم چند ردیف دارد (auto-create
    پایین‌تر، هنگام باز شدن صفحه‌ی OrderItem)."""

    model = OrderItemUnit
    extra = 0
    readonly_fields = ["certificate_id", "created_at"]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ["product_name_snapshot", "order", "quantity", "final_price"]
    search_fields = ["order__order_number", "product_name_snapshot", "sku_snapshot"]
    readonly_fields = ["order", "variant", "product_name_snapshot", "sku_snapshot", "unit_price", "quantity", "final_price"]
    inlines = [OrderItemUnitInline]

    def get_form(self, request, obj=None, **kwargs):
        # هر بار صفحه باز می‌شود، تعداد ردیف OrderItemUnit را با quantity
        # قلم برابر می‌کند (کم بود می‌سازد) — ادمین فقط serial_number را پر
        # می‌کند، نه خودش ردیف اضافه کند.
        if obj:
            with transaction.atomic():
                order = Order.objects.select_for_update().get(pk=obj.order_id)
                ensure_units(order)
        return super().get_form(request, obj, **kwargs)


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
