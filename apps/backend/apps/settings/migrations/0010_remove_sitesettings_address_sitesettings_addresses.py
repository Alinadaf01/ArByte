# دستی: ترتیب AddField → RunPython (کپی‌کردن address قدیمی به addresses تازه) →
# RemoveField، نه ترتیب خودکار Django (Remove سپس Add) که داده‌ی قدیمی را از
# دست می‌داد. همین‌جا آدرس انبار قم هم طبق درخواست مدیر اضافه می‌شود.

from django.db import migrations, models


def seed_addresses(apps, schema_editor):
    SiteSettings = apps.get_model("settings", "SiteSettings")
    for s in SiteSettings.objects.all():
        addresses = []
        if s.address:
            addresses.append({"label": "دفتر مرکزی", "address": s.address})
        addresses.append({"label": "انبار قم", "address": "قم - بلوار فردوسی - کوچه حسن پور"})
        s.addresses = addresses
        s.save(update_fields=["addresses"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0009_alter_apicredential_service'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='addresses',
            field=models.JSONField(default=list, help_text='[{label, address}, ...] — مثلاً دفتر مرکزی، انبار قم'),
        ),
        migrations.RunPython(seed_addresses, noop_reverse),
        migrations.RemoveField(
            model_name='sitesettings',
            name='address',
        ),
    ]
