import io

from django.urls import reverse
from PIL import Image
from rest_framework.test import APITestCase

from apps.catalog.models import Product
from apps.content.models import CommunityTile, HeroSection, HomeShowcase

from .base import AdminApiTestMixin


def _fake_image_file(name="hero.png"):
    buffer = io.BytesIO()
    Image.new("RGB", (10, 10), color="blue").save(buffer, format="PNG")
    buffer.seek(0)
    buffer.name = name
    return buffer


class AdminHeroSectionApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_get_and_patch_singleton(self):
        response = self.client.get(reverse("admin-homepage-hero"))
        self.assertEqual(response.status_code, 200)

        response = self.client.patch(
            reverse("admin-homepage-hero"), {"title": "New Title"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(HeroSection.load().title, "New Title")

    def test_multiword_image_field_upload_is_written(self):
        # Regression: the same camelCase-multipart bug already hit blog.py's
        # coverImage and settings_admin.py's logoLight — a multi-word field
        # name silently dropped on plain MultiPartParser/FormParser instead
        # of landing on image_mobile.
        response = self.client.patch(
            reverse("admin-homepage-hero"), {"imageMobile": _fake_image_file()}, format="multipart"
        )
        self.assertEqual(response.status_code, 200)
        hero = HeroSection.load()
        self.assertTrue(bool(hero.image_mobile))

    def test_non_staff_denied(self):
        self.client.force_authenticate(user=self.make_customer())
        response = self.client.get(reverse("admin-homepage-hero"))
        self.assertEqual(response.status_code, 403)


class AdminHomeShowcaseApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.staff = self.make_staff()
        self.client.force_authenticate(user=self.staff)

    def test_create_active_showcase(self):
        response = self.client.post(
            reverse("admin-homepage-showcase-list"),
            {"order": 1, "title": "Showcase One", "ctaUrl": "/products", "isActive": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["resolved_title"], "Showcase One")
        self.assertEqual(response.data["resolved_cta_url"], "/products")

    def test_third_active_showcase_rejected(self):
        # Server-side cap, not just a UI limit (HOMEPAGE-ADMIN-TASK.md §3).
        HomeShowcase.objects.create(order=1, title="A", is_active=True)
        HomeShowcase.objects.create(order=2, title="B", is_active=True)
        response = self.client.post(
            reverse("admin-homepage-showcase-list"),
            {"order": 3, "title": "C", "isActive": True},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("is_active", response.data)

    def test_inactive_showcase_does_not_count_toward_cap(self):
        HomeShowcase.objects.create(order=1, title="A", is_active=True)
        HomeShowcase.objects.create(order=2, title="B", is_active=False)
        response = self.client.post(
            reverse("admin-homepage-showcase-list"),
            {"order": 3, "title": "C", "isActive": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201)

    def test_editing_existing_active_showcase_does_not_trip_its_own_cap(self):
        # Excluding self from the cap count — otherwise no active showcase
        # could ever be edited once two exist.
        a = HomeShowcase.objects.create(order=1, title="A", is_active=True)
        HomeShowcase.objects.create(order=2, title="B", is_active=True)
        response = self.client.patch(
            reverse("admin-homepage-showcase-detail", args=[a.pk]),
            {"title": "A renamed"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

    def test_multipart_patch_with_specs_and_image_saves(self):
        # Reproduces exactly what the admin panel's buildFormData() sends
        # when an admin edits an existing showcase and also picks a new
        # image: every field goes through FormData.append(), so specs
        # (an array of {label, value} objects) arrives as a JSON *string*,
        # product arrives as "" when unset, and isActive arrives as the
        # string "true" rather than a real boolean.
        showcase = HomeShowcase.objects.create(order=1, title="Before", is_active=True)
        response = self.client.patch(
            reverse("admin-homepage-showcase-detail", args=[showcase.pk]),
            {
                "order": "1",
                "product": "",
                "imageAlt": "alt text",
                "title": "Renamed via multipart",
                "description": "desc",
                "specs": '[{"label": "وزن", "value": "250 گرم"}]',
                "ctaLabel": "جزئیات را ببینید",
                "ctaUrl": "",
                "theme": "dark",
                "isActive": "true",
                "image": _fake_image_file(),
            },
            format="multipart",
            HTTP_X_FORWARDED_PROTO="https",
        )
        self.assertEqual(response.status_code, 200, response.data)
        showcase.refresh_from_db()
        self.assertEqual(showcase.title, "Renamed via multipart")
        self.assertEqual(showcase.specs, [{"label": "وزن", "value": "250 گرم"}])
        self.assertTrue(showcase.is_active)

    def test_json_patch_only_product_change_saves(self):
        # Reproduces editing ONLY the linked product (no other field touched)
        # -- the admin panel's ProductSearchSelect keeps its own React state
        # outside react-hook-form, so a product-only change may not mark the
        # form "dirty" and could leave the submit button disabled client-side.
        # This test isolates whether the *backend* accepts such a request.
        product = self.make_product(sku="SHOWCASE-PICK", slug="showcase-pick", name="Pickable Product")
        showcase = HomeShowcase.objects.create(order=1, title="Manual Title", is_active=True)
        response = self.client.patch(
            reverse("admin-homepage-showcase-detail", args=[showcase.pk]),
            {
                "order": showcase.order,
                "product": product.pk,
                "imageAlt": "",
                "title": "Manual Title",
                "description": "",
                "specs": [],
                "ctaLabel": "جزئیات را ببینید",
                "ctaUrl": "",
                "theme": "light",
                "isActive": True,
            },
            format="json",
            HTTP_X_FORWARDED_PROTO="https",
        )
        self.assertEqual(response.status_code, 200, response.data)
        showcase.refresh_from_db()
        self.assertEqual(showcase.product_id, product.pk)

    def test_product_id_serializes_as_string(self):
        # Every other entity id in this codebase (products, categories,
        # showcases themselves) serializes as a string -- ModelSerializer's
        # auto-generated field for this FK returned a raw int instead, which
        # the admin panel's Zod schema (product: z.string().nullable())
        # rejected with "Expected string, received number" on every GET-then
        # -PATCH round trip for a showcase that already had a product linked.
        # Confirmed live: this silently blocked saving that block no matter
        # what else was edited (title, specs, isActive, ...), and the
        # generic invalid-form toast pointed at specs instead of this.
        product = self.make_product(sku="SHOWCASE-STR", slug="showcase-str", name="String Id Product")
        showcase = HomeShowcase.objects.create(order=1, product=product, is_active=True)
        response = self.client.get(reverse("admin-homepage-showcase-detail", args=[showcase.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["product"], str(product.pk))
        self.assertIsInstance(response.data["product"], str)

    def test_linked_product_autofills_title_image_link(self):
        product = self.make_product(sku="SHOWCASE-01", slug="showcase-product", name="Showcase Product")
        showcase = HomeShowcase.objects.create(order=1, product=product, is_active=True)
        response = self.client.get(reverse("admin-homepage-showcase-detail", args=[showcase.pk]))
        self.assertEqual(response.data["resolved_title"], "Showcase Product")
        self.assertEqual(response.data["resolved_cta_url"], "/products/showcase-product")
        self.assertEqual(response.data["product_detail"]["slug"], "showcase-product")

    def test_deleted_linked_product_does_not_break_showcase(self):
        # HOMEPAGE-ADMIN-TASK.md §1: "بلوک نباید بشکند" — on_delete=SET_NULL
        # keeps the showcase row alive with the FK cleared. stock=0 so no
        # StockMovement row exists — Product.delete() is PROTECTed by any
        # movement history, which isn't what this test is about.
        product = self.make_product(sku="SHOWCASE-02", slug="showcase-product-2", name="Showcase Product 2", stock=0)
        showcase = HomeShowcase.objects.create(order=1, product=product, title="Manual Title", is_active=True)
        product.delete()
        showcase.refresh_from_db()
        self.assertIsNone(showcase.product_id)
        response = self.client.get(reverse("admin-homepage-showcase-detail", args=[showcase.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["resolved_title"], "Manual Title")

    def test_deactivated_linked_product_falls_back_to_manual_values(self):
        product = self.make_product(sku="SHOWCASE-03", slug="showcase-product-3", name="Showcase Product 3")
        showcase = HomeShowcase.objects.create(order=1, product=product, is_active=True)
        # .update() bypasses Product.save()'s stock_count-mutation guard —
        # this test only cares about is_active, and the in-memory `product`
        # object's stock_count is stale anyway (make_product's stock movement
        # updated it in the DB, not on this Python object).
        Product.objects.filter(pk=product.pk).update(is_active=False)
        response = self.client.get(reverse("admin-homepage-showcase-detail", args=[showcase.pk]))
        # No manual title was ever set, and the product is no longer usable
        # for auto-fill — resolved_title falls back to blank rather than an
        # inactive product's name, per _product_is_usable(). product_detail
        # itself is a different, admin-only concern: it stays visible
        # (with its own is_active flag) so the admin can actually see which
        # product is linked and notice it needs attention, rather than the
        # panel silently pretending nothing is linked.
        self.assertEqual(response.data["resolved_title"], "")
        self.assertIsNotNone(response.data["product_detail"])
        self.assertFalse(response.data["product_detail"]["is_active"])


class AdminCommunityTileApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_seventh_active_tile_rejected(self):
        for i in range(1, 7):
            CommunityTile.objects.create(order=i, is_active=True)
        response = self.client.post(
            reverse("admin-homepage-tile-list"), {"order": 7, "isActive": True}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("is_active", response.data)

    def test_sixth_active_tile_accepted(self):
        for i in range(1, 6):
            CommunityTile.objects.create(order=i, is_active=True)
        response = self.client.post(
            reverse("admin-homepage-tile-list"), {"order": 6, "isActive": True}, format="json"
        )
        self.assertEqual(response.status_code, 201)


# PublicHomepageApiTests (public `homepage` endpoint, apps.content.urls)
# removed in D-01 along with the public API layer it tested — ArByte's
# storefront reads homepage content from `HomepageBlock`/apps/api (Nest)
# today, and will read it from this backend's own /api/v1/ in D-03.
