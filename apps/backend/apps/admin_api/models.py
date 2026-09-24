from django.contrib.auth.models import Group
from django.db import models

from .sections import SECTIONS, codename


class AdminRole(models.Model):
    """A thin wrapper over Django's own Group (BACKEND-TASK.md §7.5: 'از
    سیستم Group و Permission خود جنگو استفاده شود، نه پیاده‌سازی موازی') —
    the actual permission grants live on group.permissions as real
    django.contrib.auth.Permission rows; this model only adds the
    admin-panel-specific metadata Group doesn't have.

    All section.action permissions are declared here (not scattered across
    every app's models.py) so app_label is consistently "admin_api" for
    every one of them, regardless of which real section they gate."""

    group = models.OneToOneField(Group, on_delete=models.CASCADE, related_name="admin_role")
    description = models.CharField(max_length=255, blank=True)
    # System roles (the 5 defaults) can't be deleted — see §7.5. They CAN
    # still be edited (a general manager retuning what "پشتیبانی" sees).
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["group__name"]
        permissions = [(codename(section, action), f"{label} — {action}") for section, label, actions in SECTIONS for action in actions]

    def __str__(self):
        return self.group.name

    @property
    def name(self) -> str:
        return self.group.name


# Search Console data is never fetched live per-request (ADMIN-API-CONTRACT.md
# §7) — a once-daily Celery task (not implemented yet; no Search Console
# credentials exist for this project) would populate these. Until that task
# runs, every read endpoint in search_console.py returns 503, matching the
# contract's explicit fallback.


class SearchConsolePerformance(models.Model):
    date = models.DateField(unique=True)
    impressions = models.PositiveIntegerField(default=0)
    clicks = models.PositiveIntegerField(default=0)
    ctr = models.FloatField(default=0)
    avg_position = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return str(self.date)


class SearchConsoleQuery(models.Model):
    date = models.DateField()
    query = models.CharField(max_length=255)
    impressions = models.PositiveIntegerField(default=0)
    clicks = models.PositiveIntegerField(default=0)
    ctr = models.FloatField(default=0)
    position = models.FloatField(default=0)

    class Meta:
        ordering = ["-date", "-clicks"]

    def __str__(self):
        return f"{self.query} @ {self.date}"


class SearchConsolePage(models.Model):
    date = models.DateField()
    page = models.CharField(max_length=500)
    impressions = models.PositiveIntegerField(default=0)
    clicks = models.PositiveIntegerField(default=0)
    ctr = models.FloatField(default=0)
    position = models.FloatField(default=0)

    class Meta:
        ordering = ["-date", "-clicks"]

    def __str__(self):
        return f"{self.page} @ {self.date}"


class SearchConsoleIndexStatus(models.Model):
    """Singleton — always pk=1, like SiteSettings."""

    indexed_count = models.PositiveIntegerField(default=0)
    error_count = models.PositiveIntegerField(default=0)
    issues = models.JSONField(default=list, help_text="[{page, reason}, ...]")
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls) -> "SearchConsoleIndexStatus | None":
        return cls.objects.filter(pk=1).first()


class SearchConsoleSitemapStatus(models.Model):
    """Singleton — always pk=1."""

    last_read_at = models.DateTimeField(blank=True, null=True)
    discovered_urls = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls) -> "SearchConsoleSitemapStatus | None":
        return cls.objects.filter(pk=1).first()
