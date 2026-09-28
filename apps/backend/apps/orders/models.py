import secrets

from django.conf import settings
from django.db import models


class Cart(models.Model):
    """Guest carts (session_key set, user null) merge into the user's cart on login."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, blank=True, null=True, related_name="carts"
    )
    session_key = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user"], condition=models.Q(user__isnull=False), name="one_cart_per_user"),
            models.UniqueConstraint(
                fields=["session_key"],
                condition=models.Q(user__isnull=True) & ~models.Q(session_key=""),
                name="one_cart_per_guest_session",
            ),
        ]

    def __str__(self):
        return f"Cart({self.user or self.session_key})"


class CartItem(models.Model):
    """D-02 §۲ — روی واریانت (نه product+color_option)."""

    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey("catalog.ProductVariant", on_delete=models.CASCADE, related_name="cart_items")
    quantity = models.PositiveIntegerField(default=1)
    # D-05 §۲ — عیناً Prisma's CartItem.unitPriceSnapshot؛ در D-04 جا مانده
    # بود. صرفاً نمایش سریع سبد نیست — checkout با این مقایسه می‌کند تا
    # PRICE_CHANGED را تشخیص دهد (قیمت واقعی چک‌اوت همیشه از واریانت زنده
    # خوانده می‌شود، این فقط برای «آیا از وقتی افزوده شد عوض شده؟» است).
    unit_price_snapshot = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ["cart", "variant"]

    def __str__(self):
        return f"{self.variant} x{self.quantity}"


def generate_order_number() -> str:
    """D-05 §۲ — `ARB-` + ۸ رقم یکتا (سند تسک). قالب قبلی وایب
    (`ARB-YYMMDD-<6hex>`) عمداً عوض شد تا دقیقاً با سند مطابق باشد؛ چون سند
    خودش می‌گوید «قالب شماره را مدیر پروژه تأیید کند»، این تصمیم در
    docs/QUESTIONS.md ثبت شده — رقم‌ها همیشه لاتین (قاعده‌ی ۹)."""
    return f"ARB-{secrets.randbelow(10**8):08d}"


# D-05 §۱ — دقیقاً packages/contracts/src/common/enums.ts's ORDER_STATUS_VALUES
# (و بنابراین apps/api/prisma/schema/05-order.prisma's OrderStatus). ماشین‌حالت
# واقعی (گذارهای مجاز) در order_status.py است، نه اینجا — این فقط فهرست مقادیر.
ORDER_STATUS_CHOICES = [
    ("PENDING", "ثبت شده"),
    ("AWAITING_PAYMENT", "در انتظار پرداخت"),
    ("PAYMENT_REVIEW", "در حال بررسی پرداخت"),
    ("PAID", "پرداخت تأیید شد"),
    ("PROCESSING", "در حال پردازش"),
    ("READY_TO_SHIP", "آماده ارسال"),
    ("SHIPPED", "ارسال شد"),
    ("DELIVERED", "تحویل داده شد"),
    ("CANCELLED", "لغو شد"),
]

# مستقل از OrderStatus (تصمیم ب، T-003) — هرگز مستقیم Order.status را ست نمی‌کند.
PAYMENT_STATUS_CHOICES = [
    ("UNPAID", "در انتظار پرداخت"),
    ("RECEIPT_UPLOADED", "رسید ارسال شده"),
    ("UNDER_REVIEW", "در حال بررسی"),
    ("CONFIRMED", "تأیید شده"),
]

PAYMENT_METHOD_CHOICES = [
    ("MANUAL_CARD_TO_CARD", "کارت‌به‌کارت"),
    ("GATEWAY", "درگاه"),
]

# مقدار عمومی/قرارداد فقط NONE/BALEPAY است (packages/contracts/src/common/
# enums.ts's PAYMENT_PROVIDER_VALUES) — providerهای واقعی وایب (زرین‌پال و
# بقیه) کدشان می‌ماند (`PAYMENT_GATEWAY_CHOICES` پایین) اما در این فیلد
# عمومی هرگز نام نمی‌شوند، چون در چک‌اوت هرگز روشن نیستند (D-05.md §۳).
PAYMENT_PROVIDER_CHOICES = [
    ("NONE", "بدون درگاه"),
    ("BALEPAY", "بله‌پی"),
]

RECEIPT_STATUS_CHOICES = [
    ("PENDING", "در انتظار بررسی"),
    ("APPROVED", "تأییدشده"),
    ("REJECTED", "ردشده"),
]

RETURN_STATUS_CHOICES = [
    ("REQUESTED", "درخواست ثبت شد"),
    ("APPROVED", "درخواست تأیید شد"),
    ("REJECTED", "درخواست رد شد"),
    ("RECEIVED", "کالا دریافت شد"),
    ("REFUNDED", "مبلغ بازگردانده شد"),
]

# providerهای واقعی درگاه (identity پلاگین apps/orders/providers) — چهارتای
# وایب می‌مانند در کد (D-05.md §۳: «می‌مانند و خاموش‌اند») + بله‌پی تازه.
# این فیلد داخلی/پیاده‌سازی است؛ فیلد عمومی `Payment.provider` بالا
# (NONE/BALEPAY) چیزی است که در قرارداد API دیده می‌شود.
PAYMENT_GATEWAY_CHOICES = [
    ("ZARINPAL", "زرین‌پال"),
    ("IDPAY", "آیدی‌پی"),
    ("SNAPPPAY", "اسنپ‌پی"),
    ("DIGIPAY", "دیجی‌پی"),
    ("BALEPAY", "بله‌پی"),
]


class Order(models.Model):
    """D-05 §۱ — عیناً `apps/api/prisma/schema/05-order.prisma`'س Order.
    آدرس به‌صورت Snapshot در خود سفارش کپی می‌شود (نه FK به Address) — اصل
    Price Snapshot تعمیم‌یافته به آدرس، چون آدرس کاربر ممکن است بعداً
    ویرایش/حذف شود ولی سفارش قدیمی نباید عوض شود."""

    order_number = models.CharField(max_length=30, unique=True, default=generate_order_number, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default="PENDING")
    # تصمیم ب (T-003) — منبع حقیقت پرداخت Payment.status است؛ این فیلد هرگز
    # مستقیم از Payment ست نمی‌شود، فقط توسط order_status.py synchronize می‌شود.
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="UNPAID")

    shipping_recipient_name = models.CharField(max_length=100)
    shipping_mobile = models.CharField(max_length=20)
    shipping_province = models.CharField(max_length=100)
    shipping_city = models.CharField(max_length=100)
    shipping_address_line = models.CharField(max_length=500)
    shipping_postal_code = models.CharField(max_length=10, blank=True, null=True)

    subtotal = models.PositiveIntegerField()
    discount_total = models.PositiveIntegerField(default=0)
    shipping_cost = models.PositiveIntegerField(default=0)
    final_total = models.PositiveIntegerField()
    # تصمیم ج (Prisma) — دلیل لغو، مثلاً "PAYMENT_TIMEOUT" (Celery beat خودکار).
    cancel_reason = models.CharField(max_length=255, blank=True, null=True)

    # الحاقیه‌ی Django (نه در Prisma — آن‌جا فقط از OrderStatusHistory
    # استخراج می‌شود). این سه denormalize شده‌اند چون گزارش‌های ادمین وایب
    # (dashboard.py، customer_statement.py) روی aggregate/filter در سطح
    # دیتابیس روی این تاریخ‌ها ساخته شده‌اند — کوئری روی OrderStatusHistory
    # برای هر گزارش scan/subquery اضافه می‌خواست بدون سود واقعی؛
    # order_status.py تنها نویسنده است.
    paid_at = models.DateTimeField(blank=True, null=True)
    shipped_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)

    # Invoice PDF رندرش گران است (Playwright) و بعد از پرداخت عملاً ثابت
    # می‌ماند — الحاقیه‌ی Django (نه در Prisma)، cache برای apps.documents.
    invoice_pdf = models.FileField(upload_to="invoices/", blank=True, null=True)
    invoice_pdf_generated_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["order_number"]),
            models.Index(fields=["user"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    """Snapshot کامل — تغییر بعدی محصول/واریانت را تحت‌تأثیر قرار نمی‌دهد.
    `variant` عمداً nullable می‌ماند: اگر واریانت بعداً حذف شد، سفارش قدیمی
    باید هنوز بگوید مشتری چه خریده (الحاقیه، هشدار)."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(
        "catalog.ProductVariant", on_delete=models.SET_NULL, blank=True, null=True, related_name="order_items"
    )
    product_name_snapshot = models.CharField(max_length=200)
    variant_name_snapshot = models.CharField(max_length=200, blank=True, null=True)
    sku_snapshot = models.CharField(max_length=50)
    spec_snapshot = models.JSONField(blank=True, null=True)
    unit_price = models.PositiveIntegerField()
    quantity = models.PositiveIntegerField(default=1)
    discount = models.PositiveIntegerField(default=0)
    final_price = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["order"]), models.Index(fields=["variant"])]

    def __str__(self):
        return f"{self.product_name_snapshot} x{self.quantity}"

    @property
    def subtotal(self) -> int:
        return self.unit_price * self.quantity


