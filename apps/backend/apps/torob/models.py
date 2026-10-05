"""AUDIT-6 — گزارش هر درخواست Torob API v3 برای پنل «ترب».

هرگز توکن یا بدنه‌ی کامل درخواست ذخیره نمی‌شود؛ فقط حالت، نتیجه و تعداد.
"""

from django.db import models


class TorobFetchLog(models.Model):
    MODE_CHOICES = [
        ("page", "صفحه‌بندی"),
        ("cursor", "cursor"),
        ("page_urls", "با آدرس"),
        ("page_uniques", "با شناسه"),
        ("invalid", "نامعتبر"),
    ]

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES)
    sort = models.CharField(max_length=30, blank=True)
    page = models.PositiveIntegerField(null=True, blank=True)
    status_code = models.PositiveSmallIntegerField()
    item_count = models.PositiveIntegerField(default=0)
    invalid_count = models.PositiveIntegerField(default=0)
    error = models.CharField(max_length=500, blank=True)
    duration_ms = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} {self.mode} {self.status_code}"
