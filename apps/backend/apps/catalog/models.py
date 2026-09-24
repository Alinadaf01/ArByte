from django.core.exceptions import ValidationError
from django.db import models
from imagekit.models import ImageSpecField
from imagekit.processors import ResizeToFill


class Category(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="categories/", blank=True, null=True)
    external_image_url = models.CharField(
        max_length=500, blank=True, help_text="Static asset path, used until a real image is uploaded."
    )
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, related_name="children", blank=True, null=True
    )
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name

    @property
    def resolved_image_url(self) -> str:
        return self.image.url if self.image else self.external_image_url

    def clean(self):
        # Category tree is capped at 2 levels: top-level -> child. No grandchildren.
        if self.parent_id and self.parent.parent_id:
            raise ValidationError("دسته‌بندی حداکثر می‌تواند دو سطح داشته باشد.")


PRODUCTION_STATUS_CHOICES = [
    ("in_stock", "آماده ارسال"),
    ("made_to_order", "ساخت پس از سفارش"),
    ("discontinued", "متوقف‌شده"),
]


class Product(models.Model):
    sku = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=200)
    # 160, not the old 300 -- this renders as an unclamped single line in
    # ProductCard (home/product-list grids) and the one-liner under the
    # title on the product detail page, both fixed-height contexts; 300
    # characters reliably overflowed the card box. `description` below is
    # the actual long-form field, unaffected by this.
    short_description = models.CharField(max_length=160, blank=True)
    description = models.TextField(blank=True)
    price = models.PositiveIntegerField(help_text="Toman, integer")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")

    material = models.CharField(max_length=150, blank=True)
    width_mm = models.PositiveIntegerField(default=0)
    height_mm = models.PositiveIntegerField(default=0)
    depth_mm = models.PositiveIntegerField(default=0)
    weight_g = models.PositiveIntegerField(default=0)

    stock_count = models.PositiveIntegerField(
        default=0, help_text="Derived from StockMovement ledger — never edit directly."
    )
    cost_price = models.PositiveIntegerField(
        blank=True, null=True, help_text="Toman — used to compute gross margin in sales reports."
    )

    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    shipping_time = models.CharField(max_length=100, blank=True)
    warranty_terms = models.TextField(blank=True, help_text='مثلاً "۶ ماه گارانتی تعویض در صورت نقص ساخت."')
    production_status = models.CharField(
        max_length=20, choices=PRODUCTION_STATUS_CHOICES, default="in_stock"
    )
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.CharField(max_length=300, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "-created_at"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.pk:
            previous = Product.objects.filter(pk=self.pk).values_list("stock_count", flat=True).first()
            if (
                previous is not None
                and previous != self.stock_count
                and not getattr(self, "_stock_write_allowed", False)
            ):
                raise ValueError(
                    "Product.stock_count مستقیم قابل تغییر نیست — از apps.inventory.StockMovement.objects.record() استفاده کنید."
                )
        super().save(*args, **kwargs)

    @property
    def in_stock(self) -> bool:
        return self.stock_count > 0


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    external_url = models.CharField(
        max_length=500, blank=True, help_text="Static asset path, used until a real image is uploaded."
    )
    thumbnail = ImageSpecField(
        source="image",
        processors=[ResizeToFill(600, 600)],
        format="WEBP",
        options={"quality": 82},
    )
    alt = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=1, help_text="order=1 is the primary/OG image")

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.product.name} #{self.order}"

    @property
    def resolved_url(self) -> str:
        return self.image.url if self.image else self.external_url


class ColorOption(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="colors")
    name = models.CharField(max_length=50)
    hex = models.CharField(max_length=7, help_text="#RRGGBB")
    in_stock = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.product.name} — {self.name}"


class PriceHistory(models.Model):
    """Written by the admin bulk price-edit action — never edited manually."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="price_history")
    old_price = models.PositiveIntegerField()
    new_price = models.PositiveIntegerField()
    changed_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, blank=True, null=True, related_name="price_changes"
    )
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "price histories"

    def __str__(self):
        return f"{self.product.name}: {self.old_price} -> {self.new_price}"


INPUT_TYPE_CHOICES = [
    ("select", "انتخابی"),
    ("text", "متنی"),
    ("number", "عددی"),
    ("boolean", "بله/خیر"),
]


class Attribute(models.Model):
    """Dynamic per-category spec field, additive to the fixed Product contract fields."""

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    unit = models.CharField(max_length=20, blank=True)
    input_type = models.CharField(max_length=10, choices=INPUT_TYPE_CHOICES, default="select")
    categories = models.ManyToManyField(Category, related_name="attributes", blank=True)
    is_required = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class AttributeValue(models.Model):
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE, related_name="values")
    value = models.CharField(max_length=150)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "value"]
        unique_together = ["attribute", "value"]

    def __str__(self):
        return f"{self.attribute.name}: {self.value}"


class ProductAttribute(models.Model):
    """value_option = picked from the reusable AttributeValue list.
    value_text = a one-off custom value not (yet) promoted to AttributeValue."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="attributes")
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE, related_name="product_links")
    value_option = models.ForeignKey(
        AttributeValue, on_delete=models.SET_NULL, blank=True, null=True, related_name="product_links"
    )
    value_text = models.CharField(max_length=150, blank=True)

    class Meta:
        unique_together = ["product", "attribute"]

    def __str__(self):
        return f"{self.product.name} — {self.attribute.name}"

    def clean(self):
        if not self.value_option and not self.value_text:
            raise ValidationError("یکی از value_option یا value_text باید مقدار داشته باشد.")

    @property
    def display_value(self) -> str:
        return self.value_option.value if self.value_option else self.value_text
