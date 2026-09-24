from django.apps import apps as global_apps
from django.contrib.auth.management import create_permissions
from django.db import migrations

from apps.admin_api.sections import DEFAULT_ROLES, codename


def create_default_roles(apps, schema_editor):
    # Permission rows for AdminRole's Meta.permissions are normally created
    # by the create_permissions post_migrate signal, which only fires after
    # every migration in this run has already applied — including this one.
    # Calling it explicitly here (with the *real* app config, not the
    # historical one) makes them queryable immediately. Standard Django
    # workaround for "need a just-declared permission inside a migration".
    create_permissions(global_apps.get_app_config("admin_api"), verbosity=0)

    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    AdminRole = apps.get_model("admin_api", "AdminRole")

    for name, spec in DEFAULT_ROLES.items():
        group = Group.objects.create(name=name)
        AdminRole.objects.create(group=group, description=spec["description"], is_system=True)
        codenames = [codename(section, action) for section, actions in spec["grants"].items() for action in actions]
        perms = Permission.objects.filter(content_type__app_label="admin_api", codename__in=codenames)
        group.permissions.set(perms)


def remove_default_roles(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    # Deleting the Group cascades to its AdminRole (OneToOneField on the
    # AdminRole side), so this alone is enough to fully undo create_default_roles.
    Group.objects.filter(name__in=list(DEFAULT_ROLES), admin_role__is_system=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("admin_api", "0002_adminrole"),
    ]

    operations = [
        migrations.RunPython(create_default_roles, remove_default_roles),
    ]
