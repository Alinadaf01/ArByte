"""D-04 §۲ — packages/contracts/src/account/index.ts: پروفایل، آدرس‌ها،
علاقه‌مندی (+ merge). فیلدهای ادرس مدل (province/city/line/postalCode/
receiverName/receiverPhone) با نام‌های قرارداد (province/city/addressLine/
postalCode/recipientName/mobile) عمداً متفاوتند — نگاشت صریح این‌جاست."""

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.catalog.models import Product, ProductVariant
from apps.content.models import Favorite
from apps.users.models import Address

from .envelope import PublicAPIView, success_response
from .errors import ApiError, not_found
from .impersonation import assert_not_impersonating
from .jwt_tokens import to_auth_user
from .validation import parse_mobile, parse_non_empty_string, parse_postal_code


def _profile_to_dict(user) -> dict:
    # E-05 §۳ — «عضو از» (Account.dc.html)؛ apps.users.models.User از
    # AbstractBaseUser است، `created_at` دارد نه `date_joined` استاندارد
    # جنگو. فقط اینجا اضافه می‌شود (نه to_auth_user مشترک با پاسخ ورود)
    # چون فقط UI حساب کاربری به آن نیاز دارد.
    return {**to_auth_user(user), "memberSince": user.created_at.isoformat()}


def _address_to_dict(address: Address) -> dict:
    return {
        "id": str(address.id),
        "recipientName": address.receiver_name,
        "mobile": address.receiver_phone,
        "province": address.province,
        "city": address.city,
        "addressLine": address.line,
        "postalCode": address.postal_code or None,
        "isDefault": address.is_default,
    }


def _parse_address_body(data: dict, *, partial: bool) -> dict:
    # CamelCaseJSONParser بدنه‌ی ورودی را قبل از رسیدن به اینجا snake_case
    # کرده (config/settings.py) — recipientName -> recipient_name و غیره؛
    # پیام‌های fieldErrors خروجی همچنان camelCase قرارداد را نگه می‌دارند.
    fields: dict = {}

    if not partial or "recipient_name" in data:
        fields["receiver_name"] = parse_non_empty_string(
            data.get("recipient_name"), "recipientName", max_length=100
        )
    if not partial or "mobile" in data:
        fields["receiver_phone"] = parse_mobile(data.get("mobile"), "mobile")
    if not partial or "province" in data:
        fields["province"] = parse_non_empty_string(data.get("province"), "province")
    if not partial or "city" in data:
        fields["city"] = parse_non_empty_string(data.get("city"), "city")
    if not partial or "address_line" in data:
        fields["line"] = parse_non_empty_string(data.get("address_line"), "addressLine", max_length=500)
    if "postal_code" in data and data["postal_code"]:
        fields["postal_code"] = parse_postal_code(data.get("postal_code"), "postalCode")
    elif not partial:
        fields["postal_code"] = ""
    if "is_default" in data:
        fields["is_default"] = bool(data["is_default"])
    return fields


