from django.db import migrations

# D-05 §۴ — «seed dev: سه روشِ Cart.dc.html با همان نام و هزینه‌ها، فقط در
# seed dev». هزینه‌ی واقعی هرگز اینجا گذاشته نشده — docs/QUESTIONS.md.
_METHODS = [
    {"name": "پست پیشتاز", "cost": 0, "free_above": None, "estimated_days": "۲ تا ۳ روز کاری", "order": 1},
    # سقف ارسال رایگان با storeFacts.policies.freeShippingMinToman یکی است (۵۰ میلیون).
    {"name": "ارسال فوری تهران", "cost": 450_000, "free_above": 50_000_000, "estimated_days": "همان روز، تا ساعت ۲۱", "order": 2},
    {"name": "تحویل حضوری", "cost": 0, "free_above": None, "estimated_days": "تست دستگاه جلوی شما", "order": 3},
]


def seed_shipping_methods(apps, schema_editor):
    ShippingMethod = apps.get_model("settings", "ShippingMethod")
    for method in _METHODS:
        ShippingMethod.objects.update_or_create(name=method["name"], defaults={**method, "is_active": True})


def unseed_shipping_methods(apps, schema_editor):
    ShippingMethod = apps.get_model("settings", "ShippingMethod")
    ShippingMethod.objects.filter(name__in=[m["name"] for m in _METHODS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("settings", "0002_sitesettings_card_to_card_holder_name_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_shipping_methods, unseed_shipping_methods),
    ]
