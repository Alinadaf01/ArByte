import json
from dataclasses import dataclass


class PaymentProviderError(Exception):
    """Covers unavailable credentials, network failures, and gateway-side
    rejections alike — callers only need to show the user one clear error
    and let them pick a different gateway, not branch on failure type."""


@dataclass
class PaymentRequestResult:
    redirect_url: str
    authority: str


@dataclass
class PaymentVerifyResult:
    success: bool
    ref_id: str
    raw_response: dict


class PaymentProvider:
    """One subclass per gateway. Every subclass only implements request()
    and verify() — credential loading, sandbox toggling, and the "is this
    gateway even usable right now" check all live here so a fifth gateway
    never has to touch this file."""

    code: str
    service: str
    display_name: str

    def __init__(self):
        # isActive only gates whether a gateway is *offered* on new
        # checkouts (checked separately in services.initiate_payment) — it
        # is deliberately not checked here, because verify() must still be
        # able to authenticate an in-flight transaction with the gateway
        # even if an admin disabled the row in the meantime. The row still
        # needs usable credentials either way.
        from apps.settings.models import ApiCredential

        self.credential = ApiCredential.objects.filter(service=self.service).order_by("-is_active", "order").first()
        if not self.credential or not self.credential.has_valid_credentials():
            raise PaymentProviderError(f"درگاه {self.display_name} در حال حاضر در دسترس نیست.")

    @property
    def credentials(self) -> dict:
        return json.loads(self.credential.credentials)

    @property
    def is_sandbox(self) -> bool:
        return self.credential.is_sandbox

    def request(self, order, callback_url: str) -> PaymentRequestResult:
        raise NotImplementedError

    def verify(self, callback_data: dict, payment) -> PaymentVerifyResult:
        """payment is the Payment row created at request() time — its
        `amount` (Toman, server-computed, never trusted from the callback)
        and `authority` are what verify calls the gateway with. Callback
        query params alone are never enough; several gateways don't even
        echo the amount back."""
        raise NotImplementedError
