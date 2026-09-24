"""D-02 — replaces StockMovement/StockAlert (product.stock_count-based) with
Inventory/InventoryTransaction on ProductVariant, per
apps/api/prisma/schema/04-inventory.prisma. `low_stock_threshold` replaces
StockAlert (a null threshold means "use the global Setting default" —
vybeshop's compare-doc §۲.۴, unchanged from Nest's design).

Locking: D-02.md §۲ is explicit — `select_for_update` on Inventory inside a
transaction, not the CAS/`version`-column pattern Nest's own docs speculated
about for T-004 (which was never actually built as a service there; see the
D-02 report). `version` is still a real column (Prisma parity), just not the
concurrency-safety mechanism here.
"""

from django.core.exceptions import ValidationError
from django.db import models, transaction

INVENTORY_TRANSACTION_TYPE_CHOICES = [
    ("STOCK_IN", "ورود به انبار"),
    ("STOCK_OUT", "خروج از انبار"),
    ("ADJUSTMENT", "اصلاح موجودی"),
    ("RESERVATION", "رزرو"),
    ("RELEASE", "آزادسازی رزرو"),
]

# Transaction types that decrease `quantity` (not `reserved_quantity`).
_STOCK_DECREASING_TYPES = {"STOCK_OUT"}


class InsufficientStockError(ValueError):
    pass


class InventoryManager(models.Manager):
    def _locked_row(self, variant_id):
        return self.select_for_update().select_related("variant__product").get(variant_id=variant_id)

    def _log(self, inventory, *, type, quantity_change, quantity_before, quantity_after, reference="", note="", user=None):
        from apps.inventory.models import InventoryTransaction

        return InventoryTransaction.objects.create(
            variant=inventory.variant,
            type=type,
            quantity_change=quantity_change,
            quantity_before=quantity_before,
            quantity_after=quantity_after,
            reference=reference,
            note=note,
            user=user,
        )

    @transaction.atomic
    def stock_in(self, variant, quantity: int, *, reference="", note="", user=None):
        """Purchase/return-to-warehouse — increases `quantity`, never `reserved_quantity`."""
        if quantity <= 0:
            raise ValueError("quantity باید مثبت باشد.")
        inv = self._locked_row(variant.pk)
        before = inv.quantity
        inv.quantity = before + quantity
        inv.version += 1
        inv.save(update_fields=["quantity", "version", "updated_at"])
        return self._log(
            inv, type="STOCK_IN", quantity_change=quantity, quantity_before=before,
            quantity_after=inv.quantity, reference=reference, note=note, user=user,
        )

    @transaction.atomic
    def stock_out(self, variant, quantity: int, *, reference="", note="", user=None):
        """A sale leaving the warehouse — decreases `quantity` directly (the
        single-phase flow this codebase already uses at Order.mark_paid;
        D-02.md §۲: mechanical parity, not a reserve-then-confirm checkout
        redesign — that's D-04/D-05). If the sold quantity had been reserved
        first, the caller is responsible for also releasing that reservation."""
        if quantity <= 0:
            raise ValueError("quantity باید مثبت باشد.")
        inv = self._locked_row(variant.pk)
        before = inv.quantity
        if before - quantity < 0:
            raise InsufficientStockError("موجودی نمی‌تواند منفی شود.")
        inv.quantity = before - quantity
        inv.version += 1
        inv.save(update_fields=["quantity", "version", "updated_at"])
        return self._log(
            inv, type="STOCK_OUT", quantity_change=-quantity, quantity_before=before,
            quantity_after=inv.quantity, reference=reference, note=note, user=user,
        )

    @transaction.atomic
    def adjust(self, variant, signed_delta: int, *, reference="", note="", user=None):
        """Manual correction (stocktake mismatch, damage, ...) — signed_delta
        can be negative; not restricted to sale/scrap like vybeshop's old
        MOVEMENT_TYPE_CHOICES was."""
        if signed_delta == 0:
            raise ValueError("signed_delta نمی‌تواند صفر باشد.")
        inv = self._locked_row(variant.pk)
        before = inv.quantity
        after = before + signed_delta
        if after < 0:
            raise InsufficientStockError("موجودی نمی‌تواند منفی شود.")
        inv.quantity = after
        inv.version += 1
        inv.save(update_fields=["quantity", "version", "updated_at"])
        return self._log(
            inv, type="ADJUSTMENT", quantity_change=signed_delta, quantity_before=before,
            quantity_after=after, reference=reference, note=note, user=user,
        )

    @transaction.atomic
    def reserve(self, variant, quantity: int, *, reference="", note="", user=None):
        """D-02.md §۲ — `select_for_update` in a transaction; only one of two
        concurrent reservations against the last unit can succeed (see
        InventoryConcurrencyTests). Increases `reserved_quantity`, never
        `quantity` — `available_quantity` (the generated column) drops
        immediately, `quantity` doesn't move until stock_out()."""
        if quantity <= 0:
            raise ValueError("quantity باید مثبت باشد.")
        inv = self._locked_row(variant.pk)
        available = inv.quantity - inv.reserved_quantity
        if available < quantity:
            raise InsufficientStockError("موجودی کافی برای رزرو نیست.")
        before = inv.reserved_quantity
        inv.reserved_quantity = before + quantity
        inv.version += 1
        inv.save(update_fields=["reserved_quantity", "version", "updated_at"])
        return self._log(
            inv, type="RESERVATION", quantity_change=quantity, quantity_before=before,
            quantity_after=inv.reserved_quantity, reference=reference, note=note, user=user,
        )

    @transaction.atomic
    def release(self, variant, quantity: int, *, reference="", note="", user=None):
        """Undoes a reserve() that never became a sale (cart abandoned,
        reservation expired)."""
        if quantity <= 0:
            raise ValueError("quantity باید مثبت باشد.")
        inv = self._locked_row(variant.pk)
        before = inv.reserved_quantity
        if before - quantity < 0:
            raise ValueError("رزرو کمتر از مقدار آزادسازی است.")
        inv.reserved_quantity = before - quantity
        inv.version += 1
        inv.save(update_fields=["reserved_quantity", "version", "updated_at"])
        return self._log(
            inv, type="RELEASE", quantity_change=-quantity, quantity_before=before,
            quantity_after=inv.reserved_quantity, reference=reference, note=note, user=user,
        )


