from django.conf import settings
from django.db import models, transaction

MOVEMENT_TYPE_CHOICES = [
    ("purchase", "خرید"),
    ("production", "تولید"),
    ("sale", "فروش"),
    ("return_in", "بازگشت به انبار"),
    ("adjustment", "اصلاح موجودی"),
    ("scrap", "ضایعات"),
]

# Movement types that decrease stock; everything else increases it.
_DECREASING_TYPES = {"sale", "scrap"}


class StockMovementManager(models.Manager):
    @transaction.atomic
    def record(self, product, movement_type, quantity, *, reference="", note="", user=None):
        """The only sanctioned way to change Product.stock_count.

        `quantity` is given as a positive magnitude; sign is derived from
        `movement_type` (sale/scrap decrease, everything else increases).
        """
        from apps.catalog.models import Product

        if quantity <= 0:
            raise ValueError("quantity باید مثبت باشد.")

        locked_product = Product.objects.select_for_update().get(pk=product.pk)
        signed_quantity = -quantity if movement_type in _DECREASING_TYPES else quantity
        new_balance = locked_product.stock_count + signed_quantity
        if new_balance < 0:
            raise ValueError("موجودی نمی‌تواند منفی شود.")

        movement = self.create(
            product=locked_product,
            type=movement_type,
            quantity=signed_quantity,
            balance_after=new_balance,
            reference=reference,
            note=note,
            user=user,
        )

        locked_product._stock_write_allowed = True
        locked_product.stock_count = new_balance
        locked_product.save(update_fields=["stock_count"])

        return movement


class StockMovement(models.Model):
    product = models.ForeignKey(
        "catalog.Product", on_delete=models.PROTECT, related_name="stock_movements"
    )
    type = models.CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES)
    quantity = models.IntegerField(help_text="Signed: negative for sale/scrap, positive otherwise.")
    balance_after = models.PositiveIntegerField()
    reference = models.CharField(max_length=100, blank=True, help_text="e.g. order number")
    note = models.TextField(blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="stock_movements"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    objects = StockMovementManager()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.product.name} {self.type} {self.quantity:+d}"


class StockAlert(models.Model):
    product = models.OneToOneField(
        "catalog.Product", on_delete=models.CASCADE, related_name="stock_alert"
    )
    reorder_point = models.PositiveIntegerField(default=5)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.product.name} <= {self.reorder_point}"

    @property
    def is_triggered(self) -> bool:
        return self.is_active and self.product.stock_count <= self.reorder_point