class OrderStatusHistory(models.Model):
    """§۱۱.۵۱ — هر تغییر وضعیت یک ردیف؛ `order_status.py` تنها نویسنده است."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, blank=True, null=True)
    to_status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="order_status_changes"
    )
    note = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["order", "created_at"])]

    def __str__(self):
        return f"{self.order.order_number}: {self.from_status} -> {self.to_status}"


class Payment(models.Model):
    """§۸.۴۶ + الحاقیه بخش ۴ — انتزاع درگاه، شکل داده فقط. `gateway`
    identity واقعی پلاگین است (apps/orders/providers) — کارت‌به‌کارت
    مقدارش خالی می‌ماند؛ `provider` مقدار عمومی/قرارداد (NONE/BALEPAY) است،
    از `gateway` مشتق می‌شود (`sync_provider`)."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    provider = models.CharField(max_length=10, choices=PAYMENT_PROVIDER_CHOICES, default="NONE")
    # providerهای وایب (Zarinpal و بقیه) کدشان می‌ماند، اما هرگز از چک‌اوت
    # جدید انتخاب نمی‌شوند (ApiCredential غیرفعال) — این فیلد فقط برای
    # gateway واقعاً استفاده‌شده (بله‌پی) یا خالی (کارت‌به‌کارت) پر می‌شود.
    gateway = models.CharField(max_length=20, choices=PAYMENT_GATEWAY_CHOICES, blank=True, null=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="UNPAID")
    amount = models.PositiveIntegerField()
    provider_ref = models.CharField(max_length=100, blank=True, null=True)
    provider_payload = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["order"])]

    def __str__(self):
        return f"{self.order.order_number} — {self.method} ({self.status})"


