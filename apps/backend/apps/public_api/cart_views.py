"""D-04 §۳ — GET/POST/PATCH/DELETE روی /cart، مهمان (X-Cart-Session) یا
کاربر واردشده (Authorization) — هر دو، بدون مجوز خاص. E-02 §۳ — کوپن و
روش ارسال هم روی همین سبد (نه فقط لحظه‌ی ثبت سفارش)."""

from rest_framework.response import Response

from apps.orders.services import CheckoutError

from . import cart_service
from .envelope import PublicAPIView, success_response
from .order_views import _checkout_error_to_api_error


class CartResponseMixin:
    def _respond(self, request, cart, session_key, *, status=200):
        response = Response(success_response(cart_service.to_cart_response(cart), request.request_id), status=status)
        if session_key:
            response[cart_service.CART_SESSION_HEADER] = session_key
        return response


class CartView(PublicAPIView, CartResponseMixin):
    def get(self, request):
        cart, session_key = cart_service.resolve_cart(request)
        return self._respond(request, cart, session_key)


class CartItemsView(PublicAPIView, CartResponseMixin):
    def post(self, request):
        cart, session_key = cart_service.resolve_cart(request)
        # CamelCaseJSONParser: variantId -> variant_id.
        cart_service.add_item(cart, request.data.get("variant_id"), int(request.data.get("quantity") or 0))
        return self._respond(request, cart, session_key, status=201)


class CartItemDetailView(PublicAPIView, CartResponseMixin):
    def patch(self, request, pk):
        cart, session_key = cart_service.resolve_cart(request)
        cart_service.update_item_quantity(cart, pk, int(request.data.get("quantity") or 0))
        return self._respond(request, cart, session_key)

    def delete(self, request, pk):
        cart, session_key = cart_service.resolve_cart(request)
        cart_service.remove_item(cart, pk)
        return self._respond(request, cart, session_key)


class CartCouponView(PublicAPIView, CartResponseMixin):
    """E-02 §۳ — POST کد را روی سبد اعمال می‌کند (اعتبارسنجی زنده، همان
    validate_coupon چک‌اوت)؛ DELETE بدون بدنه، فقط کوپن فعلی را برمی‌دارد."""

    def post(self, request):
        cart, session_key = cart_service.resolve_cart(request)
        code = request.data.get("code")
        if not code or not str(code).strip():
            from .errors import validation_error

            raise validation_error({"code": "کد تخفیف الزامی است."})
        try:
            cart_service.apply_coupon(cart, str(code).strip())
        except CheckoutError as exc:
            raise _checkout_error_to_api_error(exc) from None
        return self._respond(request, cart, session_key)

    def delete(self, request):
        cart, session_key = cart_service.resolve_cart(request)
        cart_service.remove_coupon(cart)
        return self._respond(request, cart, session_key)


class CartShippingMethodView(PublicAPIView, CartResponseMixin):
    """E-02 §۳ — انتخاب روش ارسال روی سبد؛ در سند تسک با نام مسیر صریح
    نیامده بود («انتخاب روی سبد ذخیره شود» فقط توصیف رفتار بود) — این مسیر
    (`PATCH /cart/shipping-method`) افزوده‌ی لازمِ این تسک است، مستند در
    docs/api/README.md."""

    def patch(self, request):
        cart, session_key = cart_service.resolve_cart(request)
        shipping_method_id = request.data.get("shipping_method_id")
        if not shipping_method_id:
            from .errors import validation_error

            raise validation_error({"shippingMethodId": "شناسه‌ی روش ارسال الزامی است."})
        cart_service.set_shipping_method(cart, shipping_method_id)
        return self._respond(request, cart, session_key)
