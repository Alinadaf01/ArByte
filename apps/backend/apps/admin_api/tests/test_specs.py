from unittest import skip

from rest_framework.test import APITestCase

from .base import AdminApiTestMixin

# Attribute/AttributeValue/ProductAttribute (vybeshop's EAV models) were
# replaced by SpecificationDefinition/SpecificationValue/ProductSpecification
# in D-02 — see docs/backend/ADMIN-DISABLED.md. Method bodies below are
# stubbed (not left referencing the now-deleted classes) so `ruff` stays
# clean; D-08 rebuilds this suite against the new models from scratch —
# the method names are kept as a checklist of what this admin route used
# to guarantee.


@skip("D-02: admin/attributes/* disabled, see docs/backend/ADMIN-DISABLED.md")
class AdminSpecsApiTests(AdminApiTestMixin, APITestCase):
    def test_create_attribute_with_categories_logs_activity_without_crashing(self):
        pass

    def test_attributes_scoped_by_category(self):
        pass

    def test_promote_value_to_reusable_dropdown_entry(self):
        pass

    def test_get_specs_returns_editable_shape(self):
        pass

    def test_put_specs_replaces_all(self):
        pass

    def test_put_specs_rejects_both_option_and_text(self):
        pass

    def test_put_specs_rejects_neither_option_nor_text(self):
        pass
