from django.db import models

SMS_STATUS_CHOICES = [
    ("queued", "در صف"),
    ("sent", "ارسال‌شده"),
    ("failed", "ناموفق"),
]


class SmsTemplate(models.Model):
    """Edited from the admin panel so copy can change without a redeploy.

    Two send paths, chosen per-row by whether kavenegar_template_name is set:

    - Plain Send (kavenegar_template_name empty): `body` is formatted with
      the caller's context dict and sent as free-text SMS. This is the
      original/default path.
    - Lookup (kavenegar_template_name set): sends via Kavenegar's
      pre-approved-pattern API instead -- required for OTP and any SMS
      Kavenegar classifies as transactional, since providers increasingly
      reject/throttle plain-text SMS for these. `body` is ignored;
      kavenegar_token_map (E-02 §۲) نگاشت چندتوکنی است -- کلیدهایش نام
      واقعی پارامتر کاوه‌نگار (token/token2/token3/token10/token20)،
      مقدارش کلید متناظر در context caller. کاوه‌نگار حداکثر همین پنج
      پارامتر را در Lookup API می‌پذیرد.
    """

    key = models.SlugField(unique=True, help_text='e.g. "otp_login", "order_confirmed", "order_shipped"')
    title = models.CharField(max_length=150)
    body = models.TextField(help_text="Use {placeholders} like {code}, {orderNumber}", blank=True)
    is_active = models.BooleanField(default=True)
    kavenegar_template_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="نام الگوی Lookup در پنل کاوه‌نگار (نه شناسه عددی). خالی = ارسال متن معمولی با body.",
    )
    kavenegar_token_map = models.JSONField(
        default=dict,
        blank=True,
        help_text='نگاشت پارامتر کاوه‌نگار به کلید context، مثلاً {"token": "orderNumber", "token10": "firstName"}.',
    )

    def __str__(self):
        return self.title


class SmsLog(models.Model):
    """Append-only — the only way to answer 'the SMS never arrived'."""

    phone = models.CharField(max_length=11)
    template = models.ForeignKey(
        SmsTemplate, on_delete=models.SET_NULL, blank=True, null=True, related_name="logs"
    )
    body = models.TextField(blank=True)
    # Snapshotted from the template at send time (not just looked up via
    # `template` at send-task time) so a later edit to the template's
    # Kavenegar settings can't change what an already-queued/sent log
    # claims was actually sent -- same reasoning as `body` being a copy,
    # not a live read through `template.body`.
    kavenegar_template_name = models.CharField(max_length=100, blank=True)
    kavenegar_tokens = models.JSONField(default=dict, blank=True, help_text="مقادیر پاک‌سازی‌شده‌ی token/token2/... در لحظه‌ی ارسال.")
    status = models.CharField(max_length=10, choices=SMS_STATUS_CHOICES, default="queued")
    provider_message_id = models.CharField(max_length=100, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["phone", "created_at"])]

    def __str__(self):
        return f"{self.phone} — {self.status}"
