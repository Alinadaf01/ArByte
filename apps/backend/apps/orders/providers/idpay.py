import requests

from .base import PaymentProvider, PaymentProviderError, PaymentRequestResult, PaymentVerifyResult

_RIAL_PER_TOMAN = 10
_REQUEST_URL = "https://api.idpay.ir/v1.1/payment"
_VERIFY_URL = "https://api.idpay.ir/v1.1/payment/verify"

# 100 = fresh success, 101 = already verified (duplicate/retried callback).
_VERIFY_SUCCESS_STATUSES = {100, 101}


class IdPayProvider(PaymentProvider):
    code = "IDPAY"
    service = "idpay"
    display_name = "آیدی‌پی"

    def _headers(self) -> dict:
        return {
            "X-API-KEY": self.credentials.get("apiKey", ""),
            "X-SANDBOX": "1" if self.is_sandbox else "0",
            "Content-Type": "application/json",
        }

    def request(self, order, callback_url: str) -> PaymentRequestResult:
        payload = {
            "order_id": order.number,
            "amount": order.total * _RIAL_PER_TOMAN,
            "callback": callback_url,
        }
        try:
            response = requests.post(_REQUEST_URL, json=payload, headers=self._headers(), timeout=15)
            body = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise PaymentProviderError("ارتباط با آیدی‌پی برقرار نشد.") from exc

        if response.status_code != 201 or "link" not in body:
            raise PaymentProviderError(body.get("error_message") or "درخواست پرداخت آیدی‌پی رد شد.")

        return PaymentRequestResult(redirect_url=body["link"], authority=body["id"])

    def verify(self, callback_data: dict, payment) -> PaymentVerifyResult:
        if str(callback_data.get("status", "")) not in {"10", "100"}:
            # IDPay's callback "status" is the pre-verify state (10 = the
            # user completed payment at the gateway); the real, trustworthy
            # status only comes from the verify call below.
            return PaymentVerifyResult(success=False, ref_id="", raw_response=callback_data)

        payload = {"id": payment.authority, "order_id": payment.order.number}
        try:
            response = requests.post(_VERIFY_URL, json=payload, headers=self._headers(), timeout=15)
            body = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise PaymentProviderError("ارتباط با آیدی‌پی برای تأیید پرداخت برقرار نشد.") from exc

        success = int(body.get("status", 0)) in _VERIFY_SUCCESS_STATUSES
        track_id = str(body.get("track_id", ""))
        return PaymentVerifyResult(success=success, ref_id=track_id, raw_response=body)