def _receipt_upload_path(instance: "PaymentReceipt", filename: str) -> str:
    return f"receipts/private/{instance.payment.order.order_number}/{filename}"


class PaymentReceipt(models.Model):
    """§۸.۴۷/۸.۴۸ — رسید پرداخت دستی. `file` در `receipts/private/` ذخیره
    می‌شود، خارج از هر مسیر public که مستقیم سرو شود (D-05 §۳: «نه عمومی»)
    — apps/public_api/receipt_storage.py دسترسی را از طریق یک endpoint
    احراز‌هویت‌شده می‌دهد، نه لینک مستقیم media."""

    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name="receipts")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="uploaded_receipts")
    file = models.FileField(upload_to=_receipt_upload_path)
    amount = models.PositiveIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=RECEIPT_STATUS_CHOICES, default="PENDING")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="reviewed_receipts",
    )
    reviewed_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.CharField(max_length=500, blank=True, null=True)

    class Meta:
        indexes = [models.Index(fields=["payment"])]

    def __str__(self):
        return f"Receipt({self.payment.order.order_number}, {self.status})"


class Shipment(models.Model):
    """§۸.۴۹ تا §۸.۵۱ — یک سفارش یک Shipment (بدون مرسوله‌ی چندتکه). عمداً
    فیلد status جدا ندارد — SHIPPED/DELIVERED همین حالا در Order.status
    است؛ فیلد سوم یعنی نقض Single Source of Truth (همان استدلال Prisma)."""

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="shipment")
    provider = models.CharField(max_length=100, help_text="نام شرکت پستی/باربری")
    cost = models.PositiveIntegerField(default=0)
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    tracking_url = models.CharField(max_length=500, blank=True, null=True)
    shipped_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Shipment({self.order.order_number})"


class Return(models.Model):
    """§۸.۵۲ — قلم‌به‌قلم، از طریق `ReturnItem` (چون سفارش می‌تواند فقط
    جزئاً مرجوع شود). مستقل از Order.status (پایانی‌ترین وضعیت DELIVERED
    است؛ Return هیچ‌وقت Order.status را عوض نمی‌کند)."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="returns")
    reason = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=RETURN_STATUS_CHOICES, default="REQUESTED")
    admin_note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["order"])]

    def __str__(self):
        return f"Return({self.order.order_number}, {self.status})"


class ReturnItem(models.Model):
    """اتصال Return↔OrderItem با تعداد — ممکن است فقط بخشی از تعداد
    سفارش‌شده مرجوع شود، برخلاف M2M ساده‌ی نسخه‌ی قبلی."""

    return_request = models.ForeignKey(Return, on_delete=models.CASCADE, related_name="items")
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name="return_items")
    quantity = models.PositiveIntegerField()

    class Meta:
        unique_together = ["return_request", "order_item"]

    def __str__(self):
        return f"{self.order_item} x{self.quantity} ({self.return_request.status})"


class CouponUsage(models.Model):
    """D-05 §۴ — یک ردیف به ازای هر استفاده‌ی موفق؛ سقف کل/هر کاربر از
    شمارش همین جدول enforce می‌شود (`Coupon.is_exhausted`، `content/models.py`)،
    نه یک شمارنده‌ی جدا که می‌تواند drift کند. در apps/orders نه apps/content
    چون به Order وابسته است (از circular import با ForeignKey رشته‌ای رد شده)."""

    coupon = models.ForeignKey("content.Coupon", on_delete=models.CASCADE, related_name="usages")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="coupon_usages")
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="coupon_usages")
    discount_amount = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["coupon", "order"]
        indexes = [models.Index(fields=["user"])]

    def __str__(self):
        return f"{self.coupon.code} on {self.order.order_number}"
