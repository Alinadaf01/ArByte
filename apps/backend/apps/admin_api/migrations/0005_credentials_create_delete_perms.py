from django.apps import apps as global_apps
from django.contrib.auth.management import create_permissions
from django.db import migrations

from apps.admin_api.sections import codename


def grant_credentials_create_delete(apps, schema_editor):
    # credentials gained create/delete (§7.5 needs them to actually add/remove
    # a gateway credential, not just view/edit) after 0003 already ran, so
    # مدیر کل (granted "everything" at that point) never got the two new
    # permission rows. Same create_permissions-before-query workaround as 0003.
    create_permissions(global_apps.get_app_config("admin_api"), verbosity=0)

    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")

    new_codenames = [codename("credentials", "create"), codename("credentials", "delete")]
    perms = Permission.objects.filter(content_type__app_label="admin_api", codename__in=new_codenames)
    group = Group.objects.filter(name="مدیر کل").first()
    if group:
        group.permissions.add(*perms)


def revoke_credentials_create_delete(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    new_codenames = [codename("credentials", "create"), codename("credentials", "delete")]
    perms = Permission.objects.filter(content_type__app_label="admin_api", codename__in=new_codenames)
    group = Group.objects.filter(name="مدیر کل").first()
    if group:
        group.permissions.remove(*perms)


class Migration(migrations.Migration):

    dependencies = [
        ("admin_api", "0004_alter_adminrole_options"),
    ]

    operations = [
        migrations.RunPython(grant_credentials_create_delete, revoke_credentials_create_delete),
    ]
