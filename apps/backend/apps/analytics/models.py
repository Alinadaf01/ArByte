from django.conf import settings
from django.db import models


class AdminActivityLog(models.Model):
    """Who changed what and when — appended by admin API views, never edited."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="activity_logs"
    )
    action = models.CharField(max_length=100, help_text='e.g. "update", "delete", "bulk_price_edit"')
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=50, blank=True)
    changes = models.JSONField(blank=True, null=True, help_text="{field: [old, new], ...}")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} {self.action} {self.model_name}#{self.object_id}"


class PageView(models.Model):
    """BACKEND-TASK.md's spec assumes Django serves pages directly (a
    middleware watching GET requests); this project is a decoupled SPA —
    the storefront never touches Django at all, so recording happens via
    POST /api/analytics/pageview/ that the frontend calls on navigation
    instead. Same privacy rule either way: no raw IP is ever stored, only
    a daily-salted hash (see views.PageViewCreateView)."""

    path = models.CharField(max_length=255)
    visitor_hash = models.CharField(max_length=64)
    referrer = models.CharField(max_length=500, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    is_bot = models.BooleanField(default=False)
    product_slug = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["created_at"]), models.Index(fields=["path"])]

    def __str__(self):
        return f"{self.path} @ {self.created_at}"


class DailyStat(models.Model):
    """Aggregated nightly from PageView (see tasks.aggregate_daily_stats) —
    'total views' must always be read from here, never from a live PageView
    count, or the dashboard gets slower every day forever."""

    date = models.DateField(unique=True)
    page_views = models.PositiveIntegerField(default=0)
    unique_visitors = models.PositiveIntegerField(default=0)
    orders = models.PositiveIntegerField(default=0)
    revenue = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return str(self.date)
