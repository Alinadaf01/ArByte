import secrets

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone


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
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="cart_items")
    color_option = models.ForeignKey(
        "catalog.ColorOption", on_delete=models.SET_NULL, blank=True, null=True, related_name="cart_items"
    )
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ["cart", "product", "color_option"]

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"


def generate_order_number() -> str:
    return f"ARB-{timezone.now():%y%m%d}-{secrets.token_hex(3).upper()}"


ORDER_STATUS_CHOICES = [
    ("pending", "در انتظار پرداخت"),
    ("paid", "پرداخت‌شده"),
    ("processing", "در حال پردازش"),
    ("shipped", "ارسال‌شده"),
    ("delivered", "تحویل‌شده"),
    ("canceled", "لغوشده"),
    ("returned", "مرجوع‌شده"),
]

# Allowed forward transitions. Cancel/return are handled by dedicated methods
# with their own eligibility checks, not blind transitions.
_FORWARD_TRANSITIONS = {
    "pending": {"paid"},
    "paid": {"processing"},
    "processing": {"shipped"},
    "shipped": {"delivered"},
}
_CANCELABLE_FROM = {"pending", "paid", "processing"}
_RETURNABLE_FROM = {"delivered"}


class InvalidOrderTransition(Exception):
    pass


class Order(models.Model):
    number = models.CharField(max_length=30, unique=True, default=generate_order_number, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    # Snapshot, not a FK — a later edit/delete of the Address must not alter past orders.
    shipping_address = models.JSONField(
        default=dict, help_text="{title, province, city, line, postalCode, receiverName, receiverPhone}"
    )
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default="pending")

    subtotal = models.PositiveIntegerField(default=0)
    discount = models.PositiveIntegerField(default=0)
    shipping_cost = models.PositiveIntegerField(default=0)
    tax = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(default=0)
    coupon = models.ForeignKey(
        "content.Coupon", on_delete=models.SET_NULL, blank=True, null=True, related_name="orders"
    )

    note = models.TextField(blank=True)
    tracking_code = models.CharField(max_length=100, blank=True)

    # Invoice PDFs are expensive to render (headless Chromium) and mostly
    # static once paid, so the rendered file is cached here and only
    # regenerated when invoice_pdf_generated_at is older than updated_at
    # (e.g. a tracking code was added after shipping) — see apps/documents.
    invoice_pdf = models.FileField(upload_to="invoices/", blank=True, null=True)
    invoice_pdf_generated_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    shipped_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.number

    def _transition(self, new_status: str, *, note: str = "", user=None, extra_fields: list[str] | None = None):
        if new_status not in _FORWARD_TRANSITIONS.get(self.status, set()) | {"canceled", "returned"}:
            raise InvalidOrderTransition(f"{self.status} -> {new_status} مجاز نیست.")
        previous = self.status
        self.status = new_status
        self.save(update_fields=["status", "updated_at", *(extra_fields or [])])
        OrderStatusLog.objects.create(
            order=self, from_status=previous, to_status=new_status, note=note, user=user
        )

    def _already_notified_for(self, to_status: str) -> bool:
        """Belt-and-suspenders check on top of the InvalidOrderTransition
        guards that already make each forward transition reachable only
        once per order — if a status log for this transition exists, the
        SMS for it already went out, full stop."""
        return self.status_logs.filter(to_status=to_status).exists()

    @transaction.atomic
    def mark_paid(self, *, user=None):
        """The only place stock leaves the ledger for a sale — never at order
        creation. Each StockMovement.record() call locks its product row
        (select_for_update), so concurrent payments can't oversell."""
        from apps.inventory.models import StockMovement

        if self.status != "pending":
            raise InvalidOrderTransition("فقط سفارش pending می‌تواند paid شود.")
        already_notified = self._already_notified_for("paid")
        for item in self.items.select_related("product"):
            if item.product_id:
                StockMovement.objects.record(
                    item.product, "sale", item.quantity, reference=self.number, user=user
                )
        self.paid_at = timezone.now()
        self._transition("paid", user=user, extra_fields=["paid_at"])
        if not already_notified:
            transaction.on_commit(lambda: _send_order_paid_notifications(self))

    @transaction.atomic
    def start_processing(self, *, user=None):
        if self.status != "paid":
            raise InvalidOrderTransition("فقط سفارش paid می‌تواند processing شود.")
        self._transition("processing", user=user)

    @transaction.atomic
    def mark_shipped(self, *, tracking_code: str, user=None):
        if self.status != "processing":
            raise InvalidOrderTransition("فقط سفارش processing می‌تواند shipped شود.")
        if not tracking_code or not tracking_code.strip():
            # Enforced here, not just in the admin form — a status change to
            # "shipped" with no tracking code means an SMS with a blank code
            # goes to the customer, which is worse than not shipping it yet.
            raise InvalidOrderTransition("کد رهگیری برای ثبت ارسال الزامی است.")
        already_notified = self._already_notified_for("shipped")
        self.tracking_code = tracking_code
        self.shipped_at = timezone.now()
        self._transition("shipped", note=tracking_code, user=user, extra_fields=["tracking_code", "shipped_at"])
        if not already_notified:
            transaction.on_commit(lambda: _send_order_shipped_notification(self))

    @transaction.atomic
    def mark_delivered(self, *, user=None):
        if self.status != "shipped":
            raise InvalidOrderTransition("فقط سفارش shipped می‌تواند delivered شود.")
        self._transition("delivered", user=user)

    @transaction.atomic
    def cancel(self, *, reason: str = "", user=None):
        from apps.inventory.models import StockMovement

        if self.status not in _CANCELABLE_FROM:
            raise InvalidOrderTransition(f"سفارش با وضعیت {self.status} قابل لغو نیست.")
        # Stock only left the ledger once the order reached "paid" (see
        # mark_paid) — "pending" never deducted anything, so only reverse
        # for the two statuses reachable after payment.
        if self.status in {"paid", "processing"}:
            for item in self.items.select_related("product"):
                if item.product_id:
                    StockMovement.objects.record(
                        item.product, "return_in", item.quantity, reference=self.number, user=user
                    )
        self._transition("canceled", note=reason, user=user)

    @transaction.atomic
    def mark_returned(self, *, user=None):
        from apps.inventory.models import StockMovement

        if self.status not in _RETURNABLE_FROM:
            raise InvalidOrderTransition(f"سفارش با وضعیت {self.status} قابل مرجوع‌شدن نیست.")
        for item in self.items.select_related("product"):
            if item.product_id:
                StockMovement.objects.record(
                    item.product, "return_in", item.quantity, reference=self.number, user=user
                )
        self._transition("returned", user=user)


