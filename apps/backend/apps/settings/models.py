import json

from django.core.exceptions import ValidationError
from django.db import models
from encrypted_model_fields.fields import EncryptedTextField


class SiteSettings(models.Model):
    """Singleton — always pk=1. Use SiteSettings.load() to fetch/create it."""

    # Legal seller identity for PDF invoices (BACKEND-TASK.md §3.6-الف) —
    # not shown anywhere on the storefront, only on generated documents.
    business_name = models.CharField(max_length=150, blank=True)
    economic_code = models.CharField(max_length=30, blank=True, help_text="کد اقتصادی")
    national_id = models.CharField(max_length=30, blank=True, help_text="شناسه ملی")

    phone_display = models.CharField(max_length=30, blank=True)
    phone_href = models.CharField(max_length=30, blank=True, help_text='e.g. "+982112345678" for tel:')
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=300, blank=True)
    business_hours = models.JSONField(default=list, help_text="[{day, time}, ...]")

    instagram_url = models.URLField(blank=True, help_text="لینک کامل، مثلاً https://instagram.com/arbyte — خالی بگذار تا در فوتر/تماس با ما نمایش داده نشود.")
    telegram_url = models.URLField(blank=True, help_text="لینک کامل — خالی بگذار تا نمایش داده نشود.")
    whatsapp_url = models.URLField(blank=True, help_text="لینک کامل (مثلاً https://wa.me/98912...) — خالی بگذار تا نمایش داده نشود.")
    linkedin_url = models.URLField(blank=True, help_text="لینک کامل — خالی بگذار تا نمایش داده نشود.")
    youtube_url = models.URLField(blank=True, help_text="لینک کامل — خالی بگذار تا نمایش داده نشود.")
    pinterest_url = models.URLField(blank=True, help_text="لینک کامل — خالی بگذار تا نمایش داده نشود.")

    google_maps_embed = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)

    trust_badge_label = models.CharField(max_length=100, blank=True)
    # Legacy path: an admin-uploaded static image, used when the trust
    # service doesn't require hotlinking its own image (unlike eNamad --
    # see trust_badge_image_url below, which is what eNamad actually needs).
    trust_badge_image = models.ImageField(
        upload_to="settings/", blank=True, null=True,
        help_text="فقط اگر نماد اعتمادت eNamad نیست و عکس ثابت داری از اینجا آپلود کن. فرمت PNG (پس‌زمینه شفاف) یا SVG، حداقل ۱۲۰×۱۲۰ پیکسل، حجم زیر ۲۰۰ کیلوبایت. برای eNamad به‌جایش «تصویر نماد (لینک eNamad)» را پر کن.",
    )
    # eNamad's badge is a hotlinked <img src="https://trustseal.enamad.ir/
    # logo.aspx?..."> -- eNamad requires linking directly to their own
    # server (for their own usage tracking/verification), not re-hosting a
    # downloaded copy. AdminSiteSettingsSerializer auto-extracts this (and
    # trust_badge_url) when the whole <a>...<img>... embed snippet eNamad
    # gives you is pasted into trust_badge_url.
    trust_badge_image_url = models.URLField(
        max_length=500, blank=True,
        help_text="برای eNamad: کل کد نماد را در فیلد «لینک نماد» پیست کن، این فیلد خودکار پر می‌شود.",
    )
    trust_badge_url = models.URLField(
        max_length=500, blank=True,
        help_text="لینک نماد. برای eNamad می‌توانی کل کد <a>...</a> نماد را همینجا پیست کنی -- لینک و عکس هردو خودکار استخراج می‌شوند.",
    )
    payment_gateway_label = models.CharField(max_length=100, blank=True)
    payment_gateway_image = models.ImageField(
        upload_to="settings/", blank=True, null=True,
        help_text="لوگوی درگاه پرداخت که در فوتر کنار «نماد اعتماد» نشان داده می‌شود. فرمت PNG (پس‌زمینه شفاف) یا SVG، حداقل ۱۲۰×۱۲۰ پیکسل، حجم زیر ۲۰۰ کیلوبایت.",
    )

    # None of these four are wired into the live storefront yet -- it uses
    # a fixed vector wordmark component for crisp branding rather than a
    # raster upload, and favicon/OG image are
    # still static files (index.html, src/components/seo/Seo.tsx's
    # default). Uploading here saves the file but has no visible effect
    # until that's deliberately wired up -- see HANDOVER.md.
    logo_light = models.ImageField(
        upload_to="settings/", blank=True, null=True,
        help_text="فعلاً در سایت زنده استفاده نمی‌شود — سایت از یک لوگوی طراحی‌شده ثابت استفاده می‌کند، نه از این آپلود.",
    )
    logo_dark = models.ImageField(
        upload_to="settings/", blank=True, null=True,
        help_text="فعلاً در سایت زنده استفاده نمی‌شود.",
    )
    favicon = models.ImageField(
        upload_to="settings/", blank=True, null=True,
        help_text="فعلاً در سایت زنده استفاده نمی‌شود — فاوآیکون فعلی از فایل ثابت index.html خوانده می‌شود. فرمت ICO یا PNG ۳۲×۳۲ یا ۶۴×۶۴ پیکسل.",
    )
    default_og_image = models.ImageField(
        upload_to="settings/", blank=True, null=True,
        help_text="فعلاً در سایت زنده استفاده نمی‌شود — تصویر پیش‌فرض اشتراک‌گذاری از فایل ثابت خوانده می‌شود. فرمت JPG یا PNG، ۱۲۰۰×۶۳۰ پیکسل.",
    )

    google_analytics_id = models.CharField(max_length=50, blank=True)
    google_tag_manager_id = models.CharField(max_length=50, blank=True)

    owner_notification_phone = models.CharField(
        max_length=200, blank=True, help_text="یک یا چند شماره، جدا با کاما — مثلاً 09120000000,09121111111"
    )
    notify_owner_new_order = models.BooleanField(
        default=True, help_text="پیامک به کارفرما پس از پرداخت موفق هر سفارش (نه هنگام ثبت سفارش pending)"
    )

    class Meta:
        verbose_name_plural = "site settings"

    def __str__(self):
        return "Site settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # singleton — never deleted

    @classmethod
    def load(cls) -> "SiteSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    @property
    def owner_notification_phone_list(self) -> list[str]:
        return [p.strip() for p in self.owner_notification_phone.split(",") if p.strip()]


