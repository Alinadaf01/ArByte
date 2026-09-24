"""Shared helper for serializers that expose an uploaded ImageField.

The frontend and backend run on different origins (two ports in dev, two
domains in production), so a bare `image.url` (e.g. "/media/blog/x.jpg")
resolves against the *frontend's* origin in the browser and 404s. DRF's own
`ImageField` serializer field already absolutizes automatically when
`context["request"]` is present, but every image here goes through a
`SerializerMethodField` instead (each has fallback logic to an
`external_*` static path), so that automatic behavior never kicks in —
this fills the same role by hand.

Only call this on an actual uploaded ImageField/FileField. Never call it on
an `external_*` value — those are static assets served by the *frontend*
(paths like "/images/marketing/hero.jpg"), and prefixing them with the
backend's origin would break them the same way the bug this fixes did.
"""

from django.db.models.fields.files import FieldFile
from rest_framework.request import Request


def absolute_media_url(request: Request | None, image_field: FieldFile) -> str:
    if not image_field:
        return ""
    url = image_field.url
    return request.build_absolute_uri(url) if request is not None else url