def _send_order_paid_notifications(order: "Order") -> None:
    """Two SMS, both scoped to this exact moment — never at order creation,
    since a pending order might just be an abandoned cart. See
    BACKEND-TASK.md §3.5."""
    from apps.notifications.services import NotificationService
    from apps.settings.models import SiteSettings

    NotificationService.send_sms(order.user.phone, "order_paid", {"orderNumber": order.number})

    site_settings = SiteSettings.load()
    if not site_settings.notify_owner_new_order:
        return
    customer_name = f"{order.user.first_name} {order.user.last_name}".strip() or order.user.phone
    item_count = sum(order.items.values_list("quantity", flat=True))
    context = {"orderNumber": order.number, "total": order.total, "itemCount": item_count, "customerName": customer_name}
    for phone in site_settings.owner_notification_phone_list:
        NotificationService.send_sms(phone, "owner_new_order", context)


def _send_order_shipped_notification(order: "Order") -> None:
    from apps.notifications.services import NotificationService

    NotificationService.send_sms(
        order.user.phone, "order_shipped", {"orderNumber": order.number, "trackingCode": order.tracking_code}
    )


class OrderStatusLog(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="status_logs")
    from_status = models.CharField(max_length=20)
    to_status = models.CharField(max_length=20)
    note = models.CharField(max_length=255, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="order_status_changes"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.order.number}: {self.from_status} -> {self.to_status}"


