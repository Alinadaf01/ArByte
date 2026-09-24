import requests

from .base import PaymentProvider, PaymentProviderError, PaymentRequestResult, PaymentVerifyResult

# Zarinpal's REST API speaks Rial, not Toman — every amount in this project
# is stored in Toman (see BACKEND-TASK.md's data rules), so every payload
# and every amount check on verify multiplies/divides by 10 at this one
# boundary and nowhere else.
_RIAL_PER_TOMAN = 10

_REQUEST_URL = {
    True: "https://sandbox.zarinpal.com/pg/v4/payment/request.json",
    False: "https://payment.zarinpal.com/pg/v4/payment/request.json",
}
_VERIFY_URL = {
    True: "https://sandbox.zarinpal.com/pg/v4/payment/verify.json",
    False: "https://payment.zarinpal.com/pg/v4/payment/verify.json",
}
_STARTPAY_URL = {
    True: "https://sandbox.zarinpal.com/pg/StartPay/{authority}",
    False: "https://payment.zarinpal.com/pg/StartPay/{authority}",
}

# 100 = fresh success, 101 = "already verified" (a retried/duplicate verify
# call for a transaction Zarinpal itself already marked paid) — both count
# as success so a duplicate callback doesn't read as a failure.
_VERIFY_SUCCESS_CODES = {100, 101}


class ZarinpalProvider(PaymentProvider):
    code = "ZARINPAL"
    service = "zarinpal"
    display_name = "زرین‌پال"

    def request(self, order, callback_url: str) -> PaymentRequestResult:
        merchant_id = self.credentials.get("merchantId", "")
        if not merchant_id:
            # has_valid_credentials() only checks the JSON is a non-empty
            # dict, so a row saved with the wrong key name (e.g. "apiKey" --
            # the generic placeholder every other credential row's editor
            # shows) passes that check but sends merchant_id="" to Zarinpal,
            # which Zarinpal rejects with a generic-sounding error. Fail with
            # the real cause instead of forwarding an empty credential.
            raise PaymentProviderError(
                'درگاه زرین‌پال بدون کلید "merchantId" قابل استفاده نیست. کد کلید را در تنظیمات بررسی کنید.'
            )
        payload = {
            "merchant_id": merchant_id,
            "amount": order.total * _RIAL_PER_TOMAN,
            "callback_url": callback_url,
            "description": f"سفارش {order.number}",
        }
        try:
            response = requests.post(_REQUEST_URL[self.is_sandbox], json=payload, timeout=15)
            body = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise PaymentProviderError("ارتباط با زرین‌پال برقرار نشد.") from exc

        data = body.get("data") or {}
        if data.get("code") != 100:
            errors = body.get("errors") or {}
            message = errors.get("message") if isinstance(errors, dict) else str(errors)
            raise PaymentProviderError(message or "درخواست پرداخت زرین‌پال رد شد.")

        authority = data["authority"]
        return PaymentRequestResult(
            redirect_url=_STARTPAY_URL[self.is_sandbox].format(authority=authority), authority=authority
        )

    def verify(self, callback_data: dict, payment) -> PaymentVerifyResult:
        if callback_data.get("Status") != "OK":
            return PaymentVerifyResult(success=False, ref_id="", raw_response=callback_data)

        payload = {
            "merchant_id": self.credentials.get("merchantId", ""),
            "amount": payment.amount * _RIAL_PER_TOMAN,
            "authority": payment.authority,
        }
        try:
            response = requests.post(_VERIFY_URL[self.is_sandbox], json=payload, timeout=15)
            body = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise PaymentProviderError("ارتباط با زرین‌پال برای تأیید پرداخت برقرار نشد.") from exc

        data = body.get("data") or {}
        success = data.get("code") in _VERIFY_SUCCESS_CODES
        return PaymentVerifyResult(success=success, ref_id=str(data.get("ref_id", "")), raw_response=body)
