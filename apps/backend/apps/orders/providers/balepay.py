"""D-05 §۳ — اسکلت بله‌پی. مستندات provider هنوز نرسیده (۰۰-strategy/
PLAN-DJANGO.md §۸: «مستندات بله‌پی — هر وقت رسید»)؛ تا آن زمان هر دو متد
`PaymentProviderError` می‌اندازند (روی GATEWAY_ERROR نگاشت می‌شود،
apps/orders/services.py) — checkout نباید بشکند، فقط این یک درگاه در
دسترس نیست."""

from .base import PaymentProvider, PaymentProviderError, PaymentRequestResult, PaymentVerifyResult


class BalePayProvider(PaymentProvider):
    code = "BALEPAY"
    service = "balepay"
    display_name = "بله‌پی"

    def request(self, order, callback_url: str) -> PaymentRequestResult:
        raise PaymentProviderError("درگاه بله‌پی هنوز پیکربندی نشده است.")

    def verify(self, callback_data: dict, payment) -> PaymentVerifyResult:
        raise PaymentProviderError("درگاه بله‌پی هنوز پیکربندی نشده است.")
