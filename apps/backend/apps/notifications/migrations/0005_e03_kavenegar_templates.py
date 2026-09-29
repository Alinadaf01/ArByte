from django.db import migrations

# E-03 §۲ — چهار الگوی واقعی که مدیر پروژه در پنل کاوه‌نگار ثبت می‌کند
# (نام‌ها/توکن‌ها عیناً طبق جدول سند تسک). کلید داخلی `otp_login`/
# `order_shipped` از قبل موجود بود (D-04/D-05) — همان ردیف‌ها به‌جای
# ساخت دوباره به‌روزرسانی می‌شوند (یکتایی `key` هم اجازه‌ی دو ردیف هم‌نام
# نمی‌دهد). `order_confirmed`/`order_new_admin` تازه‌اند.
_UPDATED_OR_NEW = {
    "otp_login": {
        "title": "کد ورود",
        "kavenegar_template_name": "arbyteotp",
        "kavenegar_token_map": {"token": "code"},
    },
    "order_confirmed": {
        "title": "تأیید سفارش",
        "kavenegar_template_name": "arbyteorder",
        "kavenegar_token_map": {"token": "orderNumber", "token10": "firstName"},
    },
    "order_new_admin": {
        "title": "سفارش تازه (مدیر)",
        "kavenegar_template_name": "arbyteadmin",
        "kavenegar_token_map": {"token": "orderNumber", "token2": "amount", "token10": "customerName"},
    },
    "order_shipped": {
        "title": "ارسال سفارش",
        "kavenegar_template_name": "arbyteship",
        "kavenegar_token_map": {
            "token": "orderNumber",
            "token2": "trackingCode",
            "token3": "postalCode",
            "token10": "carrierName",
        },
    },
}

# هفت قالب گذار وضعیت D-05 غیرفعال می‌شوند (پاک نه) — «order_shipped» از
# این هفت‌تا خودش بالاست (به الگوی تازه به‌روزرسانی شد، نه غیرفعال؛
# یکتایی key اجازه‌ی دو ردیف هم‌نام را نمی‌داد)، پس فقط شش‌تای باقی‌مانده
# اینجا واقعاً غیرفعال می‌شوند.
_DEACTIVATED = [
    "order_payment_review",
    "order_paid",
    "order_processing",
    "order_ready_to_ship",
    "order_delivered",
    "order_cancelled",
]


def apply_e03_templates(apps, schema_editor):
    SmsTemplate = apps.get_model("notifications", "SmsTemplate")
    for key, fields in _UPDATED_OR_NEW.items():
        SmsTemplate.objects.update_or_create(
            key=key,
            defaults={**fields, "is_active": True},
        )
    SmsTemplate.objects.filter(key__in=_DEACTIVATED).update(is_active=False)


def revert_e03_templates(apps, schema_editor):
    SmsTemplate = apps.get_model("notifications", "SmsTemplate")
    SmsTemplate.objects.filter(key__in=_DEACTIVATED).update(is_active=True)
    SmsTemplate.objects.filter(key="order_confirmed").delete()
    SmsTemplate.objects.filter(key="order_new_admin").delete()
    SmsTemplate.objects.filter(key="otp_login").update(
        kavenegar_template_name="", kavenegar_token_map={}
    )
    SmsTemplate.objects.filter(key="order_shipped").update(
        kavenegar_template_name="", kavenegar_token_map={}
    )


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0004_remove_smslog_kavenegar_token_and_more"),
    ]

    operations = [
        migrations.RunPython(apply_e03_templates, revert_e03_templates),
    ]
