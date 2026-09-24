from django.contrib import admin

from .models import (
    Attribute,
    AttributeValue,
    Category,
    ColorOption,
    PriceHistory,
    Product,
    ProductAttribute,
    ProductImage,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "parent", "order", "is_active"]
    list_filter = ["is_active", "parent"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


class ColorOptionInline(admin.TabularInline):
    model = ColorOption
    extra = 1


class ProductAttributeInline(admin.TabularInline):
    model = ProductAttribute
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "sku", "category", "price", "stock_count", "is_active", "production_status"]
    list_filter = ["is_active", "production_status", "category"]
    search_fields = ["name", "sku", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["stock_count", "created_at", "updated_at"]
    inlines = [ProductImageInline, ColorOptionInline, ProductAttributeInline]


@admin.register(Attribute)
class AttributeAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "input_type", "unit", "is_required", "order"]
    filter_horizontal = ["categories"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(AttributeValue)
class AttributeValueAdmin(admin.ModelAdmin):
    list_display = ["attribute", "value", "order"]
    list_filter = ["attribute"]


@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = ["product", "old_price", "new_price", "changed_by", "created_at"]
    search_fields = ["product__name"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
