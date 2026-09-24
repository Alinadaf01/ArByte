from django.urls import reverse
from rest_framework.test import APITestCase

from apps.catalog.models import Product

from .base import AdminApiTestMixin


class AdminProductApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.staff = self.make_staff()
        self.client.force_authenticate(user=self.staff)
        self.product = self.make_product(stock=7)

    def test_list_products(self):
        response = self.client.get(reverse("admin-product-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["stock_count"], 7)

    def test_filter_by_in_stock(self):
        out_of_stock = self.make_product(sku="OOS-001", slug="oos-product", stock=0)
        response = self.client.get(reverse("admin-product-list"), {"inStock": "true"})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.product.pk))

        response = self.client.get(reverse("admin-product-list"), {"inStock": "false"})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(out_of_stock.pk))

    def test_stock_count_is_read_only_on_update(self):
        response = self.client.patch(
            reverse("admin-product-detail", args=[self.product.pk]), {"stockCount": 999}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 7)  # unchanged — stockCount write silently ignored

    def test_update_name_and_price(self):
        response = self.client.patch(
            reverse("admin-product-detail", args=[self.product.pk]), {"name": "Renamed", "price": 200000}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, "Renamed")
        self.assertEqual(self.product.price, 200000)

    def test_create_product(self):
        response = self.client.post(
            reverse("admin-product-list"),
            {"sku": "NEW-001", "slug": "new-product", "name": "New Product", "price": 50000, "category": self.product.category_id},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Product.objects.filter(sku="NEW-001").count(), 1)

    def test_delete_product_with_no_stock_history(self):
        fresh = self.make_product(sku="FRESH-001", slug="fresh-product", stock=0)
        response = self.client.delete(reverse("admin-product-detail", args=[fresh.pk]))
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Product.objects.filter(pk=fresh.pk).exists())

    def test_delete_product_with_stock_history_is_400_not_500(self):
        # self.product has a "purchase" StockMovement from setUp (stock=7) —
        # StockMovement.product is on_delete=PROTECT, so this must surface
        # as a clean 400, never an unhandled ProtectedError.
        response = self.client.delete(reverse("admin-product-detail", args=[self.product.pk]))
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)
        self.assertTrue(Product.objects.filter(pk=self.product.pk).exists())

    def test_filter_by_search(self):
        self.make_product(sku="ZZZ-999", slug="other", name="Other Widget", stock=0)
        response = self.client.get(reverse("admin-product-list"), {"search": "Other"})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["sku"], "ZZZ-999")

    def test_add_and_delete_product_image(self):
        create = self.client.post(
            reverse("admin-product-image-create", args=[self.product.pk]),
            {"alt": "Front view", "order": 1},
            format="multipart",
        )
        self.assertEqual(create.status_code, 201)
        image_id = create.data["id"]
        delete = self.client.delete(reverse("admin-product-image-delete", args=[self.product.pk, image_id]))
        self.assertEqual(delete.status_code, 204)

    def test_reorder_product_image(self):
        create = self.client.post(
            reverse("admin-product-image-create", args=[self.product.pk]),
            {"alt": "Front view", "order": 1},
            format="multipart",
        )
        image_id = create.data["id"]
        response = self.client.patch(
            reverse("admin-product-image-delete", args=[self.product.pk, image_id]), {"order": 2}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["order"], 2)

    def test_add_update_delete_color(self):
        create = self.client.post(
            reverse("admin-product-color-list", args=[self.product.pk]),
            {"name": "Black", "hex": "#111111"},
            format="json",
        )
        self.assertEqual(create.status_code, 201)
        color_id = create.data["id"]

        update = self.client.patch(
            reverse("admin-product-color-detail", args=[self.product.pk, color_id]), {"inStock": False}, format="json"
        )
        self.assertEqual(update.status_code, 200)
        self.assertFalse(update.data["in_stock"])

        delete = self.client.delete(reverse("admin-product-color-detail", args=[self.product.pk, color_id]))
        self.assertEqual(delete.status_code, 204)
