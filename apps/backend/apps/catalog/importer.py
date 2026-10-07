"""F-03 §۲ — ورود اکسل محصولات.

جریان: آپلود → سرستون‌ها → نگاشت ستون (پیشنهاد از روی نام ستون یا نگاشت
دفعه‌ی قبل) → پیش‌نمایش (`plan_rows`، **هیچ نوشتنی**) → اجرا در Celery
(`execute_job`). کلید تطبیق SKU است: SKU موجود به‌روز می‌شود، SKU تازه
ساخته می‌شود؛ اجرای دوباره‌ی همان فایل تکراری نمی‌سازد. ردیف‌های هم‌«کد
محصول مادر» واریانت‌های یک محصول‌اند.
"""

import io
import re

from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from openpyxl import Workbook, load_workbook

FIELDS: dict[str, str] = {
    "parent_code": "کد محصول مادر",
    "name": "نام محصول",
    "brand": "برند",
    "category": "دسته",
    "condition": "شرایط کالا",
    "grade": "گرید",
    "sku": "SKU",
    "variant_name": "نام واریانت",
    "supplier": "تأمین‌کننده",
    "supplier_price": "قیمت همکار",
    "final_price": "قیمت نهایی",
    "stock": "موجودی",
}
SPEC_PREFIX = "spec:"

_CONDITIONS = {
    "آکبند": "NEW", "new": "NEW", "اپن باکس": "OPEN_BOX", "اپن‌باکس": "OPEN_BOX", "open_box": "OPEN_BOX", "open box": "OPEN_BOX",
    "استوک": "STOCK", "stock": "STOCK", "در حد نو": "LIKE_NEW", "درحدنو": "LIKE_NEW", "like_new": "LIKE_NEW", "like new": "LIKE_NEW",
}
_PERSIAN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٬,", "0123456789  ")


def _cell(value) -> str:
    return "" if value is None else str(value).strip()


def _int(value) -> int | None:
    text = _cell(value).translate(_PERSIAN_DIGITS).replace(" ", "")
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        raise ValueError(f"«{_cell(value)}» عدد نیست.") from None


def read_sheet(file) -> tuple[list[str], list[list]]:
    workbook = load_workbook(file, read_only=True, data_only=True)
    sheet = workbook.worksheets[0]
    rows = list(sheet.iter_rows(values_only=True))
    workbook.close()
    if not rows:
        return [], []
    headers = [_cell(h) for h in rows[0]]
    body = [list(r) for r in rows[1:] if any(_cell(c) for c in r)]
    return headers, body


def suggest_mapping(headers: list[str], previous: dict | None = None) -> dict:
    """{field: header} — اول نگاشت دفعه‌ی قبل (اگر همان سرستون هنوز هست)، بعد تطبیق نام."""
    from .models import SpecificationDefinition

    mapping = {f: h for f, h in (previous or {}).items() if h in headers}
    by_label = {label: field for field, label in FIELDS.items()}
    spec_keys = {d.name_fa: d.key for d in SpecificationDefinition.objects.all()}
    for header in headers:
        if header in mapping.values():
            continue
        if header in by_label and by_label[header] not in mapping:
            mapping[by_label[header]] = header
        elif header in spec_keys:
            mapping[f"{SPEC_PREFIX}{spec_keys[header]}"] = header
    return mapping


def _lookup(model, value: str):
    if not value:
        return None
    return model.objects.filter(deleted_at__isnull=True).filter(name=value).first() or model.objects.filter(
        deleted_at__isnull=True, slug=value
    ).first()


