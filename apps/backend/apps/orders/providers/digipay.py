import requests

from .base import PaymentProvider, PaymentProviderError, PaymentRequestResult, PaymentVerifyResult

# NOTE: same caveat as snapppay.py — DigiPay's contract (an OAuth-token
# purchase/ticket flow) isn't independently verified against their current
# merchant docs. Confirm field names and get real sandbox credentials from
# DigiPay before flipping this ApiCredential row to isActive=True.
_RIAL_PER_TOMAN = 10
_TOKEN_URL = "https://api.mydigipay.com/digipay/api/oauth/token"
_TICKET_URL = "https://api.mydigipay.com/digipay/api/purchases"
_VERIFY_URL = "https://api.mydigipay.com/digipay/api/purchases/verify"


class DigiPayProvider(PaymentProvider):
    code = "DIGIPAY"
    service = "digipay"
    display_name = "دیجی‌پی"

    def _get_token(self) -> str:
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.credentials.get("clientId", ""),
            "client_secret": self.credentials.get("clientSecret", ""),
        }
        try:
            response = requests.post(_TOKEN_URL, data=payload, timeout=15)
            body = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise PaymentProviderError("ارتباط با دیجی‌پی برای دریافت توکن برقرار نشد.") from exc
        token = body.get("access_token")
        if not token:
            raise PaymentProviderError("دریافت توکن دیجی‌پی ناموفق بود.")
        return token

    def request(self, order, callback_url: str) -> PaymentRequestResult:
        token = self._get_token()
        payload = {
            "amount": order.total * _RIAL_PER_TOMAN,
            "providerId": order.number,
            "redirectUrl": callback_url,
        }
        try:
            response = requests.post(
                _TICKET_URL, json=payload, headers={"Authorization": f"Bearer {token}"}, timeout=15
            )
            body = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise PaymentProviderError("ارتباط با دیجی‌پی برقرار نشد.") from exc

        ticket = body.get("ticket")
        redirect_url = body.get("redirectUrl")
        if not ticket or not redirect_url:
            raise PaymentProviderError(body.get("message") or "درخواست پرداخت دیجی‌پی رد شد.")

        return PaymentRequestResult(redirect_url=redirect_url, authority=ticket)

    def verify(self, callback_data: dict, payment) -> PaymentVerifyResult:
        if str(callback_data.get("status", "")).lower() not in {"success", "ok", "1"}:
            return PaymentVerifyResult(success=False, ref_id="", raw_response=callback_data)

        token = self._get_token()
        payload = {"ticket": payment.authority}
        try:
            response = requests.post(
                _VERIFY_URL, json=payload, headers={"Authorization": f"Bearer {token}"}, timeout=15
            )
            body = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise PaymentProviderError("ارتباط با دیجی‌پی برای تأیید پرداخت برقرار نشد.") from exc

        success = str(body.get("result", "")).lower() in {"success", "ok"}
        ref_id = str(body.get("trackingCode", ""))
        return PaymentVerifyResult(success=success, ref_id=ref_id, raw_response=body)
