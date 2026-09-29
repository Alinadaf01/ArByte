from django.db import migrations

# E-02 §۵ — همان الگوی settings.0003_seed_dev_shipping_methods: کد ثابت
# فقط برای fixture تست e2e (Playwright, Cart.dc.html هم دقیقاً «۱۰٪
# تخفیف» را نمونه می‌داند)، نه یک کد بازاریابی واقعی.
_CODE = "ARBYTE10"


def seed_dev_coupon(apps, schema_editor):
    Coupon = apps.get_model("content", "Coupon")
    Coupon.objects.update_or_create(
        code=_CODE,
        defaults={"type": "PERCENT", "percent_basis_points": 1000, "is_active": True},
    )


def unseed_dev_coupon(apps, schema_editor):
    Coupon = apps.get_model("content", "Coupon")
    Coupon.objects.filter(code=_CODE).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0004_remove_coupon_categories_remove_coupon_ends_at_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_dev_coupon, unseed_dev_coupon),
    ]
