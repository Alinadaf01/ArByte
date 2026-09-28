import uuid


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
