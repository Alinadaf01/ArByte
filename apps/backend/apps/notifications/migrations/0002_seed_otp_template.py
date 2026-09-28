from django.db import migrations


def seed_otp_template(apps, schema_editor):
    SmsTemplate = apps.get_model("notifications", "SmsTemplate")
    SmsTemplate.objects.update_or_create(
        key="otp_login",
        defaults={
            "title": "کد ورود",
            "body": "کد ورود شما به آربایت: {code}",
            "is_active": True,
        },
    )


def unseed_otp_template(apps, schema_editor):
    SmsTemplate = apps.get_model("notifications", "SmsTemplate")
    SmsTemplate.objects.filter(key="otp_login").delete()


class Migration(migrations.Migration):
    # D-04 §۱ — D-02's fresh-migration reset dropped vybeshop's own
    # otp_login seed data (schema-only migrations, no seed rows) — this
    # recreates just the one template apps.public_api.otp actually sends.
    # Plain-text path (kavenegar_template_name empty), not Kavenegar Lookup
    # — no pre-approved pattern name exists yet for this project.

    dependencies = [
        ("notifications", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_otp_template, unseed_otp_template),
    ]
