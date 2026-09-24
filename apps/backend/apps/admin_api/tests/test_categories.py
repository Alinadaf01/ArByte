import io

from django.urls import reverse
from PIL import Image
from rest_framework.test import APITestCase

from apps.catalog.models import Category

from .base import AdminApiTestMixin


def _fake_image_file(name="logo.png"):
    buffer = io.BytesIO()
    Image.new("RGB", (10, 10), color="red").save(buffer, format="PNG")
    buffer.seek(0)
    buffer.name = name
    return buffer


class AdminCategoryApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_create_and_list(self):
        response = self.client.post(reverse("admin-category-list"), {"slug": "stands", "name": "Stands"}, format="json")
        self.assertEqual(response.status_code, 201)
        response = self.client.get(reverse("admin-category-list"))
        self.assertEqual(response.data["count"], 1)

    def test_two_level_max_depth_enforced(self):
        top = Category.objects.create(slug="top", name="Top")
        child = Category.objects.create(slug="child", name="Child", parent=top)
        response = self.client.post(
            reverse("admin-category-list"), {"slug": "grandchild", "name": "Grandchild", "parent": child.pk}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_child_of_top_level_is_allowed(self):
        top = Category.objects.create(slug="top", name="Top")
        response = self.client.post(
            reverse("admin-category-list"), {"slug": "child", "name": "Child", "parent": top.pk}, format="json"
        )
        self.assertEqual(response.status_code, 201)

    def test_create_with_image_upload(self):
        response = self.client.post(
            reverse("admin-category-list"),
            {"slug": "with-image", "name": "With Image", "image": _fake_image_file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        category = Category.objects.get(slug="with-image")
        self.assertTrue(category.image)

    def test_delete_category_with_products_is_400_not_500(self):
        category = Category.objects.create(slug="occupied", name="Occupied")
        self.make_product(category=category)
        response = self.client.delete(reverse("admin-category-detail", args=[category.pk]))
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)
        self.assertTrue(Category.objects.filter(pk=category.pk).exists())

    def test_delete_category_with_no_products_succeeds(self):
        category = Category.objects.create(slug="empty", name="Empty")
        response = self.client.delete(reverse("admin-category-detail", args=[category.pk]))
        self.assertEqual(response.status_code, 204)

    def test_patch_adds_image_to_existing_category(self):
        category = Category.objects.create(slug="no-image-yet", name="No Image Yet")
        response = self.client.patch(
            reverse("admin-category-detail", args=[category.pk]),
            {"image": _fake_image_file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        category.refresh_from_db()
        self.assertTrue(category.image)
