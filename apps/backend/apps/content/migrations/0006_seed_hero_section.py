from django.db import migrations

# Mirrors src/content/home.ts's `hero` block exactly, so the home page looks
# identical right after this migration runs — only the image fields are left
# blank for the owner to fill in (HOMEPAGE-ADMIN-TASK.md §6).
HERO_DEFAULTS = {
    "image_alt": "محصول قهرمان، مشکی مات، مرکز کادر — نور نرم از بالا",
    "title": "هر قطعه، یک تصمیم طراحی",
    "subtitle": "اشیای کاربردی روزمره، پرینت‌شده لایه به لایه در کارگاه ما.",
    "caption": "PLA · FDM · 0.2MM LAYER",
    "cta_label": "مجموعه را کاوش کنید",
    "cta_url": "/products",
    "is_active": True,
}


def seed_hero(apps, schema_editor):
    HeroSection = apps.get_model("content", "HeroSection")
    HeroSection.objects.update_or_create(pk=1, defaults=HERO_DEFAULTS)


def remove_hero(apps, schema_editor):
    HeroSection = apps.get_model("content", "HeroSection")
    HeroSection.objects.filter(pk=1).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0005_communitytile_herosection_homeshowcase"),
    ]

    operations = [
        migrations.RunPython(seed_hero, remove_hero),
    ]
