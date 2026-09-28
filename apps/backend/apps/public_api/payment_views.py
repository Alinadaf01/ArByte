"""D-05 §۳ — packages/contracts/src/payment/index.ts: شروع پرداخت درگاهی،
وب‌هوک تأیید (تنها مرجع تأیید واقعی)، بازگشت مرورگر (فقط UX، هرگز تأیید)."""

from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.orders import services as order_services
from apps.orders.models import Order
from apps.orders.services import CheckoutError

from .envelope import PublicAPIView, success_response
from .errors import not_found, validation_error
from .impersonation import assert_not_impersonating
from .order_views import _checkout_error_to_api_error


class PaymentInitiateView(PublicAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_number):
        assert_not_impersonating(request)
        order = Order.objects.filter(order_number=order_number, user=request.user).first()
        if not order:
            raise not_found("سفارش پیدا نشد.")

        provider_code = "BALEPAY"
        try:
            payment, redirect_url = order_services.initiate_payment(order=order, provider_code=provider_code)
        except CheckoutError as exc:
            raise _checkout_error_to_api_error(exc) from None

        data = {"redirectUrl": redirect_url, "providerRef": payment.provider_ref or ""}
        return Response(success_response(data, request.request_id))


class PaymentCallbackView(PublicAPIView):
    """وب‌هوک درگاه — بدون کاربر (خودِ درگاه صدا می‌زند)، اما تنها جایی که
    پرداخت واقعاً تأیید می‌شود. Idempotent روی providerRef (services.verify_payment)."""

    permission_classes = [AllowAny]

    def post(self, request, provider):
        provider_ref = request.data.get("provider_ref")
        amount = request.data.get("amount")
        if not provider_ref or amount is None:
            raise validation_error({"providerRef": "providerRef و amount الزامی‌اند."})
        try:
            amount = int(amount)
        except (TypeError, ValueError):
            raise validation_error({"amount": "amount باید عدد صحیح باشد."}) from None

        try:
            order_services.verify_payment(
                provider_code=provider.upper(), provider_ref=provider_ref, amount=amount,
                callback_data=request.data,
            )
        except CheckoutError as exc:
            raise _checkout_error_to_api_error(exc) from None

        return Response(success_response({"received": True}, request.request_id))


class PaymentReturnView(PublicAPIView):
    """بازگشت مرورگر کاربر — هرگز پرداخت را تأیید نمی‌کند (کاربر می‌تواند
    URL را دستکاری کند)، فقط pendingVerification برای UX «در حال بررسی...»."""

    permission_classes = [AllowAny]

    def get(self, request, provider):
        provider_ref = request.query_params.get("providerRef")
        if not provider_ref:
            raise validation_error({"providerRef": "providerRef الزامی است."})

        from apps.orders.models import Payment

        payment = Payment.objects.filter(gateway=provider.upper(), provider_ref=provider_ref).select_related("order").first()
        if not payment:
            raise not_found("تراکنش پیدا نشد.")

        data = {"orderNumber": payment.order.order_number, "pendingVerification": payment.status != "CONFIRMED"}
        return Response(success_response(data, request.request_id))