class ProfileView(PublicAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(success_response(_profile_to_dict(request.user), request.request_id))

    def patch(self, request):
        assert_not_impersonating(request)
        user = request.user
        update_fields = []
        if "first_name" in request.data:
            user.first_name = parse_non_empty_string(request.data.get("first_name"), "firstName", max_length=100)
            update_fields.append("first_name")
        if "last_name" in request.data:
            user.last_name = parse_non_empty_string(request.data.get("last_name"), "lastName", max_length=100)
            update_fields.append("last_name")
        if update_fields:
            user.save(update_fields=update_fields)
        return Response(success_response(_profile_to_dict(user), request.request_id))


class AddressListCreateView(PublicAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        addresses = Address.objects.filter(user=request.user)
        return Response(success_response([_address_to_dict(a) for a in addresses], request.request_id))

    def post(self, request):
        assert_not_impersonating(request)
        fields = _parse_address_body(request.data, partial=False)
        address = Address.objects.create(user=request.user, **fields)
        return Response(success_response(_address_to_dict(address), request.request_id), status=201)


class AddressDetailView(PublicAPIView):
    permission_classes = [IsAuthenticated]

    def _get_address(self, request, pk):
        try:
            return Address.objects.get(pk=pk, user=request.user)
        except (Address.DoesNotExist, ValueError, TypeError):
            raise not_found("آدرس پیدا نشد.") from None

    def patch(self, request, pk):
        assert_not_impersonating(request)
        address = self._get_address(request, pk)
        fields = _parse_address_body(request.data, partial=True)
        for key, value in fields.items():
            setattr(address, key, value)
        address.save()
        return Response(success_response(_address_to_dict(address), request.request_id))

    def delete(self, request, pk):
        assert_not_impersonating(request)
        address = self._get_address(request, pk)
        address.delete()
        return Response(success_response({}, request.request_id))


def _favorite_to_dict(favorite: Favorite) -> dict:
    product = favorite.product
    primary_image = product.images.filter(is_primary=True).first() or product.images.order_by("sort_order").first()
    return {
        "id": str(favorite.id),
        "product": {
            "id": str(product.id),
            "slug": product.slug,
            "name": product.name,
            "image": primary_image.url if primary_image else None,
        },
        "variantId": str(favorite.variant_id) if favorite.variant_id else None,
        "priceAtSave": favorite.price_at_save,
        "createdAt": favorite.created_at.isoformat(),
    }


class WishlistListCreateView(PublicAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        favorites = Favorite.objects.filter(user=request.user).select_related("product").prefetch_related(
            "product__images"
        )
        return Response(success_response([_favorite_to_dict(f) for f in favorites], request.request_id))

    def post(self, request):
        # CamelCaseJSONParser: productId -> product_id, variantId -> variant_id.
        product_id = request.data.get("product_id")
        try:
            product = Product.objects.get(pk=product_id, deleted_at__isnull=True)
        except (Product.DoesNotExist, ValueError, TypeError):
            raise not_found("محصول پیدا نشد.") from None

        variant = None
        variant_id = request.data.get("variant_id")
        if variant_id:
            try:
                variant = ProductVariant.objects.get(pk=variant_id, product=product, deleted_at__isnull=True)
            except (ProductVariant.DoesNotExist, ValueError, TypeError):
                raise ApiError("VARIANT_NOT_FOUND", status=404) from None

        price_at_save = (variant or product.default_variant).final_price if (variant or product.default_variant) else None
        favorite, _ = Favorite.objects.update_or_create(
            user=request.user, product=product, defaults={"variant": variant, "price_at_save": price_at_save}
        )
        return Response(success_response(_favorite_to_dict(favorite), request.request_id), status=201)


class WishlistDetailView(PublicAPIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        Favorite.objects.filter(pk=pk, user=request.user).delete()
        return Response(success_response({}, request.request_id))


class DeviceListView(PublicAPIView):
    """E-05 §۳ — «دستگاه‌های من»: یک ردیف به ازای هر `OrderItemUnit` از
    سفارش‌های DELIVERED کاربر. تاریخ‌های مهلت‌تست/گارانتی از همان منطق
    E-04's کارت گارانتی (`build_warranty_card`) می‌آیند — یک منبع محاسبه،
    نه تکرار قواعد تاریخ در دو جا."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.documents.warranty_card import build_warranty_card
        from apps.orders.models import OrderItemUnit

        units = (
            OrderItemUnit.objects.filter(order_item__order__user=request.user, order_item__order__status="DELIVERED")
            .select_related("order_item__order", "order_item__variant__product__brand")
            .order_by("-order_item__order__delivered_at")
        )
        devices = []
        for unit in units:
            card = build_warranty_card(unit)
            devices.append(
                {
                    "orderNumber": card["order_number"],
                    "certificateId": card["certificate_id"],
                    "productName": card["product_name"],
                    "serialNumber": card["serial_number"],
                    "testPeriodEndDate": card["test_period"]["end_label"] if card["test_period"]["known"] else None,
                    "hasWarranty": card["has_warranty"],
                    "warrantyEndDate": card["warranty"]["end_label"] if card["has_warranty"] and card["warranty"]["known"] else None,
                }
            )
        return Response(success_response(devices, request.request_id))


class WishlistMergeView(PublicAPIView):
    """D-04 §۲ — جدید در قرارداد: POST /account/wishlist/merge، برای انتقال
    علاقه‌مندی محلی (localStorage) بعد از ورود. هر آیتم با productSlug
    شناسایی می‌شود (نه id — localStorage قبل از ورود فقط slug دارد)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # CamelCaseJSONParser آرایه‌ی بدنه را هم آیتم‌به‌آیتم snake_case
        # می‌کند: productSlug -> product_slug، variantId -> variant_id،
        # priceAtSave -> price_at_save.
        items = request.data if isinstance(request.data, list) else []
        for item in items:
            slug = item.get("product_slug")
            if not slug:
                continue
            product = Product.objects.filter(slug=slug, deleted_at__isnull=True).first()
            if not product:
                continue

            variant = None
            variant_id = item.get("variant_id")
            if variant_id:
                variant = ProductVariant.objects.filter(pk=variant_id, product=product, deleted_at__isnull=True).first()

            existing = Favorite.objects.filter(user=request.user, product=product).first()
            price_at_save = item.get("price_at_save")
            if existing:
                # آیتمی که از قبل در حساب کاربر بود دست نمی‌خورد — merge یعنی
                # افزودن چیزهای تازه، نه بازنویسی انتخاب‌های قبلی کاربر.
                continue
            Favorite.objects.create(user=request.user, product=product, variant=variant, price_at_save=price_at_save)

        favorites = Favorite.objects.filter(user=request.user).select_related("product").prefetch_related(
            "product__images"
        )
        return Response(success_response([_favorite_to_dict(f) for f in favorites], request.request_id))
