"""D-05 §۲/۵ — packages/contracts/src/order/index.ts: ثبت سفارش، فهرست/
جزئیات، آپلود رسید، پیگیری مهمان، فاکتور PDF، مرجوعی قلم‌به‌قلم."""

from django.core.paginator import Paginator
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.orders import services as order_services
from apps.orders.models import Order, Return, ReturnItem
from apps.orders.services import CheckoutError, InsufficientStockCheckoutError, PriceChangedError
from apps.users.models import Address

from .envelope import PublicAPIView, paginated_response, success_response
from .errors import ApiError, not_found, validation_error
from .impersonation import assert_not_impersonating
from .validation import _parse_positive_int, parse_mobile

# storeFacts.policies.returnDays (packages/contracts/src/messages/store-facts.ts) — ۷ روز.
RETURN_WINDOW_DAYS = 7


def _order_item_to_dict(item, *, include_units: bool = False) -> dict:
    data = {
        "id": str(item.id),
        "variantId": str(item.variant_id) if item.variant_id else None,
        "productName": item.product_name_snapshot,
        "variantLabel": item.variant_name_snapshot,
        "sku": item.sku_snapshot,
        "unitPrice": item.unit_price,
        "quantity": item.quantity,
        "discount": item.discount,
        "finalPrice": item.final_price,
    }
    if include_units:
        # E-03 §۴ — فقط جزئیات سفارش (مالک سفارش)، نه فهرست/پیگیری مهمان.
        data["units"] = [
            {"serialNumber": u.serial_number, "certificateId": u.certificate_id}
            for u in item.units.all()
        ]
    return data


def _order_to_dict(order: Order, *, include_units: bool = False) -> dict:
    payment = order.payments.order_by("-created_at").first()
    shipment = getattr(order, "shipment", None)
    return {
        "orderNumber": order.order_number,
        "status": order.status,
        "paymentStatus": order.payment_status,
        "items": [_order_item_to_dict(item, include_units=include_units) for item in order.items.all()],
        "shippingAddress": {
            "recipientName": order.shipping_recipient_name,
            "mobile": order.shipping_mobile,
            "province": order.shipping_province,
            "city": order.shipping_city,
            "addressLine": order.shipping_address_line,
            "postalCode": order.shipping_postal_code,
        },
        "subtotal": order.subtotal,
        "discountTotal": order.discount_total,
        "shippingCost": order.shipping_cost,
        "finalTotal": order.final_total,
        "invoice": {
            "type": order.invoice_type,
            "companyName": order.company_name,
            "nationalId": order.national_id,
            "economicCode": order.economic_code,
            "registrationNumber": order.registration_number,
        },
        "payment": (
            {"method": payment.method, "provider": payment.provider, "status": payment.status} if payment else None
        ),
        "shipment": (
            {
                "provider": shipment.provider,
                "trackingNumber": shipment.tracking_number,
                "trackingUrl": shipment.tracking_url,
                "shippedAt": shipment.shipped_at.isoformat() if shipment.shipped_at else None,
                "deliveredAt": shipment.delivered_at.isoformat() if shipment.delivered_at else None,
            }
            if shipment
            else None
        ),
        "createdAt": order.created_at.isoformat(),
    }


def _checkout_error_to_api_error(exc: CheckoutError) -> ApiError:
    status_by_code = {
        "CART_EMPTY": 400,
        "COUPON_INVALID": 400,
        "COUPON_MIN_ORDER_NOT_MET": 400,
        "COUPON_USAGE_LIMIT_REACHED": 400,
        "ORDER_NOT_MODIFIABLE": 409,
        "PAYMENT_ALREADY_CONFIRMED": 409,
        "UPLOAD_TOO_LARGE": 413,
        "UPLOAD_INVALID_TYPE": 415,
        "GATEWAY_ERROR": 502,
        "GATEWAY_AMOUNT_MISMATCH": 409,
        "NOT_FOUND": 404,
    }
    field_errors = {exc.field: exc.message} if exc.field else None
    return ApiError(exc.code, status=status_by_code.get(exc.code, 400), message=exc.message, field_errors=field_errors)


