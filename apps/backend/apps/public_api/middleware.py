import hashlib
import re
import uuid

from django.http import HttpResponseNotModified
from django.utils.cache import patch_vary_headers


class RequestIdMiddleware:
    """D-03 §2 — mirrors apps/api/src/common/middleware/request-id.middleware.ts:
    every request gets a request_id, exposed both as `request.request_id`
    (for the success/error envelope) and the `X-Request-Id` response header.
    Global (not scoped to /api/v1/) — harmless for /api/admin/, which simply
    ignores request.request_id."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.request_id = f"req_{uuid.uuid4().hex}"
        response = self.get_response(request)
        response["X-Request-Id"] = request.request_id
        return response


_CACHEABLE_PREFIXES = (
    "/api/v1/catalog/",
    "/api/v1/content/",
    "/api/v1/blog",
    "/api/v1/seo/",
    "/api/v1/shipping-methods",
)
_REQUEST_ID_RE = re.compile(rb'"requestId":\s*"req_[0-9a-f]+"')


class PublicCacheMiddleware:
    """G-02 — کش HTTP برای GETهای عمومی مهمان (`Cache-Control` + `ETag`).

    ETag از بدنه بدون `requestId` (که در هر پاسخ تصادفی است) ساخته می‌شود تا
    پاسخ یکسان واقعاً 304 بگیرد. درخواست دارای Authorization (نظرات با وضعیت
    viewer، حساب، سبد) کش عمومی نمی‌گیرد."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        path = request.path
        if not path.startswith("/api/v1/"):
            return response
        cacheable = (
            request.method in ("GET", "HEAD")
            and response.status_code == 200
            and path.startswith(_CACHEABLE_PREFIXES)
            and "HTTP_AUTHORIZATION" not in request.META
            and not getattr(response, "streaming", False)
        )
        if not cacheable:
            response.setdefault("Cache-Control", "private, no-store")
            return response
        etag = '"' + hashlib.md5(_REQUEST_ID_RE.sub(b"", response.content), usedforsecurity=False).hexdigest() + '"'
        cache_control = "public, max-age=60, stale-while-revalidate=300"
        patch_vary_headers(response, ["Authorization"])
        if etag in [t.strip() for t in request.META.get("HTTP_IF_NONE_MATCH", "").split(",")]:
            not_modified = HttpResponseNotModified()
            not_modified["ETag"] = etag
            not_modified["Cache-Control"] = cache_control
            not_modified["Vary"] = response["Vary"]
            return not_modified
        response["ETag"] = etag
        response["Cache-Control"] = cache_control
        return response
