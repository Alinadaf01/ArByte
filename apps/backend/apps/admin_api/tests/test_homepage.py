from unittest import skip

from rest_framework.test import APITestCase

from .base import AdminApiTestMixin

# HeroSection/HomeShowcase/CommunityTile (vybeshop) were replaced by
# HomepageBlock in D-02 — see docs/backend/ADMIN-DISABLED.md. Method bodies
# below are stubbed (not left referencing the now-deleted classes) so `ruff`
# stays clean; D-08 rebuilds this suite against the new model from scratch —
# the method names are kept as a checklist of what this admin route used
# to guarantee.


@skip("D-02: admin/homepage/* disabled, see docs/backend/ADMIN-DISABLED.md")
class AdminHeroSectionApiTests(AdminApiTestMixin, APITestCase):
    def test_get_and_patch_singleton(self):
        pass

    def test_multiword_image_field_upload_is_written(self):
        pass

    def test_non_staff_denied(self):
        pass


@skip("D-02: admin/homepage/* disabled, see docs/backend/ADMIN-DISABLED.md")
class AdminHomeShowcaseApiTests(AdminApiTestMixin, APITestCase):
    def test_create_active_showcase(self):
        pass

    def test_third_active_showcase_rejected(self):
        pass

    def test_inactive_showcase_does_not_count_toward_cap(self):
        pass

    def test_editing_existing_active_showcase_does_not_trip_its_own_cap(self):
        pass

    def test_multipart_patch_with_specs_and_image_saves(self):
        pass

    def test_json_patch_only_product_change_saves(self):
        pass

    def test_product_id_serializes_as_string(self):
        pass

    def test_linked_product_autofills_title_image_link(self):
        pass

    def test_deleted_linked_product_does_not_break_showcase(self):
        pass

    def test_deactivated_linked_product_falls_back_to_manual_values(self):
        pass


@skip("D-02: admin/homepage/* disabled, see docs/backend/ADMIN-DISABLED.md")
class AdminCommunityTileApiTests(AdminApiTestMixin, APITestCase):
    def test_seventh_active_tile_rejected(self):
        pass

    def test_sixth_active_tile_accepted(self):
        pass


# PublicHomepageApiTests (public `homepage` endpoint, apps.content.urls)
# removed in D-01 along with the public API layer it tested — ArByte's
# storefront reads homepage content from `HomepageBlock`/apps/api (Nest)
# today, and will read it from this backend's own /api/v1/ in D-03.
