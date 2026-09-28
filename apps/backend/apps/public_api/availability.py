"""D-03 §3 — ports apps/api/src/modules/catalog/availability.ts exactly."""

# D-03 report — Django has no generic key/value Setting model yet (Nest's
# `Setting{key:"inventory.lowStockThreshold"}`); apps/api/prisma/seed.ts
# seeds that row with value 3, and Nest's own fallback when the row is
# missing is also 3 — so the *effective* global threshold is always 3 on
# this seed either way. Nearest equivalent: a constant, not a new model
# (building a generic settings table is out of D-03's scope — public API
# only). Revisit if/when a real admin-configurable Setting model exists.
GLOBAL_LOW_STOCK_THRESHOLD = 3


def compute_availability(inventory, is_preorder: bool, global_low_stock_threshold: int) -> dict:
    """inventory: an Inventory model instance, or None."""
    if is_preorder:
        return {"status": "PREORDER"}

    if inventory is not None:
        available = inventory.available_quantity
        if available is None:
            available = inventory.quantity - inventory.reserved_quantity
    else:
        available = 0

    if available <= 0:
        return {"status": "OUT_OF_STOCK"}

    threshold = inventory.low_stock_threshold if (inventory and inventory.low_stock_threshold is not None) else global_low_stock_threshold
    if available <= threshold:
        return {"status": "LOW_STOCK", "quantity": available}
    return {"status": "IN_STOCK"}
