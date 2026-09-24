from django.db import migrations

TEMPLATES = [
    (
        "otp_login",
        "کد ورود",
        "کد ورود شما به آربایت: {code}\nاین کد تا ۲ دقیقه دیگر معتبر است.",
    ),
    (
        "order_paid",
        "تأیید پرداخت",
        "سفارش {orderNumber} با موفقیت پرداخت شد. برای پیگیری به حساب کاربری خود مراجعه کنید.",
    ),
    (
        "order_shipped",
        "ارسال سفارش",
        "سفارش {orderNumber} ارسال شد. کد رهگیری پستی: {trackingCode}",
    ),
    (
        "order_delivered",
        "تحویل سفارش",
        "سفارش {orderNumber} تحویل داده شد. خوشحال می‌شویم نظرتان را درباره محصول ثبت کنید.",
    ),
    (
        "owner_new_order",
        "سفارش جدید (کارفرما)",
        "سفارش جدید {orderNumber} — مبلغ {total} تومان، {itemCount} قلم، مشتری: {customerName}",
    ),
    (
        "owner_low_stock",
        "هشدار موجودی (کارفرما)",
        "موجودی «{productName}» به {stockCount} عدد رسید — نزدیک نقطه سفارش.",
    ),
]


def seed_templates(apps, schema_editor):
    SmsTemplate = apps.get_model("notifications", "SmsTemplate")
    for key, title, body in TEMPLATES:
        SmsTemplate.objects.update_or_create(key=key, defaults={"title": title, "body": body, "is_active": True})


def remove_templates(apps, schema_editor):
    SmsTemplate = apps.get_model("notifications", "SmsTemplate")
    SmsTemplate.objects.filter(key__in=[key for key, _, _ in TEMPLATES]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_templates, remove_templates),
    ]
