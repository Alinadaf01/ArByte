from django.apps import apps as global_apps
from django.contrib.auth.management import create_permissions
from django.db import migrations

from apps.admin_api.sections import codename

# Both roles that should see the new section, per HOMEPAGE-ADMIN-TASK.md §3
# ("مجوز... به نقش «مدیر محصول» داده شود") and the same lesson learned in
# 0005: مدیر کل was granted "everything that existed" back when 0003 ran, so
# a section added later never retroactively reaches it either.
GRANTED_TO = ["مدیر کل", "مدیر محصول"]
ACTIONS = ["view", "create", "edit", "delete"]


def grant_homepage_perms(apps, schema_editor):
    create_permissions(global_apps.get_app_config("admin_api"), verbosity=0)

    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")

    codenames = [codename("homepage", action) for action in ACTIONS]
    perms = Permission.objects.filter(content_type__app_label="admin_api", codename__in=codenames)
    for group in Group.objects.filter(name__in=GRANTED_TO):
        group.permissions.add(*perms)


def revoke_homepage_perms(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")

    codenames = [codename("homepage", action) for action in ACTIONS]
    perms = Permission.objects.filter(content_type__app_label="admin_api", codename__in=codenames)
    for group in Group.objects.filter(name__in=GRANTED_TO):
        group.permissions.remove(*perms)


class Migration(migrations.Migration):

    dependencies = [
        ("admin_api", "0006_alter_adminrole_options"),
    ]

    operations = [
        migrations.RunPython(grant_homepage_perms, revoke_homepage_perms),
    ]
