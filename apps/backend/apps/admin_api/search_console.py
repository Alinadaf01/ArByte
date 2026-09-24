from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    SearchConsoleIndexStatus,
    SearchConsolePage,
    SearchConsolePerformance,
    SearchConsoleQuery,
    SearchConsoleSitemapStatus,
)
from .permissions import require_section

_NOT_READY = {"detail": "داده سرچ کنسول هنوز آماده نیست — کش شبانه اجرا نشده یا اطلاعات ورود تنظیم نشده است."}


def _date_range(request):
    from_date = parse_date(request.query_params.get("from", "")) if request.query_params.get("from") else None
    to_date = parse_date(request.query_params.get("to", "")) if request.query_params.get("to") else None
    return from_date, to_date


class AdminSearchConsolePerformanceView(APIView):
    permission_classes = [require_section("search_console")]

    def get(self, request):
        from_date, to_date = _date_range(request)
        qs = SearchConsolePerformance.objects.all()
        if from_date:
            qs = qs.filter(date__gte=from_date)
        if to_date:
            qs = qs.filter(date__lte=to_date)
        rows = list(qs.order_by("date"))
        if not rows:
            return Response(_NOT_READY, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        impressions = sum(r.impressions for r in rows)
        clicks = sum(r.clicks for r in rows)
        ctr = round(clicks / impressions, 4) if impressions else 0
        avg_position = round(sum(r.avg_position for r in rows) / len(rows), 1)
        series = [
            {"date": r.date.isoformat(), "impressions": r.impressions, "clicks": r.clicks, "ctr": r.ctr, "avg_position": r.avg_position}
            for r in rows
        ]
        return Response({"impressions": impressions, "clicks": clicks, "ctr": ctr, "avg_position": avg_position, "series": series})


class AdminSearchConsoleQueriesView(APIView):
    permission_classes = [require_section("search_console")]

    def get(self, request):
        from_date, to_date = _date_range(request)
        qs = SearchConsoleQuery.objects.all()
        if from_date:
            qs = qs.filter(date__gte=from_date)
        if to_date:
            qs = qs.filter(date__lte=to_date)
        if not qs.exists():
            return Response(_NOT_READY, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(
            [{"query": r.query, "impressions": r.impressions, "clicks": r.clicks, "ctr": r.ctr, "position": r.position} for r in qs]
        )


class AdminSearchConsolePagesView(APIView):
    permission_classes = [require_section("search_console")]

    def get(self, request):
        from_date, to_date = _date_range(request)
        qs = SearchConsolePage.objects.all()
        if from_date:
            qs = qs.filter(date__gte=from_date)
        if to_date:
            qs = qs.filter(date__lte=to_date)
        if not qs.exists():
            return Response(_NOT_READY, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(
            [{"page": r.page, "impressions": r.impressions, "clicks": r.clicks, "ctr": r.ctr, "position": r.position} for r in qs]
        )


class AdminSearchConsoleIndexStatusView(APIView):
    permission_classes = [require_section("search_console")]

    def get(self, request):
        obj = SearchConsoleIndexStatus.load()
        if obj is None:
            return Response(_NOT_READY, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({"indexed_count": obj.indexed_count, "error_count": obj.error_count, "issues": obj.issues})


class AdminSearchConsoleSitemapStatusView(APIView):
    permission_classes = [require_section("search_console")]

    def get(self, request):
        obj = SearchConsoleSitemapStatus.load()
        if obj is None:
            return Response(_NOT_READY, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({"last_read_at": obj.last_read_at, "discovered_urls": obj.discovered_urls})
