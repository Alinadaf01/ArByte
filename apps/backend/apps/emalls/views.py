"""`GET/POST /api/emalls/list` — راهنمای ایجاد صفحه معرفی محصولات به ایمالز
(سند کاربر). بدون احراز هویت (سند صراحتاً چیزی نخواسته)، pagination با
query/body `page` و `item_per_page`."""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from . import feed


@csrf_exempt
def product_list(request):
    params = request.POST if request.method == "POST" else request.GET
    page, item_per_page = feed.parse_pagination(params)
    data = feed.run(page, item_per_page)
    response = JsonResponse(data, json_dumps_params={"ensure_ascii": False})
    response["Cache-Control"] = "no-store"
    return response
