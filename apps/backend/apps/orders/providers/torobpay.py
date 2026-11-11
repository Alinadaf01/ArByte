import base64

import requests

from .base import PaymentProvider, PaymentProviderError, PaymentRequestResult, PaymentVerifyResult

# NOTE: same caveat as snapppay.py/digipay.py — این پیاده‌سازی از مستندات
# عمومی/غیررسمی ترب‌پی (یکپارچه‌سازی لاراول/ووکامرس) نوشته شده، نه مستند
# رسمی پذیرندگان ترب‌پی. قبل از فعال‌کردن ApiCredential این سرویس، نام
# فیلدها و URLها را با مستند رسمی/پشتیبانی ترب‌پی و کلیدهای sandbox واقعی
# تطبیق بده.
_RIAL_PER_TOMAN = 10
_BASE_URL = "https://integration.torob.com"
_TOKEN_URL = f"{_BASE_URL}/api/online/v1/oauth/token"
_PAYMENT_URL = f"{_BASE_URL}/api/online/payment/v1/token"
_VERIFY_URL = f"{_BASE_URL}/api/online/payment/v1/verify"
_SETTLE_URL = f"{_BASE_URL}/api/online/payment/v1/settle"


class TorobPayProvider(PaymentProvider):
    code = "TOROBPAY"
    service = "torobpay"
    display_name = "ترب‌پی"

    def _get_token(self) -> str:
        client_id = self.credentials.get("clientId", "")
        client_secret = self.credentials.get("clientSecret", "")
        basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
        payload = {
            "username": self.credentials.get("username", ""),
            "password": self.credentials.get("password", ""),
        }
        try:
            response = requests.post(
                _TOKEN_URL, data=payload, headers={"Authorization": f"Basic {basic}"}, timeout=15
            )
            body = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise PaymentProviderError("ارتباط با ترب‌پی برای دریافت توکن برقرار نشد.") from exc
        token = body.get("access_token")
        if not token:
            raise PaymentProviderError("دریافت توکن ترب‌پی ناموفق بود.")
        return token

    def request(self, order, callback_url: str) -> PaymentRequestResult:
        token = self._get_token()
        payload = {
            "amount": order.final_total * _RIAL_PER_TOMAN,
            "paymentMethodTypeDto": "ONLINE_CREDIT",
            "returnURL": callback_url,
            "transactionId": order.order_number,
            "cartList": [{"cartId": order.order_number, "cartItems": []}],
        }
        try:
            response = requests.post(
                _PAYMENT_URL, json=payload, headers={"Authorization": f"Bearer {token}"}, timeout=15
            )
            body = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise PaymentProviderError("ارتباط با ترب‌پی برقرار نشد.") from exc

        payment_token = body.get("paymentToken")
        pay_url = body.get("paymentPageUrl")
        if not payment_token or not pay_url:
            raise PaymentProviderError(body.get("message") or "درخواست پرداخت ترب‌پی رد شد.")

        return PaymentRequestResult(redirect_url=pay_url, authority=payment_token)

    def verify(self, callback_data: dict, payment) -> PaymentVerifyResult:
        token = self._get_token()
        payload = {"paymentToken": payment.provider_ref}
        try:
            response = requests.post(
                _VERIFY_URL, json=payload, headers={"Authorization": f"Bearer {token}"}, timeout=15
            )
            body = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise PaymentProviderError("ارتباط با ترب‌پی برای تأیید پرداخت برقرار نشد.") from exc

        success = bool(body.get("success")) or str(body.get("status", "")).upper() == "SUCCESS"
        if success:
            # تسویه — اگر ناموفق باشد پرداخت همچنان تأییدشده می‌ماند (settle
            # عملیات مالی جداگانه‌ی پذیرنده است، نه شرط موفقیت verify).
            try:
                requests.post(
                    _SETTLE_URL, json=payload, headers={"Authorization": f"Bearer {token}"}, timeout=15
                )
            except requests.RequestException:
                pass

        return PaymentVerifyResult(success=success, ref_id=str(payment.provider_ref), raw_response=body)
