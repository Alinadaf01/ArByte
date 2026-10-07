"""D-02 — catalog rewritten from vybeshop's single-price-per-product shape
onto ArByte's variant-based model. Field-by-field against
apps/api/prisma/schema/02-catalog.prisma and 03-pricing.prisma (PriceHistory)
— same names (snake_case), same constraints, same indexes. Primary keys stay
Django's default integer AutoField rather than Prisma's cuid strings (D-02.md
"شناسه‌ها": vybeshop's admin needs numeric IDs; the public API returns them as
strings in D-03) — the one deliberate "نزدیک‌ترین معادل" deviation from the
Prisma spec file.
"""

from django.core.exceptions import ValidationError
from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField()
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, related_name="children", blank=True, null=True
    )
    description = models.TextField(blank=True, null=True)
    image_main = models.CharField(max_length=500, blank=True, null=True)
    image_banner = models.CharField(max_length=500, blank=True, null=True)
    image_thumbnail = models.CharField(max_length=500, blank=True, null=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "categories"
        constraints = [
            models.UniqueConstraint(
                fields=["slug"], condition=models.Q(deleted_at__isnull=True), name="category_slug_unique_live"
            ),
        ]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["parent"]),
        ]

    def __str__(self):
        return self.name

    def clean(self):
        # Category tree is capped at 2 levels: top-level -> child. No grandchildren.
        if self.parent_id and self.parent.parent_id:
            raise ValidationError("دسته‌بندی حداکثر می‌تواند دو سطح داشته باشد.")


class Brand(models.Model):
    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField()
    logo_url = models.CharField(max_length=500, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["slug"], condition=models.Q(deleted_at__isnull=True), name="brand_slug_unique_live"
            ),
        ]
        indexes = [models.Index(fields=["slug"])]

    def __str__(self):
        return self.name


PRODUCT_CONDITION_CHOICES = [
    ("NEW", "آکبند"),
    ("OPEN_BOX", "اپن‌باکس"),
    ("STOCK", "استوک"),
    ("LIKE_NEW", "درحدنو"),
]

PRODUCT_STATUS_CHOICES = [
    ("ACTIVE", "فعال"),
    ("INACTIVE", "غیرفعال"),
]

# درخواست کاربر — کدهای داخلی درجه‌بندی کیفیت کالا (جدا از `condition`؛ یک
# محصول «استوک» می‌تواند درجه‌ی A یا B+ باشد). خودِ کدها همان چیزی‌اند که
# تیم فروش استفاده می‌کند، لیبل جداگانه ندارند.
PRODUCT_GRADE_CHOICES = [
    ("A", "A"),
    ("A+", "A+"),
    ("A++", "A++"),
    ("A+++", "A+++"),
    ("B", "B"),
    ("B+", "B+"),
    ("OPENBOX", "OPENBOX"),
    ("KY.PEN.A", "KY.PEN.A"),
    ("KY.PEN.A+", "KY.PEN.A+"),
    ("BOX", "BOX"),
    ("A++BOX", "A++BOX"),
]