API_CREDENTIAL_SERVICE_CHOICES = [
    ("kavenegar", "کاوه‌نگار"),
    ("zarinpal", "زرین‌پال"),
    ("idpay", "آیدی‌پی"),
    ("snapppay", "اسنپ‌پی"),
    ("digipay", "دیجی‌پی"),
]


class ApiCredential(models.Model):
    """credentials is encrypted at rest — swappable from the admin panel, no redeploy needed."""

    service = models.CharField(max_length=20, choices=API_CREDENTIAL_SERVICE_CHOICES)
    label = models.CharField(max_length=100, blank=True)
    # blank=True on purpose — an admin can add a disabled placeholder row
    # before keys exist. clean() below is what actually requires it, and
    # only once isActive=True.
    credentials = EncryptedTextField(
        blank=True, help_text="JSON string, e.g. {\"apiKey\": \"...\", \"merchantId\": \"...\"}"
    )
    is_active = models.BooleanField(default=True, help_text="controls checkout-time visibility")
    is_sandbox = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    # Only meaningful for payment gateways — shown on the checkout page's
    # gateway picker. Unused (blank) for kavenegar.
    logo = models.ImageField(upload_to="settings/gateways/", blank=True, null=True)
    description = models.CharField(max_length=150, blank=True, help_text='مثلاً «پرداخت اعتباری» برای اسنپ‌پی')

    class Meta:
        ordering = ["service", "order"]

    def __str__(self):
        return f"{self.get_service_display()} ({self.label or 'default'})"

    def clean(self):
        # An admin flipping isActive=True on a row with empty/malformed
        # credentials would otherwise silently expose a broken gateway (or a
        # broken SMS provider) to real traffic — catch it at save time.
        if not self.is_active:
            return
        if not self.credentials or not self.credentials.strip():
            raise ValidationError({"is_active": "بدون credentials نمی‌توان این سرویس را فعال کرد."})
        try:
            data = json.loads(self.credentials)
        except (TypeError, ValueError) as exc:
            raise ValidationError({"credentials": "credentials باید JSON معتبر باشد."}) from exc
        if not isinstance(data, dict) or not data:
            raise ValidationError({"credentials": "credentials باید یک JSON object غیرخالی باشد."})

    def has_valid_credentials(self) -> bool:
        if not self.credentials or not self.credentials.strip():
            return False
        try:
            data = json.loads(self.credentials)
        except (TypeError, ValueError):
            return False
        return isinstance(data, dict) and bool(data)


class ShippingMethod(models.Model):
    name = models.CharField(max_length=100)
    cost = models.PositiveIntegerField()
    free_above = models.PositiveIntegerField(blank=True, null=True)
    estimated_days = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "cost"]

    def __str__(self):
        return self.name
