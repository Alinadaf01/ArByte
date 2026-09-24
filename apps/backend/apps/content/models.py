import secrets

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

BLOG_CATEGORY_CHOICES = [
    ("محصول", "محصول"),
    ("طراحی", "طراحی"),
    ("آموزش", "آموزش"),
    ("سبک زندگی", "سبک زندگی"),
    ("جامعه", "جامعه"),
]


class BlogPost(models.Model):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=200)
    excerpt = models.CharField(max_length=300)
    category = models.CharField(max_length=20, choices=BLOG_CATEGORY_CHOICES)
    sections = models.JSONField(
        default=list, help_text="[{id, heading, body}, ...] — matches frontend BlogSection[]"
    )
    cover_image = models.ImageField(upload_to="blog/", blank=True, null=True)
    external_cover_url = models.CharField(
        max_length=500, blank=True, help_text="Static asset path, used until a real image is uploaded."
    )
    author = models.CharField(max_length=100)
    author_role = models.CharField(max_length=100, blank=True)
    tags = models.JSONField(default=list)
    reading_time = models.PositiveIntegerField(default=1, help_text="minutes")
    is_published = models.BooleanField(default=False)
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.CharField(max_length=300, blank=True)
    published_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]

    def __str__(self):
        return self.title

    @property
    def resolved_cover_url(self) -> str:
        return self.cover_image.url if self.cover_image else self.external_cover_url


def generate_tracking_code() -> str:
    return f"ARB-{secrets.token_hex(3).upper()}"


class ContactMessage(models.Model):
    tracking_code = models.CharField(max_length=20, unique=True, default=generate_tracking_code, editable=False)
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    subject = models.CharField(max_length=100)
    message = models.TextField()
    newsletter = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    admin_note = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.name} — {self.subject}"


REVIEW_STATUS_CHOICES = [
    ("pending", "در انتظار بررسی"),
    ("approved", "تأییدشده"),
    ("rejected", "ردشده"),
]


class ProductReview(models.Model):
    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="reviews"
    )
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    title = models.CharField(max_length=150, blank=True)
    body = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=REVIEW_STATUS_CHOICES, default="pending")
    admin_reply = models.TextField(blank=True)
    verified_purchase = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.product.name} — {self.rating}/5"


COUPON_TYPE_CHOICES = [
    ("percent", "درصدی"),
    ("fixed", "مبلغ ثابت"),
]


class Coupon(models.Model):
    code = models.CharField(max_length=30, unique=True)
    type = models.CharField(max_length=10, choices=COUPON_TYPE_CHOICES)
    value = models.PositiveIntegerField(help_text="percent (1-100) or Toman amount, per `type`")
    min_order_value = models.PositiveIntegerField(default=0)
    max_discount = models.PositiveIntegerField(blank=True, null=True, help_text="cap for percent coupons")
    usage_limit = models.PositiveIntegerField(blank=True, null=True)
    used_count = models.PositiveIntegerField(default=0)
    per_user_limit = models.PositiveIntegerField(blank=True, null=True)
    starts_at = models.DateTimeField(blank=True, null=True)
    ends_at = models.DateTimeField(blank=True, null=True)
    categories = models.ManyToManyField("catalog.Category", blank=True, related_name="coupons")
    products = models.ManyToManyField("catalog.Product", blank=True, related_name="coupons")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.code

    def is_exhausted(self) -> bool:
        return self.usage_limit is not None and self.used_count >= self.usage_limit


class Favorite(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites")
    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="favorited_by")
    # D-02 §۲ — optional: which configuration was favorited, if the user had
    # one selected. Falls back to the product's default variant when null.
    variant = models.ForeignKey(
        "catalog.ProductVariant", on_delete=models.SET_NULL, blank=True, null=True, related_name="favorited_by"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "product"], name="unique_user_product_favorite"),
        ]

    def __str__(self):
        return f"{self.user} ♥ {self.product}"


HOMEPAGE_BLOCK_TYPE_CHOICES = [
    ("HERO", "هیرو"),
    ("CATEGORY_GRID", "شبکه دسته‌بندی‌ها"),
    ("FLAGSHIP_DUEL", "دوئل پرچم‌دار"),
    ("PRODUCT_RAIL", "ردیف محصولات"),
    ("CAMPAIGN", "کمپین"),
    ("BENEFITS", "مزایا"),
    ("BLOG_RAIL", "ردیف مجله"),
]

# D-02 §۱ — required `config` keys per block type, mirroring
# packages/contracts/src/content/block-config.ts's HomepageBlockConfigSchema
# discriminated union. Types with an empty tuple here (CAMPAIGN/BENEFITS/
# BLOG_RAIL) take no config keys at all in that same Zod schema.
_HOMEPAGE_BLOCK_REQUIRED_CONFIG_KEYS: dict[str, tuple[str, ...]] = {
    "HERO": ("framesManifest",),
    "CATEGORY_GRID": ("categorySlugs",),
    "FLAGSHIP_DUEL": ("productSlugs", "metrics"),
    "PRODUCT_RAIL": ("productSlugs",),
    "CAMPAIGN": (),
    "BENEFITS": (),
    "BLOG_RAIL": (),
}


class HomepageBlock(models.Model):
    """§۸.۵۷+ سند مقایسه‌ی وایب‌شاپ — جایگزین سه مدل تک‌کاره‌ی وایب
    (HeroSection/HomeShowcase/CommunityTile) با یک مدل بلوک‌محور مثل Nest."""

    type = models.CharField(max_length=20, choices=HOMEPAGE_BLOCK_TYPE_CHOICES)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    title = models.CharField(max_length=200, blank=True, null=True)
    subtitle = models.CharField(max_length=300, blank=True, null=True)
    cta_label = models.CharField(max_length=100, blank=True, null=True)
    cta_url = models.CharField(max_length=300, blank=True, null=True)
    image_desktop = models.CharField(max_length=500, blank=True, null=True)
    image_mobile = models.CharField(max_length=500, blank=True, null=True)
    image_alt = models.CharField(max_length=200, blank=True, null=True)
    config = models.JSONField(blank=True, null=True)
    starts_at = models.DateTimeField(blank=True, null=True)
    ends_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order"]
        indexes = [models.Index(fields=["type", "sort_order"])]

    def __str__(self):
        return f"{self.type} #{self.sort_order}"

    def clean(self):
        required_keys = _HOMEPAGE_BLOCK_REQUIRED_CONFIG_KEYS.get(self.type, ())
        config = self.config or {}
        if not required_keys:
            return
        missing = [key for key in required_keys if key not in config]
        if missing:
            raise ValidationError(
                {"config": f"برای بلوک {self.type} کلیدهای {', '.join(missing)} در config لازم است."}
            )