class OrderItem(models.Model):
    """Snapshots product details at order time — immune to later product edits."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "catalog.Product", on_delete=models.SET_NULL, blank=True, null=True, related_name="order_items"
    )
    product_name = models.CharField(max_length=200)
    sku = models.CharField(max_length=50)
    price = models.PositiveIntegerField()
    color_name = models.CharField(max_length=50, blank=True)
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"

    @property
    def subtotal(self) -> int:
        return self.price * self.quantity


# Values match PaymentProvider.code in apps/orders/providers/ exactly —
# these are also what the public GET /api/payment-gateways/ endpoint and
# frontend both call the gateway "code".
PAYMENT_GATEWAY_CHOICES = [
    ("ZARINPAL", "زرین‌پال"),
    ("IDPAY", "آیدی‌پی"),
    ("SNAPPPAY", "اسنپ‌پی"),
    ("DIGIPAY", "دیجی‌پی"),
]

PAYMENT_STATUS_CHOICES = [
    ("pending", "در انتظار"),
    ("success", "موفق"),
    ("failed", "ناموفق"),
]


class Payment(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    gateway = models.CharField(max_length=20, choices=PAYMENT_GATEWAY_CHOICES)
    # Snapshotted from PaymentProvider.display_name at creation time — the
    # gateway's *code* is a stable Python constant, but its human-readable
    # name is still copy that could change later, and a paid order must
    # keep showing whatever name it showed the day it was paid.
    gateway_name = models.CharField(max_length=50, blank=True)
    amount = models.PositiveIntegerField()
    authority = models.CharField(max_length=100, blank=True)
    ref_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="pending")
    raw_response = models.JSONField(blank=True, null=True)
    idempotency_key = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.order.number} — {self.gateway} ({self.status})"

    @transaction.atomic
    def mark_success(self, *, ref_id: str, raw_response: dict, user=None):
        """The only place a Payment becomes success — always followed by
        Order.mark_paid() in the same transaction so a payment can never be
        success while its order stays pending."""
        if self.status == "success":
            return  # already verified once — duplicate callback, no-op
        self.status = "success"
        self.ref_id = ref_id
        self.raw_response = raw_response
        self.verified_at = timezone.now()
        self.save(update_fields=["status", "ref_id", "raw_response", "verified_at"])
        self.order.mark_paid(user=user)

    def mark_failed(self, *, raw_response: dict):
        if self.status != "pending":
            return
        self.status = "failed"
        self.raw_response = raw_response
        self.save(update_fields=["status", "raw_response"])


RETURN_STATUS_CHOICES = [
    ("requested", "درخواست‌شده"),
    ("approved", "تأییدشده"),
    ("received", "دریافت‌شده"),
    ("refunded", "بازپرداخت‌شده"),
    ("rejected", "ردشده"),
]

_RETURN_TRANSITIONS = {
    "requested": {"approved", "rejected"},
    "approved": {"received"},
    "received": {"refunded"},
}


class Return(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="returns")
    items = models.ManyToManyField(OrderItem, related_name="returns", blank=True)
    status = models.CharField(max_length=20, choices=RETURN_STATUS_CHOICES, default="requested")
    reason = models.TextField(blank=True)
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Return({self.order.number}, {self.status})"

    def _transition(self, new_status: str):
        if new_status not in _RETURN_TRANSITIONS.get(self.status, set()):
            raise InvalidOrderTransition(f"{self.status} -> {new_status} مجاز نیست.")
        self.status = new_status
        self.save(update_fields=["status", "updated_at"])

    def approve(self):
        self._transition("approved")

    def reject(self):
        self._transition("rejected")

    def mark_received(self):
        self._transition("received")

    @transaction.atomic
    def mark_refunded(self):
        self._transition("refunded")