def plan_rows(headers: list[str], rows: list[list], mapping: dict) -> list[dict]:
    """هر ردیف: {row, sku, action: create|update|error, errors, data}. بدون نوشتن."""
    from .models import PRODUCT_GRADE_CHOICES, Brand, Category, ProductVariant, SpecificationDefinition, Supplier

    valid_grades = {code.upper(): code for code, _ in PRODUCT_GRADE_CHOICES}
    index = {h: i for i, h in enumerate(headers)}
    spec_defs = {d.key: d for d in SpecificationDefinition.objects.all()}
    existing_skus = set(ProductVariant.objects.filter(deleted_at__isnull=True).values_list("sku", flat=True))
    seen: dict[str, int] = {}
    plan = []
    for offset, raw in enumerate(rows):
        row_number = offset + 2  # ردیف ۱ سرستون است
        get = lambda field: _cell(raw[index[mapping[field]]]) if field in mapping and mapping[field] in index and index[mapping[field]] < len(raw) else ""  # noqa: E731
        errors: list[str] = []
        data: dict = {"specs": {}}
        sku = get("sku")
        data["sku"] = sku
        if not sku:
            errors.append("SKU خالی است.")
        elif sku in seen:
            errors.append(f"SKU تکراری در فایل (ردیف {seen[sku]}).")
        else:
            seen[sku] = row_number
        action = "update" if sku in existing_skus else "create"
        for field in ("parent_code", "name", "variant_name"):
            data[field] = get(field)
        for field in ("supplier_price", "final_price", "stock"):
            try:
                data[field] = _int(get(field))
            except ValueError as exc:
                errors.append(f"{FIELDS[field]}: {exc}")
                data[field] = None
        if data.get("final_price") is not None and data["final_price"] <= 0:
            errors.append("قیمت نهایی باید مثبت باشد.")
        if data.get("stock") is not None and data["stock"] < 0:
            errors.append("موجودی منفی مجاز نیست.")
        condition_text = get("condition")
        data["condition"] = _CONDITIONS.get(condition_text.lower() if condition_text.isascii() else condition_text) if condition_text else None
        if condition_text and not data["condition"]:
            errors.append(f"شرایط کالای «{condition_text}» شناخته نشد.")
        grade_text = get("grade").strip()
        data["grade"] = valid_grades.get(grade_text.upper()) if grade_text else None
        if grade_text and not data["grade"]:
            errors.append(f"گرید «{grade_text}» شناخته نشد.")
        brand, category = _lookup(Brand, get("brand")), _lookup(Category, get("category"))
        if get("brand") and not brand:
            errors.append(f"برند «{get('brand')}» وجود ندارد.")
        if get("category") and not category:
            errors.append(f"دسته‌ی «{get('category')}» وجود ندارد.")
        data["brand_id"] = brand.pk if brand else None
        data["category_id"] = category.pk if category else None
        supplier_name = get("supplier")
        supplier = Supplier.objects.filter(name=supplier_name).first() if supplier_name else None
        if supplier_name and not supplier:
            errors.append(f"تأمین‌کننده‌ی «{supplier_name}» وجود ندارد.")
        data["supplier_id"] = supplier.pk if supplier else None
        if action == "create":
            if not data["name"]:
                errors.append("برای SKU تازه نام محصول لازم است.")
            if not (brand and category and data["condition"]):
                errors.append("برای SKU تازه برند، دسته و شرایط کالا لازم است.")
            if data.get("final_price") is None and data.get("supplier_price") is None:
                errors.append("قیمت نهایی یا قیمت همکار لازم است.")
        for field, header in mapping.items():
            if field.startswith(SPEC_PREFIX) and header in index:
                key = field[len(SPEC_PREFIX):]
                value = _cell(raw[index[header]]) if index[header] < len(raw) else ""
                if key in spec_defs and value:
                    data["specs"][key] = value
        plan.append({
            "row": row_number, "sku": sku, "action": "error" if errors else action, "errors": errors, "data": data,
            "raw": {h: _cell(raw[i]) if i < len(raw) else "" for h, i in index.items()},
        })
    return plan


def _product_for(row: dict, cache: dict):
    from .models import Product, ProductVariant

    data = row["data"]
    existing = ProductVariant.objects.filter(sku=data["sku"], deleted_at__isnull=True).select_related("product").first()
    parent = data["parent_code"] or data["sku"]
    slug = slugify(parent, allow_unicode=False) or f"p-{slugify(data['sku'])}"
    if existing:
        product = existing.product
    elif parent in cache:
        product = cache[parent]
    else:
        product = Product.objects.filter(slug=slug, deleted_at__isnull=True).first() or Product(slug=slug)
    for field, value in (("name", data["name"]), ("brand_id", data["brand_id"]), ("category_id", data["category_id"]), ("condition", data["condition"]), ("grade", data["grade"])):
        if value:
            setattr(product, field, value)
    product.save()
    cache[parent] = product
    return product, existing


