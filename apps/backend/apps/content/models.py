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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "product"], name="unique_user_product_favorite"),
        ]

    def __str__(self):
        return f"{self.user} ♥ {self.product}"


class HeroSection(models.Model):
    """Singleton — always pk=1, same pattern as SiteSettings. Lets the owner
    swap the home page's hero image/copy without a redeploy
    (HOMEPAGE-ADMIN-TASK.md). `is_active=False` means "hidden", not "no
    hero" — the storefront falls back to its own static default rather than
    showing an empty hero, since it's the page's visual anchor."""

    image = models.ImageField(upload_to="homepage/", blank=True, null=True)
    image_mobile = models.ImageField(
        upload_to="homepage/", blank=True, null=True,
        help_text="اختیاری — نسخه افقی دسکتاپ روی موبایل معمولاً بد کراپ می‌شود",
    )
    image_alt = models.CharField(max_length=200)
    title = models.CharField(max_length=200, blank=True)
    subtitle = models.CharField(max_length=300, blank=True)
    caption = models.CharField(max_length=100, blank=True, help_text='مونو، مثلاً "PLA · FDM · 0.2MM LAYER"')
    cta_label = models.CharField(max_length=100, blank=True)
    cta_url = models.CharField(max_length=300, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "hero section"

    def __str__(self):
        return "Hero section"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # singleton — never deleted

    @classmethod
    def load(cls) -> "HeroSection":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class HomeShowcase(models.Model):
    """One of the two full-width product-showcase blocks under the hero.
    `product` is optional — an admin can point a block at a category or
    campaign page instead of a specific product (HOMEPAGE-ADMIN-TASK.md:
    "می‌تواند به دسته‌بندی یا کمپین لینک شود") — but when it *is* set, the
    resolved_* properties auto-fill title/link/image so there's less to
    fill in by hand."""

    order = models.PositiveSmallIntegerField(help_text="۱ یا ۲")
    product = models.ForeignKey(
        "catalog.Product", on_delete=models.SET_NULL, blank=True, null=True, related_name="+"
    )
    image = models.ImageField(upload_to="homepage/", blank=True, null=True)
    image_alt = models.CharField(max_length=200, blank=True)
    title = models.CharField(max_length=200, blank=True)
    description = models.CharField(max_length=300, blank=True)
    specs = models.JSONField(default=list, help_text="[{label, value}, ...] — mono-rendered on the frontend")
    cta_label = models.CharField(max_length=100, default="جزئیات را ببینید")
    cta_url = models.CharField(max_length=300, blank=True)
    theme = models.CharField(max_length=5, choices=[("light", "روشن"), ("dark", "تیره")], default="light")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.resolved_title or f"Showcase #{self.order}"

    def clean(self):
        # Server-side cap, not just a UI limit — HOMEPAGE-ADMIN-TASK.md §3:
        # "حداکثر دو تای فعال — اعتبارسنجی سمت سرور".
        if self.is_active:
            already_active = HomeShowcase.objects.filter(is_active=True).exclude(pk=self.pk).count()
            if already_active >= 2:
                raise ValidationError({"is_active": "حداکثر دو بلوک نمایش می‌تواند هم‌زمان فعال باشد."})

    def _product_is_usable(self) -> bool:
        # A deactivated or deleted linked product must not break this block
        # (HOMEPAGE-ADMIN-TASK.md §1) — SET_NULL already handles delete;
        # this covers the "deactivated but still linked" case by simply no
        # longer trusting its data, falling back to whatever was typed in
        # manually (blank if nothing was).
        return bool(self.product_id and self.product.is_active)

    @property
    def resolved_title(self) -> str:
        if self.title:
            return self.title
        return self.product.name if self._product_is_usable() else ""

    @property
    def resolved_cta_url(self) -> str:
        if self.cta_url:
            return self.cta_url
        return f"/products/{self.product.slug}" if self._product_is_usable() else ""

    @property
    def resolved_image_url(self) -> str:
        if self.image:
            return self.image.url
        if self._product_is_usable():
            primary = self.product.images.first()
            if primary:
                return primary.resolved_url
        return ""


class CommunityTile(models.Model):
    """One of up to six square photos in the home page's community section.
    Purely decorative — no static fallback if none are active, the section
    just doesn't render (HOMEPAGE-ADMIN-TASK.md §1: "اگر هیچ تصویر فعالی
    نبود، سکشن جامعه رندر نشود")."""

    order = models.PositiveSmallIntegerField(help_text="۱ تا ۶")
    image = models.ImageField(upload_to="homepage/", blank=True, null=True)
    image_alt = models.CharField(max_length=200, blank=True)
    link_url = models.CharField(max_length=300, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"Community tile #{self.order}"

    def clean(self):
        if self.is_active:
            already_active = CommunityTile.objects.filter(is_active=True).exclude(pk=self.pk).count()
            if already_active >= 6:
                raise ValidationError({"is_active": "حداکثر شش کاشی می‌تواند هم‌زمان فعال باشد."})
