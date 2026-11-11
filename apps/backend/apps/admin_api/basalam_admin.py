"""درخواست مدیر — بستر حضور در باسلام: فعلاً فقط وضعیت اتصال (اعتبارنامه‌ی
Salam API تنظیم شده یا نه) + خروجی محصولات به شکل مناسب باسلام (JSON برای
یکپارچه‌سازی زنده‌ی آینده، اکسل برای استفاده‌ی دستی همین الان). ارسال
خودکار محصول به باسلام (POST /v1/vendors/{id}/products) نیاز به اعتبارنامه
واقعی (clientId/clientSecret/vendorId) و آپلود جدای عکس دارد که تا آن‌موقع
این‌جا پیاده نمی‌شود — دقیقاً همان احتیاط ترب‌پی/بله‌پی."""

from django.http import JsonResponse
from openpyxl import Workbook
from rest_framework.views import APIView

from apps.settings.models import ApiCredential

from .permissions import require_section


class AdminBasalamStatusView(APIView):
    permission_classes = [require_section("basalam")]

    def get(self, request):
        from apps.basalam.feed import build_items

        credential = ApiCredential.objects.filter(service="basalam").order_by("-is_active").first()
        return JsonResponse(
            {
                "enabled": bool(credential and credential.is_active and credential.has_valid_credentials()),
                "keyConfigured": bool(credential and credential.has_valid_credentials()),
                "itemCount": len(build_items()),
            }
        )


class AdminBasalamProductsExportView(APIView):
    """?format=json یا ?format=xlsx (پیش‌فرض xlsx — برای استفاده‌ی همین‌الانِ ادمین)."""

    permission_classes = [require_section("basalam")]

    def get(self, request):
        from apps.basalam.feed import build_items
        from apps.documents.responses import xlsx_filename, xlsx_response

        items = build_items()
        if request.query_params.get("format") == "json":
            return JsonResponse({"success": True, "products": items, "total_items": len(items)})

        wb = Workbook()
        ws = wb.active
        ws.title = "باسلام"
        headers = ["sku", "name", "brief", "description", "primary_price", "stock", "brand", "image_url", "is_available"]
        ws.append(headers)
        for item in items:
            ws.append([item.get(h, "") for h in headers])
        return xlsx_response(wb, xlsx_filename("basalam-products"))
