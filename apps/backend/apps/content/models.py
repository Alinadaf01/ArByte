import secrets

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

# G-01 — دسته‌های Blog.dc.html (قبلاً دسته‌های وایب بود؛ هیچ نوشته‌ای با آن‌ها نبود).
BLOG_CATEGORY_CHOICES = [
    ("راهنمای خرید", "راهنمای خرید"),
    ("بررسی", "بررسی"),
    ("مقایسه", "مقایسه"),
    ("نگهداری", "نگهداری"),
    ("گیمینگ", "گیمینگ"),
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
    # F-04 — متن جایگزین تصویر کاور (دسترس‌پذیری/سئو).
    cover_alt = models.CharField(max_length=200, blank=True)
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
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    subject = models.CharField(max_length=100)
    order_number = models.CharField(max_length=30, blank=True)
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
        constraints = [
            # G-01 — هر خریدار یک نظر برای هر محصول (نظرهای ادمین/مهمان قدیمی user=null دارند).
            models.UniqueConstraint(fields=["product", "user"], name="review_one_per_user_product"),
        ]

    def __str__(self):
        return f"{self.product.name} — {self.rating}/5"


COUPON_TYPE_CHOICES = [
    ("PERCENT", "درصدی"),
    ("AMOUNT", "مبلغ ثابت"),
]


class Coupon(models.Model):
    """D-05 §۴ — عیناً `apps/api/prisma/schema/06-marketing.prisma`'س Coupon.
    نسخه‌ی قبلی (وایب) کوپن را به دسته/محصول محدود می‌کرد (`categories`/
    `products` M2M) — چیزی که مدل Prisma اصلاً ندارد؛ چون D-05.md صریح گفته
    «کوپن طبق Prisma»، این محدودسازی حذف شد (کوپن روی کل سبد اعمال می‌شود،
    نه بخشی از آن) — یک ساده‌سازی مستند، نه گم‌شدن قابلیت اتفاقی. شمارش
    مصرف هم از یک شمارنده‌ی ساده (`used_count`) به جدول واقعی `CouponUsage`
    (apps/orders/models.py — چون به Order وابسته است) منتقل شد تا هم سقف کل
    هم سقف هر کاربر از رکورد واقعی enforce شود، نه یک عدد قابل‌drift."""

    code = models.CharField(max_length=30, unique=True)
    type = models.CharField(max_length=10, choices=COUPON_TYPE_CHOICES)
    # دقیقاً یکی از این دو باید مقدار داشته باشد (طبق `type`) — همان الگوی
    # BigInt+basis-points که برای سود تأمین‌کننده (T-003-DECISION) به‌کار رفت.
    amount_toman = models.PositiveIntegerField(blank=True, null=True)
    percent_basis_points = models.PositiveIntegerField(blank=True, null=True, help_text="۱۰۰۰۰ = ۱۰۰٪")
    minimum_order_amount = models.PositiveIntegerField(blank=True, null=True)
    maximum_discount_amount = models.PositiveIntegerField(blank=True, null=True)
    usage_limit = models.PositiveIntegerField(blank=True, null=True)
    per_user_limit = models.PositiveIntegerField(blank=True, null=True)
    start_date = models.DateTimeField(blank=True, null=True)
    end_date = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.code

    def is_exhausted(self) -> bool:
        if self.usage_limit is None:
            return False
        return self.usages.count() >= self.usage_limit


class Favorite(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites")
    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="favorited_by")
    # D-02 §۲ — optional: which configuration was favorited, if the user had
    # one selected. Falls back to the product's default variant when null.
    variant = models.ForeignKey(
        "catalog.ProductVariant", on_delete=models.SET_NULL, blank=True, null=True, related_name="favorited_by"
    )
    # D-04 §۲ — قیمت لحظه‌ی ذخیره؛ صفحه‌ی /wishlist تغییر قیمت را با مقایسه‌ی
    # این مقدار و قیمت زنده‌ی واریانت نشان می‌دهد (packages/contracts's
    # WishlistItemSchema.priceAtSave). نال یعنی یا محصول وقت ذخیره قیمتی
    # نداشت یا (مهاجرت از localStorage) قیمت لحظه‌ی ذخیره در مرورگر ثبت نشده بود.
    price_at_save = models.BigIntegerField(blank=True, null=True)
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


class SeoMetadata(models.Model):
    """F-02 — عیناً `07-content.prisma`'s SeoMetadata (یک ردیف به ازای هر
    محصول/دسته/برند). API عمومی محصول از قبل فیلد `seo` (title/description/
    canonical) دارد که تا اینجا همیشه null بود؛ حالا از این ردیف پر می‌شود."""

    meta_title = models.CharField(max_length=200, blank=True, null=True)
    meta_description = models.CharField(max_length=320, blank=True, null=True)
    canonical = models.CharField(max_length=500, blank=True, null=True)
    robots = models.CharField(max_length=100, blank=True, null=True)
    og_title = models.CharField(max_length=200, blank=True, null=True)
    og_description = models.CharField(max_length=320, blank=True, null=True)
    og_image = models.CharField(max_length=500, blank=True, null=True)
    category = models.OneToOneField(
        "catalog.Category", on_delete=models.CASCADE, blank=True, null=True, related_name="seo"
    )
    brand = models.OneToOneField("catalog.Brand", on_delete=models.CASCADE, blank=True, null=True, related_name="seo")
    product = models.OneToOneField(
        "catalog.Product", on_delete=models.CASCADE, blank=True, null=True, related_name="seo"
    )

    def __str__(self):
        return self.meta_title or f"SEO #{self.pk}"


class Campaign(models.Model):
    """F-03 — `06-marketing.prisma`'s Campaign. `rules` (JSON آزاد در Prisma)
    اینجا شکل ثابت دارد: `{"discountType": "PERCENT"|"AMOUNT", "value": n}`
    (درصد صحیح یا مبلغ تومان)."""

    name = models.CharField(max_length=150)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=0)
    rules = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-priority", "-start_at"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        _reset_campaign_cache()

    def delete(self, *args, **kwargs):
        result = super().delete(*args, **kwargs)
        _reset_campaign_cache()
        return result