def _apply_row(row: dict, cache: dict, user) -> str:
    from apps.inventory.models import Inventory

    from . import pricing
    from .models import PriceHistory, ProductSpecification, ProductVariant, SpecificationDefinition, SupplierProduct

    data = row["data"]
    product, variant = _product_for(row, cache)
    old_price = variant.final_price if variant else None
    if variant is None:
        variant = ProductVariant(product=product, sku=data["sku"], is_default=not product.variants.filter(is_default=True).exists())
    if data["variant_name"]:
        variant.name = data["variant_name"]
    if data["supplier_price"] is not None:
        variant.supplier_price = data["supplier_price"]
    if data["final_price"] is not None:
        variant.final_price = data["final_price"]
        if not variant.pk:
            variant.price_model = "FIXED"
    elif not variant.pk:
        variant.price_model = "SUPPLIER_PLUS_PROFIT"
        variant.final_price = data["supplier_price"]  # موقت؛ موتور قیمت پایین جایگزین می‌کند
    variant.save()
    if old_price is not None and old_price != variant.final_price:
        PriceHistory.objects.create(variant=variant, previous_price=old_price, new_price=variant.final_price, changed_by=user, reason="ورود اکسل")
    if data["supplier_id"] and data["supplier_price"] is not None:
        SupplierProduct.objects.update_or_create(
            supplier_id=data["supplier_id"], variant=variant, defaults={"price": data["supplier_price"], "is_available": True, "source": "excel"}
        )
    inventory, _ = Inventory.objects.get_or_create(variant=variant)
    if data["stock"] is not None and data["stock"] != inventory.quantity:
        Inventory.objects.adjust(variant, data["stock"] - inventory.quantity, note="ورود اکسل", user=user)
    for key, value in data["specs"].items():
        definition = SpecificationDefinition.objects.get(key=key)
        spec_value = definition.values.filter(value=value).first()
        target = {"variant": variant} if definition.is_variant_axis else {"product": product}
        ProductSpecification.objects.update_or_create(
            definition=definition, **target,
            defaults={"value": spec_value, "custom_value": None if spec_value else value},
        )
    if variant.price_model == "SUPPLIER_PLUS_PROFIT":
        pricing.recalculate_variants([ProductVariant.objects.select_related("product__category__parent").get(pk=variant.pk)], user=user, reason="ورود اکسل")
    return variant.sku


def execute_job(job) -> None:
    from .models import ImportJobRow

    job.status, job.started_at = "PROCESSING", timezone.now()
    job.save(update_fields=["status", "started_at"])
    try:
        job.file.open("rb")
        headers, rows = read_sheet(io.BytesIO(job.file.read()))
        job.file.close()
        plan = plan_rows(headers, rows, job.column_mapping)
        job.rows.all().delete()
        cache: dict = {}
        success = failed = 0
        for row in plan:
            if row["action"] == "error":
                ImportJobRow.objects.create(import_job=job, row_number=row["row"], status="FAILED", sku_matched=row["sku"] or None,
                                            error_message="؛ ".join(row["errors"]), raw_data=row["raw"])
                failed += 1
                continue
            try:
                with transaction.atomic():
                    sku = _apply_row(row, cache, job.created_by)
                ImportJobRow.objects.create(import_job=job, row_number=row["row"], status="SUCCESS", action=row["action"],
                                            sku_matched=sku, raw_data=row["raw"])
                success += 1
            except Exception as exc:  # یک ردیف خراب کل فایل را نمی‌خواباند
                ImportJobRow.objects.create(import_job=job, row_number=row["row"], status="FAILED", sku_matched=row["sku"] or None,
                                            error_message=str(exc), raw_data=row["raw"])
                failed += 1
        job.total_rows, job.successful_rows, job.failed_rows = len(plan), success, failed
        job.status = "COMPLETED"
    except Exception as exc:
        job.status, job.error = "FAILED", str(exc)
    job.completed_at = timezone.now()
    job.save()


def template_workbook() -> Workbook:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "محصولات"
    sheet.sheet_view.rightToLeft = True
    sheet.append(list(FIELDS.values()))
    guide = workbook.create_sheet("راهنما")
    guide.sheet_view.rightToLeft = True
    for line in [
        "هر ردیف یک واریانت است؛ ردیف‌های با «کد محصول مادر» یکسان، واریانت‌های یک محصول می‌شوند.",
        "SKU کلید تطبیق است: SKU موجود به‌روز می‌شود، SKU تازه ساخته می‌شود. اجرای دوباره تکراری نمی‌سازد.",
        "برند، دسته و تأمین‌کننده باید از قبل در پنل تعریف شده باشند (نام یا slug).",
        "شرایط کالا: آکبند، اپن باکس، استوک، در حد نو.",
        "گرید اختیاری است؛ مقادیر مجاز: A، A+، A++، A+++، B، B+، OPENBOX، KY.PEN.A، KY.PEN.A+، BOX، A++BOX.",
        "قیمت نهایی خالی و قیمت همکار پر = قیمت با قانون سود حساب می‌شود.",
        "برای مشخصات، ستونی با نام فارسی همان مشخصه اضافه کنید و در نگاشت انتخابش کنید.",
    ]:
        guide.append([line])
    return workbook


def errors_workbook(job) -> Workbook:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "ردیف‌های خطادار"
    sheet.sheet_view.rightToLeft = True
    failed = list(job.rows.filter(status="FAILED"))
    headers = list(job.headers)
    sheet.append(["ردیف", "خطا", *headers])
    for row in failed:
        raw = row.raw_data or {}
        sheet.append([row.row_number, row.error_message, *[raw.get(h, "") for h in headers]])
    return workbook


_SAFE_NAME = re.compile(r"[^\w.\-]+")


def safe_filename(name: str) -> str:
    return _SAFE_NAME.sub("_", name)[:120] or "import.xlsx"
