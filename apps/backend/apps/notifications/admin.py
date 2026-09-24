from django.contrib import admin

from .models import SmsLog, SmsTemplate


@admin.register(SmsTemplate)
class SmsTemplateAdmin(admin.ModelAdmin):
    list_display = ["key", "title", "is_active", "kavenegar_template_name"]
    list_filter = ["is_active"]
    search_fields = ["key", "title"]


@admin.register(SmsLog)
class SmsLogAdmin(admin.ModelAdmin):
    list_display = ["phone", "template", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["phone"]
    readonly_fields = [
        "phone",
        "template",
        "body",
        "kavenegar_template_name",
        "kavenegar_token",
        "status",
        "provider_message_id",
        "error",
        "created_at",
    ]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
