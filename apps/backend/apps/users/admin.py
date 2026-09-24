from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Address, OTPCode, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    ordering = ["-created_at"]
    list_display = ["phone", "first_name", "last_name", "is_verified", "is_staff", "is_active", "created_at"]
    list_filter = ["is_verified", "is_staff", "is_active"]
    search_fields = ["phone", "first_name", "last_name", "email"]
    readonly_fields = ["created_at", "last_login"]
    fieldsets = [
        (None, {"fields": ["phone", "password"]}),
        ("اطلاعات شخصی", {"fields": ["first_name", "last_name", "email"]}),
        ("وضعیت", {"fields": ["is_verified", "is_active", "is_staff", "is_superuser", "groups", "user_permissions"]}),
        ("تاریخ‌ها", {"fields": ["created_at", "last_login"]}),
    ]
    add_fieldsets = [
        (None, {
            "classes": ["wide"],
            "fields": ["phone", "password1", "password2", "is_verified", "is_staff", "is_active"],
        }),
    ]


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ["user", "title", "city", "receiver_name", "is_default"]
    search_fields = ["user__phone", "receiver_name", "city"]
    list_filter = ["is_default", "province"]


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display = ["phone", "attempts", "used_at", "created_at", "expires_at"]
    readonly_fields = ["code_hash", "created_at"]
    search_fields = ["phone"]
