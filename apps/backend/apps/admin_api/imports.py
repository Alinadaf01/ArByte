"""F-03 §۲ — مسیرهای ورود اکسل پنل. منطق در `apps.catalog.importer`."""

import io

from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog import importer
from apps.catalog.models import ImportJob, SpecificationDefinition
from apps.catalog.tasks import run_import_job
from apps.documents.responses import xlsx_filename, xlsx_response

from .activity import log_admin_action
from .permissions import require_section

PREVIEW_LIMIT = 1000


class AdminImportJobSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    # فهرست جفت‌ها، نه dict — رندرر camelCase کلیدهای dict را عوض می‌کند
    # (supplier_price → supplierPrice) ولی به مقادیر دست نمی‌زند.
    column_mapping = serializers.SerializerMethodField()

    class Meta:
        model = ImportJob
        fields = [
            "id", "original_name", "headers", "column_mapping", "status", "started_at", "completed_at",
            "total_rows", "successful_rows", "failed_rows", "error", "created_by_name", "created_at",
        ]

    def get_id(self, obj) -> str:
        return str(obj.pk)

    def get_column_mapping(self, obj) -> list[dict]:
        return [{"field": field, "header": header} for field, header in (obj.column_mapping or {}).items()]

    def get_created_by_name(self, obj) -> str | None:
        return obj.created_by.get_full_name() if obj.created_by else None


def _fields_payload() -> list[dict]:
    fields = [{"key": key, "label": label} for key, label in importer.FIELDS.items()]
    fields += [{"key": f"{importer.SPEC_PREFIX}{d.key}", "label": f"مشخصه: {d.name_fa}"} for d in SpecificationDefinition.objects.order_by("sort_order")]
    return fields


class AdminImportJobListCreateView(ListAPIView):
    """`GET` تاریخچه؛ `POST` multipart `file` → کار تازه + سرستون‌ها + نگاشت پیشنهادی."""

    permission_classes = [require_section("products", action="create")]
    serializer_class = AdminImportJobSerializer
    queryset = ImportJob.objects.select_related("created_by")
    parser_classes = [MultiPartParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if upload is None or not upload.name.lower().endswith(".xlsx"):
            return Response({"detail": "فایل ‎.xlsx لازم است."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            headers, rows = importer.read_sheet(upload)
        except Exception:
            return Response({"detail": "فایل اکسل قابل خواندن نیست."}, status=status.HTTP_400_BAD_REQUEST)
        if not headers:
            return Response({"detail": "فایل خالی است."}, status=status.HTTP_400_BAD_REQUEST)
        upload.seek(0)
        previous = ImportJob.objects.exclude(column_mapping={}).first()
        job = ImportJob.objects.create(
            file=upload, original_name=importer.safe_filename(upload.name), headers=headers,
            column_mapping=importer.suggest_mapping(headers, previous.column_mapping if previous else None),
            total_rows=len(rows), created_by=request.user,
        )
        data = AdminImportJobSerializer(job).data
        data["fields"] = _fields_payload()
        return Response(data, status=status.HTTP_201_CREATED)


class AdminImportJobDetailView(APIView):
    permission_classes = [require_section("products", action="create")]

    def get(self, request, pk):
        job = get_object_or_404(ImportJob, pk=pk)
        data = AdminImportJobSerializer(job).data
        data["fields"] = _fields_payload()
        data["failed"] = [
            {"row": r.row_number, "sku": r.sku_matched, "error": r.error_message}
            for r in job.rows.filter(status="FAILED")[:200]
        ]
        data["created"] = job.rows.filter(status="SUCCESS", action="create").count()
        data["updated"] = job.rows.filter(status="SUCCESS", action="update").count()
        return Response(data)


class AdminImportPreviewView(APIView):
    """`POST {mapping}` — نگاشت ذخیره و هر ردیف با وضعیت ایجاد/به‌روزرسانی/خطا برگردانده می‌شود؛ هیچ تغییری در کاتالوگ."""

    permission_classes = [require_section("products", action="create")]

    def post(self, request, pk):
        job = get_object_or_404(ImportJob, pk=pk)
        if job.status != "PENDING":
            return Response({"detail": "این فایل قبلاً اجرا شده است."}, status=status.HTTP_400_BAD_REQUEST)
        mapping = {str(p.get("field")): str(p.get("header")) for p in (request.data.get("mapping") or []) if p.get("field") and p.get("header")}
        if "sku" not in mapping:
            return Response({"detail": "ستون SKU باید نگاشت شود."}, status=status.HTTP_400_BAD_REQUEST)
        job.column_mapping = mapping
        job.save(update_fields=["column_mapping"])
        job.file.open("rb")
        headers, rows = importer.read_sheet(io.BytesIO(job.file.read()))
        job.file.close()
        plan = importer.plan_rows(headers, rows, mapping)
        summary = {k: sum(1 for r in plan if r["action"] == k) for k in ("create", "update", "error")}
        return Response({
            "summary": summary,
            "rows": [{"row": r["row"], "sku": r["sku"], "action": r["action"], "errors": r["errors"], "name": r["data"].get("name")} for r in plan[:PREVIEW_LIMIT]],
        })


class AdminImportRunView(APIView):
    permission_classes = [require_section("products", action="create")]

    def post(self, request, pk):
        job = get_object_or_404(ImportJob, pk=pk)
        if job.status != "PENDING" or not job.column_mapping:
            return Response({"detail": "اول پیش‌نمایش را ببینید؛ هر فایل فقط یک بار اجرا می‌شود."}, status=status.HTTP_400_BAD_REQUEST)
        log_admin_action(user=request.user, action="run_import", model_name="ImportJob", object_id=job.pk)
        run_import_job.delay(job.pk)
        job.refresh_from_db()
        return Response(AdminImportJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)


class AdminImportErrorsXlsxView(APIView):
    permission_classes = [require_section("products", action="create")]

    def get(self, request, pk):
        return xlsx_response(importer.errors_workbook(get_object_or_404(ImportJob, pk=pk)), xlsx_filename(f"import-{pk}-errors"))


class AdminImportTemplateView(APIView):
    permission_classes = [require_section("products")]

    def get(self, request):
        return xlsx_response(importer.template_workbook(), xlsx_filename("arbyte-products-template"))
