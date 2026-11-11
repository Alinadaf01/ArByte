from django.conf import settings
from django.db import models

from apps.catalog.models import PRODUCT_GRADE_CHOICES


class DeviceLabel(models.Model):
    """درخواست مدیر — برچسب داخلی (فقط بک‌اند، هرگز مشتری نمی‌بیند) برای
    دستگاه‌های استوک خریداری‌شده (مثلاً محموله‌ی دبی)، تا هنگام بسته‌بندی/
    ارسال بشود روی جعبه چسباند و بخش ارسال با همان `code` دستگاه را از روی
    لیبل تطبیق بدهد — جایگزین فتوشاپ دستی. مشخصات کاملاً آزاد/دستی‌اند
    (ربطی به Product/ProductVariant کاتالوگ ندارند، چون این دستگاه‌ها لزوماً
    هنوز در کاتالوگ ثبت نشده‌اند یا مشخصاتشان واحد-به-واحد فرق دارد)."""

    code = models.CharField(max_length=20, unique=True)
    device_name = models.CharField(max_length=200)
    model_number = models.CharField(max_length=100, blank=True)
    cpu = models.CharField(max_length=150, blank=True)
    ram = models.CharField(max_length=100, blank=True)
    storage = models.CharField(max_length=100, blank=True)
    display = models.CharField(max_length=150, blank=True)
    battery_health_percent = models.PositiveSmallIntegerField(blank=True, null=True)
    battery_cycle_count = models.PositiveIntegerField(blank=True, null=True)
    grade = models.CharField(max_length=20, choices=PRODUCT_GRADE_CHOICES, blank=True)
    defect_notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="device_labels"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.code} — {self.device_name}"
