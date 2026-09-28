from django.db import migrations

# D-05 §۱ — apps/orders/order_status.py's _SMS_TEMPLATE_BY_TRANSITION
# متن‌ها عیناً برچسب‌های وضعیت کانونی apps/orders/models.py's
# ORDER_STATUS_CHOICES/PAYMENT_STATUS_CHOICES هستند (نه واژه‌ی تازه)، تا
# پیامک با چیزی که کاربر روی صفحه‌ی سفارش می‌بیند یکی باشد. بدون این seed،
# NotificationService.send_sms() بی‌صدا SmsLog(status="failed") می‌سازد
# (قالب پیدا نمی‌شود) — همان‌طور که 0002_seed_otp_template.py برای
# otp_login کرد.

TEMPLATES = {
    "order_payment_review": ("بررسی پرداخت سفارش", "سفارش {orderNumber} شما ثبت شد؛ پرداخت آن در حال بررسی است."),
    "order_paid": ("تأیید پرداخت سفارش", "پرداخت سفارش {orderNumber} شما تأیید شد."),
    "order_processing": ("پردازش سفارش", "سفارش {orderNumber} شما در حال پردازش است."),
    "order_ready_to_ship": ("آماده ارسال سفارش", "سفارش {orderNumber} شما آماده ارسال است."),
    "order_shipped": ("ارسال سفارش", "سفارش {orderNumber} شما ارسال شد."),
    "order_delivered": ("تحویل سفارش", "سفارش {orderNumber} شما تحویل داده شد."),
    "order_cancelled": ("لغو سفارش", "سفارش {orderNumber} شما لغو شد."),
}


def seed_order_sms_templates(apps, schema_editor):
    SmsTemplate = apps.get_model("notifications", "SmsTemplate")
    for key, (title, body) in TEMPLATES.items():
        SmsTemplate.objects.update_or_create(
            key=key,
            defaults={"title": title, "body": body, "is_active": True},
        )


def unseed_order_sms_templates(apps, schema_editor):
    SmsTemplate = apps.get_model("notifications", "SmsTemplate")
    SmsTemplate.objects.filter(key__in=TEMPLATES.keys()).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0002_seed_otp_template"),
    ]

    operations = [
        migrations.RunPython(seed_order_sms_templates, unseed_order_sms_templates),
    ]
