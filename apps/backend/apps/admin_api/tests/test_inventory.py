from unittest import skip

from rest_framework.test import APITestCase

from .base import AdminApiTestMixin

# StockAlert/StockMovement (vybeshop) were replaced by Inventory/
# InventoryTransaction (on ProductVariant) in D-02 — see
# docs/backend/ADMIN-DISABLED.md. Method bodies below are stubbed (not left
# referencing the now-deleted classes) so `ruff` stays clean; D-08 rebuilds
# this suite against the new model from scratch — the method names are kept
# as a checklist of what this admin route used to guarantee.


@skip("D-02: admin/inventory/* and admin/stock-movements/* disabled, see docs/backend/ADMIN-DISABLED.md")
class AdminInventoryApiTests(AdminApiTestMixin, APITestCase):
    def test_inventory_list_shows_low_stock(self):
        pass

    def test_inventory_summary(self):
        pass

    def test_patch_stock_alert_upserts(self):
        pass

    def test_manual_purchase_movement(self):
        pass

    def test_sale_type_rejected_on_manual_endpoint(self):
        pass

    def test_return_in_type_rejected_on_manual_endpoint(self):
        pass

    def test_negative_resulting_stock_rejected(self):
        pass

    def test_list_movements_and_filter_by_type(self):
        pass

    def test_export_xlsx(self):
        pass