class Product(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField()
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, related_name="products")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    model_number = models.CharField(max_length=100, blank=True, null=True)
    gtin = models.CharField(max_length=50, blank=True, null=True)
    part_number = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    short_description = models.CharField(max_length=160, blank=True, null=True)
    condition = models.CharField(max_length=10, choices=PRODUCT_CONDITION_CHOICES)
    # نوع کالا (آکبند/اپن‌باکس/استوک) از «گرید» جداست — گرید درجه‌ی کیفیت
    # داخلی تیم فروش است (مثلاً استوک درجه A یا B+)؛ هر محصولی لزوماً گرید
    # ندارد (محصول آکبند معمولاً خالی می‌ماند).
    grade = models.CharField(max_length=20, choices=PRODUCT_GRADE_CHOICES, blank=True, null=True)
    status = models.CharField(max_length=10, choices=PRODUCT_STATUS_CHOICES, default="ACTIVE")
    is_visible_on_site = models.BooleanField(default=True)
    is_visible_in_search = models.BooleanField(default=True)
    is_visible_in_category = models.BooleanField(default=True)
    return_policy_note = models.TextField(blank=True, null=True)
    shipping_note = models.TextField(blank=True, null=True)
    priority = models.IntegerField(default=0)

    # E-03 §۳ — گارانتی/سریال حالا قابلیت واقعی است (کارت گارانتی، E-04).
    # null یعنی بدون گارانتی جدا (نه صفر ماه، ادعای غلط)؛ داده‌ی seed عمداً
    # null می‌ماند مگر در fixture تست (بدون عدد ساختگی، سند تسک §۳).
    warranty_months = models.PositiveIntegerField(blank=True, null=True, help_text="مدت گارانتی به ماه؛ خالی = بدون گارانتی جدا")
    warranty_provider = models.CharField(max_length=150, blank=True, null=True, help_text="مثلاً «گارانتی شرکتی»")
    # پیش‌فرض True چون فعلاً تمام پنج دسته‌ی فروشگاه (لپ‌تاپ×۳، سرفیس،
    # کیس گیمینگ) سریال‌دارند — اگر دسته‌ی بدون‌سریال (لوازم جانبی مثلاً)
    # بعداً اضافه شد، همان محصول‌ها دستی False می‌شوند.
    requires_serial = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-priority", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["slug"], condition=models.Q(deleted_at__isnull=True), name="product_slug_unique_live"
            ),
        ]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["category"]),
            models.Index(fields=["brand"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return self.name

    @property
    def default_variant(self) -> "ProductVariant | None":
        return self.variants.filter(is_default=True, deleted_at__isnull=True).first()


PRICE_MODEL_CHOICES = [
    ("FIXED", "ثابت"),
    ("SUPPLIER_PLUS_PROFIT", "قیمت تأمین‌کننده + سود"),
]

PROFIT_TYPE_CHOICES = [
    ("AMOUNT", "مبلغ"),
    ("PERCENT", "درصد"),
]


class ProductVariant(models.Model):
    """§۱ الحاقیه‌ی T-003 — هر Product حداقل یک Variant دارد؛ قیمت/موجودی/SKU
    اینجاست، نه روی Product."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    sku = models.CharField(max_length=50)
    name = models.CharField(max_length=200, blank=True, null=True)
    is_default = models.BooleanField(default=False)
    price_model = models.CharField(max_length=25, choices=PRICE_MODEL_CHOICES, default="FIXED")
    supplier_price = models.BigIntegerField(blank=True, null=True)
    profit_type = models.CharField(max_length=10, choices=PROFIT_TYPE_CHOICES, blank=True, null=True)
    profit_amount_toman = models.BigIntegerField(blank=True, null=True)
    profit_percent_basis_points = models.IntegerField(blank=True, null=True)
    final_price = models.BigIntegerField()
    compare_at_price = models.BigIntegerField(blank=True, null=True)
    is_preorder = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["sku"], condition=models.Q(deleted_at__isnull=True), name="variant_sku_unique_live"
            ),
            models.UniqueConstraint(
                fields=["product"],
                condition=models.Q(is_default=True),
                name="variant_one_default_per_product",
            ),
            # Prisma comment: "یا profit_amount_toman یا profit_percent_basis_points،
            # نه هر دو" — exactly one set, or neither (FIXED-price variants set none).
            models.CheckConstraint(
                check=(
                    models.Q(profit_amount_toman__isnull=True, profit_percent_basis_points__isnull=True)
                    | models.Q(profit_amount_toman__isnull=False, profit_percent_basis_points__isnull=True)
                    | models.Q(profit_amount_toman__isnull=True, profit_percent_basis_points__isnull=False)
                ),
                name="variant_profit_value_shape",
            ),
        ]
        indexes = [
            models.Index(fields=["sku"]),
            models.Index(fields=["product"]),
        ]

    def __str__(self):
        return f"{self.product.name} — {self.name or self.sku}"


SPECIFICATION_TYPE_CHOICES = [
    ("TEXT", "متنی"),
    ("NUMBER", "عددی"),
    ("BOOLEAN", "بله/خیر"),
    ("SELECT", "انتخابی"),
    ("MULTI_SELECT", "چندانتخابی"),
    ("RANGE", "بازه‌ای"),
    ("COLOR", "رنگ"),
    ("DATE", "تاریخ"),
]


class SpecificationDefinition(models.Model):
    key = models.SlugField(max_length=100, unique=True)
    name_fa = models.CharField(max_length=150)
    type = models.CharField(max_length=15, choices=SPECIFICATION_TYPE_CHOICES)
    unit = models.CharField(max_length=20, blank=True, null=True)
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, blank=True, null=True, related_name="specification_definitions"
    )
    is_required = models.BooleanField(default=False)
    is_filterable = models.BooleanField(default=False)
    is_searchable = models.BooleanField(default=False)
    is_variant_axis = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    # AUDIT §۱۲.۴ — «مشخصات کلیدی» کارت/صفحه‌ی محصول به‌صراحت در بک‌اند مرتب
    # می‌شوند (پیش‌فرض: پردازنده، گرافیک، رم). null = جزو مشخصات کلیدی نیست.
    key_spec_order = models.PositiveSmallIntegerField(blank=True, null=True)

    class Meta:
        ordering = ["sort_order", "name_fa"]
        indexes = [models.Index(fields=["category"])]

    def __str__(self):
        return self.name_fa


class SpecificationValue(models.Model):
    definition = models.ForeignKey(SpecificationDefinition, on_delete=models.CASCADE, related_name="values")
    value = models.CharField(max_length=150)
    swatch_hex = models.CharField(max_length=7, blank=True, null=True, help_text="#RRGGBB")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "value"]
        indexes = [models.Index(fields=["definition"])]

    def __str__(self):
        return f"{self.definition.name_fa}: {self.value}"


class ProductSpecification(models.Model):
    """دقیقاً یکی از product/variant پر است — مشخصات مشترک روی Product،
    مشخصات‌محور-واریانت روی ProductVariant."""

    definition = models.ForeignKey(
        SpecificationDefinition, on_delete=models.CASCADE, related_name="product_specifications"
    )
    value = models.ForeignKey(
        SpecificationValue, on_delete=models.SET_NULL, blank=True, null=True, related_name="product_specifications"
    )
    custom_value = models.CharField(max_length=150, blank=True, null=True)
    numeric_value = models.DecimalField(max_digits=14, decimal_places=4, blank=True, null=True)
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, blank=True, null=True, related_name="specifications"
    )
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.CASCADE, blank=True, null=True, related_name="specifications"
    )

    class Meta:
        indexes = [
            models.Index(fields=["definition", "numeric_value"]),
            models.Index(fields=["product"]),
            models.Index(fields=["variant"]),
        ]

    def __str__(self):
        target = self.product or self.variant
        return f"{target} — {self.definition.name_fa}"

    def clean(self):
        if not self.product_id and not self.variant_id:
            raise ValidationError("یکی از product یا variant باید مقدار داشته باشد.")


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    url = models.CharField(max_length=500)
    alt_text = models.CharField(max_length=200, blank=True, null=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ["sort_order"]
        indexes = [models.Index(fields=["product"])]

    def __str__(self):
        return f"{self.product.name} #{self.sort_order}"


class PriceHistory(models.Model):
    """روی واریانت (نه محصول) — apps/api/prisma/schema/03-pricing.prisma."""

    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name="price_history")
    previous_price = models.BigIntegerField()
    new_price = models.BigIntegerField()
    changed_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, blank=True, null=True, related_name="price_changes"
    )
    reason = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "price histories"
        indexes = [models.Index(fields=["variant", "created_at"])]

    def __str__(self):
        return f"{self.variant} — {self.previous_price} -> {self.new_price}"


# ---------------------------------------------------------------------------
# F-03 — تأمین‌کننده، قیمت همکار، قانون سود، ورود اکسل (03-pricing.prisma،
# 08-system.prisma؛ فیلد به فیلد).
# ---------------------------------------------------------------------------


class Supplier(models.Model):
    name = models.CharField(max_length=150)
    contact_name = models.CharField(max_length=150, blank=True, null=True)
    contact_phone = models.CharField(max_length=30, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class SupplierProduct(models.Model):
    """§۸.۳۶ — روی واریانت (الحاقیه‌ی T-003). `price` قیمت همکار این
    تأمین‌کننده است؛ ارزان‌ترین ردیف در دسترس، قیمت همکار واریانت می‌شود."""

    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="supplier_products")
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name="supplier_products")
    price = models.BigIntegerField()
    is_available = models.BooleanField(default=True)
    source = models.CharField(max_length=100, blank=True, null=True)
    last_updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["supplier", "variant"], name="supplier_product_unique")]
        indexes = [models.Index(fields=["variant"])]


class PriceRule(models.Model):
    """تصمیم د — سطح تأمین‌کننده یا دسته؛ هر دو null = پیش‌فرض سراسری."""

    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, blank=True, null=True, related_name="price_rules")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, blank=True, null=True, related_name="price_rules")
    profit_type = models.CharField(max_length=10, choices=PROFIT_TYPE_CHOICES)
    profit_amount_toman = models.BigIntegerField(blank=True, null=True)
    profit_percent_basis_points = models.IntegerField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["supplier"]), models.Index(fields=["category"])]
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(profit_type="AMOUNT", profit_amount_toman__isnull=False, profit_percent_basis_points__isnull=True)
                    | models.Q(profit_type="PERCENT", profit_percent_basis_points__isnull=False, profit_amount_toman__isnull=True)
                ),
                name="price_rule_profit_matches_type",
            ),
        ]


IMPORT_JOB_STATUS_CHOICES = [
    ("PENDING", "در انتظار"),
    ("PROCESSING", "در حال اجرا"),
    ("COMPLETED", "انجام‌شده"),
    ("FAILED", "ناموفق"),
]
IMPORT_ROW_STATUS_CHOICES = [("SUCCESS", "موفق"), ("FAILED", "ناموفق"), ("SKIPPED", "رد شده")]


class ImportJob(models.Model):
    """§۷.۴۰–۷.۴۶. `file` جای `fileUrl` Prisma (فایل در MEDIA)؛ `column_mapping`
    الحاقیه‌ی Django — نگاشت ستون‌های همین فایل که برای دفعه‌ی بعد هم
    پیشنهاد می‌شود. `headers` سرستون‌های خوانده‌شده از ردیف اول."""

    file = models.FileField(upload_to="imports/")
    original_name = models.CharField(max_length=255, blank=True)
    headers = models.JSONField(default=list)
    column_mapping = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=12, choices=IMPORT_JOB_STATUS_CHOICES, default="PENDING")
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    total_rows = models.IntegerField(default=0)
    successful_rows = models.IntegerField(default=0)
    failed_rows = models.IntegerField(default=0)
    error = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, blank=True, null=True, related_name="import_jobs"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ImportJobRow(models.Model):
    import_job = models.ForeignKey(ImportJob, on_delete=models.CASCADE, related_name="rows")
    row_number = models.IntegerField()
    status = models.CharField(max_length=8, choices=IMPORT_ROW_STATUS_CHOICES)
    action = models.CharField(max_length=10, blank=True, help_text="create/update")
    sku_matched = models.CharField(max_length=50, blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    raw_data = models.JSONField(blank=True, null=True)

    class Meta:
        ordering = ["row_number"]
        indexes = [models.Index(fields=["import_job"])]