class Inventory(models.Model):
    variant = models.OneToOneField(
        "catalog.ProductVariant", on_delete=models.CASCADE, primary_key=True, related_name="inventory"
    )
    quantity = models.IntegerField(default=0)
    reserved_quantity = models.IntegerField(default=0)
    # Real Postgres GENERATED ALWAYS AS (quantity - reserved_quantity) STORED
    # column — apps/api/prisma/schema/04-inventory.prisma's own comment on
    # this field applies here too: never assign to it directly.
    available_quantity = models.GeneratedField(
        expression=models.F("quantity") - models.F("reserved_quantity"),
        output_field=models.IntegerField(),
        db_persist=True,
    )
    low_stock_threshold = models.IntegerField(blank=True, null=True)
    version = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = InventoryManager()

    class Meta:
        verbose_name_plural = "inventory"
        constraints = [
            models.CheckConstraint(
                check=models.Q(available_quantity__gte=0), name="inventory_available_quantity_non_negative"
            ),
        ]

    def __str__(self):
        return f"{self.variant} — {self.quantity} ({self.reserved_quantity} رزرو)"


class InventoryTransaction(models.Model):
    """کاردکس — هر تغییر موجودی یک ردیف اینجا هم می‌سازد."""

    variant = models.ForeignKey(
        "catalog.ProductVariant", on_delete=models.CASCADE, related_name="inventory_transactions"
    )
    type = models.CharField(max_length=12, choices=INVENTORY_TRANSACTION_TYPE_CHOICES)
    quantity_change = models.IntegerField(help_text="Signed.")
    quantity_before = models.IntegerField()
    quantity_after = models.IntegerField()
    user = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, blank=True, null=True, related_name="inventory_transactions"
    )
    reference = models.CharField(max_length=100, blank=True, null=True, help_text="e.g. order number")
    note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["variant", "created_at"])]

    def __str__(self):
        return f"{self.variant} {self.type} {self.quantity_change:+d}"
