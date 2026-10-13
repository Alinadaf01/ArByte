from django.core.management.base import BaseCommand

from apps.admin_api.search_console_sync import SearchConsoleNotConfigured, sync


class Command(BaseCommand):
    help = "همگام‌سازی دستی عملکرد/کلیدواژه‌ها/صفحات سرچ کنسول (برای تست بدون صبر تا اجرای شبانه)."

    def handle(self, *args, **options):
        try:
            result = sync()
        except SearchConsoleNotConfigured as exc:
            self.stderr.write(self.style.ERROR(str(exc)))
            return
        self.stdout.write(self.style.SUCCESS(f"انجام شد: {result}"))
