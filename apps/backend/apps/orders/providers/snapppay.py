import requests

from .base import PaymentProvider, PaymentProviderError, PaymentRequestResult, PaymentVerifyResult

# NOTE: SnapPay's public API contract is less commonly documented than
# Zarinpal/IDPay's and this business hasn't been onboarded with them yet.
# This follows their published token -> create-payment -> verify shape, but
# confirm exact field names, auth header format, and base URLs against
# SnapPay's current merchant docs (and get real sandbox credentials from
# them) before ever flipping this ApiCredential row to isActive=True.
_RIAL_PER_TOMAN = 10
_TOKEN_URL = "https://api.snapppay.ir/api/v1/token"
_REQUEST_URL = "https://api.snapppay.ir/api/online/payment/v1/create"
_VERIFY_URL = "https://api.snapppay.ir/api/online/payment/v1/verify"


class SnapPayProvider(PaymentProvider):
    code = "SNAPPPAY"
    service = "snapppay"
    display_name = "اسنپ‌پی"

    def _get_token(self) -> str:
        payload = {
            "grant_type": "password",
            "client_id": self.credentials.get("clientId", ""),
            "client_secret": self.credentials.get("clientSecret", ""),
            "username": self.credentials.get("username", ""),
            "password": self.credentials.get("password", ""),
        }
        try:
            response = requests.post(_TOKEN_URL, json=payload, timeout=15)
            body = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise PaymentProviderError("ارتباط با اسنپ‌پی برای دریافت توکن برقرار نشد.") from exc
        token = body.get("access_token")
        if not token:
            raise PaymentProviderError("دریافت توکن اسنپ‌پی ناموفق بود.")
        return token

    def request(self, order, callback_url: str) -> PaymentRequestResult:
        token = self._get_token()
        payload = {
            "amount": order.total * _RIAL_PER_TOMAN,
            "returnURL": callback_url,
            "externalSourceAmount": order.total * _RIAL_PER_TOMAN,
            "orderId": order.number,
        }
        try:
            response = requests.post(
                _REQUEST_URL, json=payload, headers={"Authorization": f"Bearer {token}"}, timeout=15
            )
            body = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise PaymentProviderError("ارتباط با اسنپ‌پی برقرار نشد.") from exc

        payment_url = body.get("response", {}).get("paymentUrl") if isinstance(body.get("response"), dict) else None
        payment_token = body.get("response", {}).get("paymentToken") if isinstance(body.get("response"), dict) else None
        if not payment_url or not payment_token:
            raise PaymentProviderError(body.get("errorData", {}).get("message") or "درخواست پرداخت اسنپ‌پی رد شد.")

        return PaymentRequestResult(redirect_url=payment_url, authority=payment_token)

    def verify(self, callback_data: dict, payment) -> PaymentVerifyResult:
        if str(callback_data.get("status", "")).upper() not in {"OK", "SUCCESS", "1"}:
            return PaymentVerifyResult(success=False, ref_id="", raw_response=callback_data)

        token = self._get_token()
        payload = {"paymentToken": payment.authority}
        try:
            response = requests.post(
                _VERIFY_URL, json=payload, headers={"Authorization": f"Bearer {token}"}, timeout=15
            )
            body = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise PaymentProviderError("ارتباط با اسنپ‌پی برای تأیید پرداخت برقرار نشد.") from exc

        success = bool(body.get("successful"))
        ref_id = str(body.get("response", {}).get("transactionId", "")) if isinstance(body.get("response"), dict) else ""
        return PaymentVerifyResult(success=success, ref_id=ref_id, raw_response=body)
