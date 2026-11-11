from django.apps import apps as global_apps
from django.contrib.auth.management import create_permissions
from django.db import migrations

from apps.admin_api.sections import codename

# سه بخش تازه (لیبل دستگاه، بازاریابی پیامکی، باسلام) بعد از 0002 به SECTIONS
# اضافه شدند — همان الگوی مستندشده در 0002: یک پاس برای دادن دسترسی‌های
# تازه به نقش‌های پیش‌فرضِ از‌قبل‌ساخته‌شده (مدیر کل همه را می‌گیرد، مدیر
# سفارشات فقط لیبل دستگاه را، چون همان تیم بسته‌بندی/ارسال است).
_GRANTS = {
    "مدیر کل": ["device_labels.view", "device_labels.create", "device_labels.edit", "device_labels.delete",
                "marketing.view", "marketing.create", "basalam.view", "basalam.edit"],
    "مدیر سفارشات": ["device_labels.view", "device_labels.create", "device_labels.edit", "device_labels.delete"],
}


def grant_new_sections(apps, schema_editor):
    create_permissions(global_apps.get_app_config("admin_api"), verbosity=0)

    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")

    for group_name, entries in _GRANTS.items():
        group = Group.objects.filter(name=group_name).first()
        if not group:
            continue
        codenames = [codename(*entry.split(".")) for entry in entries]
        perms = Permission.objects.filter(content_type__app_label="admin_api", codename__in=codenames)
        group.permissions.add(*perms)


def revoke_new_sections(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    codenames = [
        codename(*entry.split(".")) for entries in _GRANTS.values() for entry in entries
    ]
    perms = Permission.objects.filter(content_type__app_label="admin_api", codename__in=codenames)
    for group_name in _GRANTS:
        group = Group.objects.filter(name=group_name).first()
        if group:
            group.permissions.remove(*perms)


class Migration(migrations.Migration):
    dependencies = [
        ("admin_api", "0002_default_roles"),
    ]

    operations = [
        migrations.RunPython(grant_new_sections, revoke_new_sections),
    ]
