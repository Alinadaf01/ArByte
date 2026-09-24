from .base import PaymentProvider, PaymentProviderError, PaymentRequestResult, PaymentVerifyResult
from .digipay import DigiPayProvider
from .idpay import IdPayProvider
from .snapppay import SnapPayProvider
from .zarinpal import ZarinpalProvider

# Adding a fifth gateway means adding one class + one line here — nothing
# else in this file, base.py, or the views/services that use get_provider()
# needs to change.
PAYMENT_PROVIDERS: dict[str, type[PaymentProvider]] = {
    ZarinpalProvider.code: ZarinpalProvider,
    IdPayProvider.code: IdPayProvider,
    SnapPayProvider.code: SnapPayProvider,
    DigiPayProvider.code: DigiPayProvider,
}


def get_provider(code: str) -> PaymentProvider:
    provider_class = PAYMENT_PROVIDERS.get(code)
    if not provider_class:
        raise PaymentProviderError(f"درگاه «{code}» پشتیبانی نمی‌شود.")
    return provider_class()


__all__ = [
    "PAYMENT_PROVIDERS",
    "PaymentProvider",
    "PaymentProviderError",
    "PaymentRequestResult",
    "PaymentVerifyResult",
    "get_provider",
]
