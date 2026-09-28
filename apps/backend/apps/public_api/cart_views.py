"""D-04 §۳ — GET/POST/PATCH/DELETE روی /cart، مهمان (X-Cart-Session) یا
کاربر واردشده (Authorization) — هر دو، بدون مجوز خاص."""

from rest_framework.response import Response

from . import cart_service
from .envelope import PublicAPIView, success_response


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
