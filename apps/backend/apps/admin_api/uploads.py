"""F-02 — آپلود تصویر پنل: هر تصویر سمت سرور به WebP تبدیل و در MEDIA
ذخیره می‌شود؛ پاسخ فقط مسیر `/media/...` است که در فیلدهای رشته‌ای مدل‌ها
(Category.image_*، Brand.logo_url، ProductImage.url، HomepageBlock.image_*)
نوشته می‌شود — همان شکل رشته‌ای که D-02 برای این فیلدها انتخاب کرد."""

import io
import uuid

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdminStaff

MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_EDGE_PX = 2400
_FOLDERS = {"products", "categories", "brands", "homepage", "blog"}


def save_image_as_webp(file, folder: str) -> str:
    if file.size > MAX_UPLOAD_BYTES:
        raise ValueError("حجم تصویر بیش از ۸ مگابایت است.")
    try:
        image = Image.open(file)
        image = ImageOps.exif_transpose(image)
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("فایل تصویر معتبر نیست.") from exc
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
    image.thumbnail((MAX_EDGE_PX, MAX_EDGE_PX))
    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=85, method=4)
    path = default_storage.save(f"uploads/{folder}/{uuid.uuid4().hex}.webp", ContentFile(buffer.getvalue()))
    return f"{settings.MEDIA_URL}{path}"


class AdminImageUploadView(APIView):
    """`POST /admin/uploads/` (multipart: `file`, `folder`) → `{url}`."""

    permission_classes = [IsAdminStaff]
    parser_classes = [MultiPartParser]

    def post(self, request):
        folder = request.data.get("folder", "products")
        file = request.FILES.get("file")
        if folder not in _FOLDERS or file is None:
            return Response({"detail": "فایل یا پوشه‌ی نامعتبر."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            url = save_image_as_webp(file, folder)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"url": url}, status=status.HTTP_201_CREATED)
