import io

from django.http import HttpResponse
from django.utils import timezone
from openpyxl import Workbook


def pdf_filename(base: str) -> str:
    """ISO date in the filename, Jalali date inside the document itself —
    BACKEND-TASK.md §3.6: 'تاریخ شمسی در سند، ISO در نام فایل'."""
    return f"{base}-{timezone.localdate().isoformat()}.pdf"


def pdf_response(pdf_bytes: bytes, filename: str) -> HttpResponse:
    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def xlsx_filename(base: str) -> str:
    return f"{base}-{timezone.localdate().isoformat()}.xlsx"


def xlsx_response(workbook: Workbook, filename: str) -> HttpResponse:
    buffer = io.BytesIO()
    workbook.save(buffer)
    response = HttpResponse(
        buffer.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
