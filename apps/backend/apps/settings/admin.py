from django.contrib import admin

from .models import ApiCredential, ShippingMethod, SiteSettings


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ApiCredential)
class ApiCredentialAdmin(admin.ModelAdmin):
    list_display = ["service", "label", "description", "is_active", "is_sandbox", "order"]
    list_filter = ["service", "is_active", "is_sandbox"]


@admin.register(ShippingMethod)
class ShippingMethodAdmin(admin.ModelAdmin):
    list_display = ["name", "cost", "free_above", "estimated_days", "is_active", "order"]
    list_filter = ["is_active"]
