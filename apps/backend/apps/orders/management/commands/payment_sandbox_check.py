"""G-04 — آزمون sandbox درگاه پرداخت، بدون ساخت سفارش واقعی.

    python manage.py payment_sandbox_check zarinpal

کلید همان ApiCredential پنل است (تنظیمات → کلیدهای API)؛ این دستور همیشه
روی sandbox درگاه اجرا می‌شود (حتی اگر «حالت آزمایشی» خاموش باشد) و فقط
درخواست پرداخت را می‌سازد و لینک پرداخت را چاپ می‌کند.
"""

from types import SimpleNamespace

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.orders.providers import PAYMENT_PROVIDERS
from apps.orders.providers.base import PaymentProviderError


class Command(BaseCommand):
    help = "درخواست پرداخت آزمایشی (sandbox) با کلید پنل؛ لینک StartPay را چاپ می‌کند."

    def add_arguments(self, parser):
        parser.add_argument("provider", help="مثلاً zarinpal")
        parser.add_argument("--amount", type=int, default=10_000, help="تومان")

    def handle(self, *args, **options):
        code = options["provider"].upper()
        provider_class = PAYMENT_PROVIDERS.get(code)
        if not provider_class:
            raise CommandError(f"درگاه ناشناخته: {code}. موجود: {', '.join(PAYMENT_PROVIDERS)}")
        sandbox_class = type(f"Sandbox{provider_class.__name__}", (provider_class,), {"is_sandbox": property(lambda self: True)})
        try:
            provider = sandbox_class()
        except PaymentProviderError as exc:
            raise CommandError(f"کلید این درگاه در پنل (تنظیمات → کلیدهای API) نیست یا ناقص است: {exc}") from exc
        order = SimpleNamespace(final_total=options["amount"], order_number="SANDBOX-CHECK", pk=0, id=0)
        callback = f"{getattr(settings, 'BACKEND_BASE_URL', '')}/api/v1/payments/callback/{code.lower()}"
        try:
            result = provider.request(order, callback)
        except PaymentProviderError as exc:
            raise CommandError(f"درگاه خطا داد: {exc}") from exc
        self.stdout.write(self.style.SUCCESS("درخواست sandbox موفق بود."))
        self.stdout.write(f"authority: {result.authority}")
        self.stdout.write(f"لینک پرداخت آزمایشی: {result.redirect_url}")
