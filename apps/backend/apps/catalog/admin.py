from django.contrib import admin

from .models import (
    Brand,
    Category,
    PriceHistory,
    Product,
    ProductImage,
    ProductSpecification,
    ProductVariant,
    SpecificationDefinition,
    SpecificationValue,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "parent", "sort_order", "is_active"]
    list_filter = ["is_active", "parent"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    fields = ["sku", "name", "is_default", "final_price", "compare_at_price", "is_preorder"]


class ProductSpecificationInline(admin.TabularInline):
    model = ProductSpecification
    fk_name = "product"
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "brand", "category", "condition", "status", "priority"]
    list_filter = ["status", "condition", "category", "brand"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["created_at", "updated_at"]
    inlines = [ProductImageInline, ProductVariantInline, ProductSpecificationInline]


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ["product", "sku", "name", "is_default", "final_price", "is_preorder"]
    list_filter = ["is_default", "is_preorder", "price_model"]
    search_fields = ["sku", "product__name"]


@admin.register(SpecificationDefinition)
class SpecificationDefinitionAdmin(admin.ModelAdmin):
    list_display = ["name_fa", "key", "type", "category", "is_variant_axis", "sort_order"]
    list_filter = ["type", "is_filterable", "is_searchable", "is_variant_axis"]
    prepopulated_fields = {"key": ("name_fa",)}


@admin.register(SpecificationValue)
class SpecificationValueAdmin(admin.ModelAdmin):
    list_display = ["definition", "value", "swatch_hex", "sort_order"]
    list_filter = ["definition"]


@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = ["variant", "previous_price", "new_price", "changed_by", "created_at"]
    search_fields = ["variant__sku", "variant__product__name"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
