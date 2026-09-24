from django.db import migrations

# Kavenegar Lookup pattern names as registered (and already approved) in the
# Kavenegar panel, plus which single context key each pattern's one %token%
# maps to. Every pattern here uses exactly one token -- confirmed against the
# actual registered wording, not assumed:
#   Template  (otp):              "کد ورود %token"
#   Template2 (order_paid):       "سفارش شما به شماره %token با موفقیت..."
#   Template3 (owner_new_order):  "سفارش جدید به شماره %token در سایت ثبت شد"
#   Template4 (order_shipped):    "...کدپستی : %token" -- the admin panel's
#     "کد رهگیری پستی" field is what's sent here (owner's own naming choice,
#     confirmed explicitly), not a separate postal-code field.
LOOKUP_CONFIG = {
    "otp_login": ("Template", "code"),
    "order_paid": ("Template2", "orderNumber"),
    "owner_new_order": ("Template3", "orderNumber"),
    "order_shipped": ("Template4", "trackingCode"),
}


def configure_lookup(apps, schema_editor):
    SmsTemplate = apps.get_model("notifications", "SmsTemplate")
    for key, (template_name, token_field) in LOOKUP_CONFIG.items():
        SmsTemplate.objects.filter(key=key).update(
            kavenegar_template_name=template_name, kavenegar_token_field=token_field
        )


def revert_lookup(apps, schema_editor):
    SmsTemplate = apps.get_model("notifications", "SmsTemplate")
    SmsTemplate.objects.filter(key__in=LOOKUP_CONFIG.keys()).update(
        kavenegar_template_name="", kavenegar_token_field=""
    )


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0003_smslog_kavenegar_template_name_and_more"),
    ]

    operations = [
        migrations.RunPython(configure_lookup, revert_lookup),
    ]