def _reset_campaign_cache():
    from apps.catalog.pricing import reset_campaign_cache

    reset_campaign_cache()


class CampaignProduct(models.Model):
    """محصول *یا* دسته — دقیقاً یکی."""

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        _reset_campaign_cache()

    def delete(self, *args, **kwargs):
        result = super().delete(*args, **kwargs)
        _reset_campaign_cache()
        return result

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name="targets")
    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, blank=True, null=True, related_name="campaign_targets")
    category = models.ForeignKey("catalog.Category", on_delete=models.CASCADE, blank=True, null=True, related_name="campaign_targets")

    class Meta:
        indexes = [models.Index(fields=["campaign"]), models.Index(fields=["product"]), models.Index(fields=["category"])]
        constraints = [
            models.CheckConstraint(
                check=models.Q(product__isnull=False, category__isnull=True) | models.Q(product__isnull=True, category__isnull=False),
                name="campaign_target_exactly_one",
            ),
        ]


class AboutPage(models.Model):
    """G-01 — متن‌های «درباره ما» قابل ویرایش از پنل (singleton، pk=1).
    هر بخش خالی در فروشگاه پنهان می‌شود؛ هیچ متن پیش‌فرضی نوشته نشده.
    principles: [{title, body}] · timeline: [{year, note}] · team: [{name, role}]"""

    hero_title = models.CharField(max_length=200, blank=True)
    hero_body = models.TextField(blank=True)
    story_title = models.CharField(max_length=200, blank=True)
    story_body = models.TextField(blank=True, help_text="پاراگراف‌ها با یک خط خالی جدا می‌شوند")
    principles_title = models.CharField(max_length=200, blank=True)
    principles = models.JSONField(default=list, blank=True)
    timeline_title = models.CharField(max_length=200, blank=True)
    timeline = models.JSONField(default=list, blank=True)
    team_title = models.CharField(max_length=200, blank=True)
    team = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def load(cls) -> "AboutPage":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


LEGAL_DOCUMENT_CHOICES = [
    ("terms", "شرایط استفاده"),
    ("privacy", "حریم خصوصی"),
    ("shipping", "ارسال"),
    ("returns", "مرجوعی"),
    ("warranty", "گارانتی"),
]


class LegalDocument(models.Model):
    """G-01 — اسناد صفحه‌ی قوانین؛ متن فقط از پنل (سند خالی = پنهان).
    body: متن ساده با پاراگراف‌های جدا با خط خالی؛ خطی که با «## » شروع شود زیرعنوان است."""

    key = models.CharField(max_length=20, choices=LEGAL_DOCUMENT_CHOICES, unique=True)
    title = models.CharField(max_length=150, blank=True)
    body = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.get_key_display()
