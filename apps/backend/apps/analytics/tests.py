from django.test import TestCase
from django.utils import timezone

from apps.analytics.models import DailyStat, PageView
from apps.analytics.tasks import aggregate_daily_stats

# PageViewApiTests (public `pageview-create` endpoint) removed in D-01 along
# with the public API layer it tested — rebuilt against the ArByte contract
# in D-03/D-04/D-05. aggregate_daily_stats() is a kept Celery task (§ keep
# list), tested here directly against the model, independent of that view.


class DailyStatAggregationTests(TestCase):
    def test_aggregates_yesterdays_page_views(self):
        yesterday = timezone.localdate() - timezone.timedelta(days=1)
        yesterday_dt = timezone.make_aware(
            timezone.datetime.combine(yesterday, timezone.datetime.min.time())
        ) + timezone.timedelta(hours=12)

        PageView.objects.create(path="/", visitor_hash="a" * 64)
        PageView.objects.create(path="/products", visitor_hash="a" * 64)  # same visitor
        PageView.objects.create(path="/blog", visitor_hash="b" * 64)
        PageView.objects.filter(path__in=["/", "/products", "/blog"]).update(created_at=yesterday_dt)

        aggregate_daily_stats()

        stat = DailyStat.objects.get(date=yesterday)
        self.assertEqual(stat.page_views, 3)
        self.assertEqual(stat.unique_visitors, 2)

    def test_purges_page_views_older_than_retention_window(self):
        old_date = timezone.now() - timezone.timedelta(days=100)
        PageView.objects.create(path="/", visitor_hash="a" * 64)
        PageView.objects.filter(path="/").update(created_at=old_date)

        aggregate_daily_stats()

        self.assertEqual(PageView.objects.count(), 0)