class OrderListCreateView(PublicAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        page = _parse_positive_int(request.query_params.get("page"), "page", default=1)
        per_page = _parse_positive_int(request.query_params.get("perPage"), "perPage", default=20, max_value=100)
        qs = Order.objects.filter(user=request.user).prefetch_related("items", "payments", "shipment").order_by(
            "-created_at"
        )
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        paginator = Paginator(qs, per_page)
        page_obj = paginator.get_page(page)
        return Response(
            paginated_response(
                [_order_to_dict(o) for o in page_obj.object_list],
                request.request_id,
                page=page,
                per_page=per_page,
                total=paginator.count,
            )
        )

    def post(self, request):
        # سفارش جدید عملیات نوشتنی حساس جعل‌هویت است (الحاقیه §۶: orders.create).
        assert_not_impersonating(request)

        address_id = request.data.get("address_id")
        payment_method = request.data.get("payment_method")
        coupon_code = request.data.get("coupon_code") or None
        shipping_method_id = request.data.get("shipping_method_id")
        invoice_type = request.data.get("invoice_type") or "PERSONAL"
        # E-02 §۴ — کلید idempotency از هدر می‌آید نه بدنه (تکرار همان
        # درخواست شبکه، نه فیلد فرم)؛ نبودش یعنی سفارش همیشه تازه ساخته شود.
        idempotency_key = request.headers.get("Idempotency-Key") or None

        if payment_method not in {"MANUAL_CARD_TO_CARD", "GATEWAY"}:
            raise validation_error({"paymentMethod": "روش پرداخت نامعتبر است."})
        if payment_method == "MANUAL_CARD_TO_CARD" and not order_services.card_to_card_enabled():
            raise ApiError("GATEWAY_ERROR", status=409, message="روش کارت‌به‌کارت در حال حاضر فعال نیست.")

        try:
            address = Address.objects.get(pk=address_id, user=request.user)
        except (Address.DoesNotExist, ValueError, TypeError):
            raise not_found("آدرس پیدا نشد.") from None

        try:
            order = order_services.checkout(
                user=request.user,
                address=address,
                payment_method=payment_method,
                shipping_method_id=shipping_method_id,
                coupon_code=coupon_code,
                idempotency_key=idempotency_key,
                invoice_type=invoice_type,
                company_name=request.data.get("company_name") or None,
                national_id=request.data.get("national_id") or None,
                economic_code=request.data.get("economic_code") or None,
                registration_number=request.data.get("registration_number") or None,
            )
        except PriceChangedError as exc:
            raise ApiError(
                "PRICE_CHANGED", status=409,
                field_errors={c["variantId"]: f"قیمت از {c['oldPrice']:,} به {c['newPrice']:,} تغییر کرد." for c in exc.changes},
            ) from None
        except InsufficientStockCheckoutError as exc:
            raise ApiError(
                "INSUFFICIENT_STOCK", status=409,
                field_errors={s["variantId"]: f"فقط {s['available']} عدد موجود است." for s in exc.shortages},
            ) from None
        except CheckoutError as exc:
            raise _checkout_error_to_api_error(exc) from None

        return Response(success_response(_order_to_dict(order), request.request_id), status=201)


class OrderDetailView(PublicAPIView):
    permission_classes = [IsAuthenticated]

    def _get_order(self, request, order_number):
        # مال دیگری = ۴۰۴ نه ۴۰۳ (D-05 §۵) — وجود سفارش برای غریبه فاش نمی‌شود.
        order = Order.objects.filter(order_number=order_number, user=request.user).prefetch_related(
            "items__units", "payments", "shipment"
        ).first()
        if not order:
            raise not_found("سفارش پیدا نشد.")
        return order

    def get(self, request, order_number):
        order = self._get_order(request, order_number)
        return Response(success_response(_order_to_dict(order, include_units=True), request.request_id))


class OrderReceiptUploadView(PublicAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, order_number):
        assert_not_impersonating(request)
        order = Order.objects.filter(order_number=order_number, user=request.user).first()
        if not order:
            raise not_found("سفارش پیدا نشد.")

        file_obj = request.FILES.get("file")
        if not file_obj:
            raise validation_error({"file": "فایل رسید الزامی است."})
        amount = request.data.get("amount")
        try:
            amount = int(amount)
        except (TypeError, ValueError):
            raise validation_error({"amount": "amount باید عدد صحیح باشد."}) from None

        try:
            receipt = order_services.upload_receipt(order=order, user=request.user, file=file_obj, amount=amount)
        except CheckoutError as exc:
            raise _checkout_error_to_api_error(exc) from None

        data = {
            "id": str(receipt.id),
            "fileUrl": f"/api/admin/payments/receipts/{receipt.id}/file/",
            "amount": receipt.amount,
            "status": receipt.status,
            "uploadedAt": receipt.uploaded_at.isoformat(),
        }
        return Response(success_response(data, request.request_id), status=201)


class OrderInvoicePdfView(PublicAPIView):
    permission_classes = [IsAuthenticated]

    _INVOICEABLE = {"PAID", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"}

    def get(self, request, order_number):
        from apps.documents.invoice import get_invoice_pdf
        from apps.documents.responses import pdf_filename, pdf_response

        order = Order.objects.filter(order_number=order_number, user=request.user).first()
        if not order:
            raise not_found("سفارش پیدا نشد.")
        if order.status not in self._INVOICEABLE:
            raise ApiError("ORDER_NOT_MODIFIABLE", status=409, message="فاکتور فقط برای سفارش‌های پرداخت‌شده در دسترس است.")
        pdf_bytes = get_invoice_pdf(order, generated_by_name=request.user.get_full_name() or order.shipping_recipient_name)
        return pdf_response(pdf_bytes, pdf_filename(f"invoice-{order.order_number}"))


class OrderReturnRequestView(PublicAPIView):
    """D-05 §۵ — درخواست مرجوعی قلم‌به‌قلم، فقط سفارش DELIVERED در بازه‌ی
    storeFacts.policies.returnDays (۷ روز، از delivered_at)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, order_number):
        from django.utils import timezone

        assert_not_impersonating(request)
        order = Order.objects.filter(order_number=order_number, user=request.user).prefetch_related("items").first()
        if not order:
            raise not_found("سفارش پیدا نشد.")
        if order.status != "DELIVERED" or not order.delivered_at:
            raise ApiError("RETURN_NOT_ELIGIBLE", status=409)
        if (timezone.now() - order.delivered_at).days > RETURN_WINDOW_DAYS:
            raise ApiError("RETURN_WINDOW_EXPIRED", status=409)

        reason = request.data.get("reason")
        if not reason or not str(reason).strip():
            raise validation_error({"reason": "دلیل مرجوعی الزامی است."})
        items = request.data.get("items")
        if not isinstance(items, list) or not items:
            raise validation_error({"items": "حداقل یک قلم برای مرجوعی لازم است."})

        order_item_by_id = {str(i.id): i for i in order.items.all()}
        validated = []
        for entry in items:
            order_item_id = str(entry.get("order_item_id") or "")
            quantity = entry.get("quantity")
            order_item = order_item_by_id.get(order_item_id)
            if not order_item or not isinstance(quantity, int) or quantity < 1 or quantity > order_item.quantity:
                raise validation_error({"items": "قلم یا تعداد مرجوعی نامعتبر است."})
            validated.append((order_item, quantity))

        return_request = Return.objects.create(order=order, reason=reason, description=request.data.get("description") or "")
        for order_item, quantity in validated:
            ReturnItem.objects.create(return_request=return_request, order_item=order_item, quantity=quantity)

        data = {
            "id": str(return_request.id),
            "orderNumber": order.order_number,
            "status": return_request.status,
            "reason": return_request.reason,
            "createdAt": return_request.created_at.isoformat(),
        }
        return Response(success_response(data, request.request_id), status=201)


class OrderTrackView(PublicAPIView):
    """D-05 §۵ — پیگیری مهمان، عمومی. پاسخ خطا برای «سفارش نیست» و «موبایل
    نمی‌خورد» عمداً یکسان است تا شماره‌ی سفارش قابل حدس‌زدن نباشد."""

    permission_classes = [AllowAny]
    throttle_scope = "order_track"

    def post(self, request):
        order_number = request.data.get("order_number")
        mobile_raw = request.data.get("mobile")
        if not order_number or not mobile_raw:
            raise validation_error({"orderNumber": "شماره سفارش و موبایل الزامی است."})
        mobile = parse_mobile(mobile_raw, "mobile")

        order = Order.objects.filter(order_number=order_number, shipping_mobile=mobile).prefetch_related(
            "items", "payments", "shipment"
        ).first()
        if not order:
            raise not_found("سفارشی با این مشخصات پیدا نشد.")
        return Response(success_response(_order_to_dict(order), request.request_id))
