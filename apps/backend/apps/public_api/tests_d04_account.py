"""D-04 §۲/§۵ — پروفایل، آدرس (CRUD + isDefault یکتا)، علاقه‌مندی + merge."""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.content.models import Favorite
from apps.public_api.jwt_tokens import issue_tokens
from apps.users.models import Address, User


def _make_product(slug="test-product") -> Product:
    brand = Brand.objects.create(name=f"Brand {slug}", slug=f"{slug}-brand")
    category = Category.objects.create(slug=f"{slug}-cat", name="دسته")
    return Product.objects.create(slug=slug, name="محصول تست", brand=brand, category=category, condition="NEW")


class AuthenticatedApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(phone="09133330001", is_verified=True)
        access_token, _ = issue_tokens(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")


class ProfileTests(AuthenticatedApiTestCase):
    def test_get_profile(self):
        response = self.client.get("/api/v1/account/profile")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["mobile"], self.user.phone)

    def test_patch_profile_updates_names(self):
        response = self.client.patch(
            "/api/v1/account/profile", {"firstName": "علی", "lastName": "ندافی"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "علی")
        self.assertEqual(self.user.last_name, "ندافی")


class AddressTests(AuthenticatedApiTestCase):
    def _address_payload(self, **overrides):
        payload = {
            "recipientName": "علی نداف",
            "mobile": "09121234567",
            "province": "تهران",
            "city": "تهران",
            "addressLine": "خیابان آزادی",
            "postalCode": "1234567890",
            "isDefault": True,
        }
        payload.update(overrides)
        return payload

    def test_create_and_list_address(self):
        response = self.client.post("/api/v1/account/addresses", self._address_payload(), format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["data"]["isDefault"])

        listed = self.client.get("/api/v1/account/addresses")
        self.assertEqual(len(listed.data["data"]), 1)

    def test_second_default_unsets_first(self):
        self.client.post("/api/v1/account/addresses", self._address_payload(), format="json")
        self.client.post("/api/v1/account/addresses", self._address_payload(city="مشهد"), format="json")
        addresses = Address.objects.filter(user=self.user)
        self.assertEqual(addresses.count(), 2)
        self.assertEqual(addresses.filter(is_default=True).count(), 1)
        self.assertEqual(addresses.get(is_default=True).city, "مشهد")

    def test_patch_and_delete_address(self):
        created = self.client.post("/api/v1/account/addresses", self._address_payload(), format="json")
        address_id = created.data["data"]["id"]

        patched = self.client.patch(f"/api/v1/account/addresses/{address_id}", {"city": "اصفهان"}, format="json")
        self.assertEqual(patched.status_code, 200)
        self.assertEqual(patched.data["data"]["city"], "اصفهان")

        deleted = self.client.delete(f"/api/v1/account/addresses/{address_id}")
        self.assertEqual(deleted.status_code, 200)
        self.assertFalse(Address.objects.filter(pk=address_id).exists())

    def test_address_not_found(self):
        response = self.client.patch("/api/v1/account/addresses/999999", {"city": "اصفهان"}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_other_users_address_is_not_visible(self):
        other = User.objects.create_user(phone="09133330099", is_verified=True)
        Address.objects.create(
            user=other, receiver_name="دیگری", receiver_phone="09121234567", province="تهران",
            city="تهران", line="خیابان", postal_code="1234567890",
        )
        response = self.client.get("/api/v1/account/addresses")
        self.assertEqual(len(response.data["data"]), 0)


class WishlistTests(AuthenticatedApiTestCase):
    def setUp(self):
        super().setUp()
        self.product = _make_product("wishlist-product")
        self.variant = ProductVariant.objects.create(
            product=self.product, sku="WL-1", is_default=True, final_price=100_000_000
        )

    def test_add_and_list_wishlist_item(self):
        response = self.client.post("/api/v1/account/wishlist", {"productId": self.product.pk}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["data"]["product"]["slug"], self.product.slug)

        listed = self.client.get("/api/v1/account/wishlist")
        self.assertEqual(len(listed.data["data"]), 1)

    def test_add_records_price_at_save(self):
        self.client.post("/api/v1/account/wishlist", {"productId": self.product.pk}, format="json")
        favorite = Favorite.objects.get(user=self.user, product=self.product)
        self.assertEqual(favorite.price_at_save, 100_000_000)

    def test_delete_wishlist_item(self):
        created = self.client.post("/api/v1/account/wishlist", {"productId": self.product.pk}, format="json")
        item_id = created.data["data"]["id"]
        response = self.client.delete(f"/api/v1/account/wishlist/{item_id}")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Favorite.objects.filter(pk=item_id).exists())

    def test_add_unknown_product_is_not_found(self):
        response = self.client.post("/api/v1/account/wishlist", {"productId": 999999}, format="json")
        self.assertEqual(response.status_code, 404)


class WishlistMergeTests(AuthenticatedApiTestCase):
    def setUp(self):
        super().setUp()
        self.product_a = _make_product("merge-a")
        self.product_b = _make_product("merge-b")
        ProductVariant.objects.create(product=self.product_a, sku="MA-1", is_default=True, final_price=1)
        ProductVariant.objects.create(product=self.product_b, sku="MB-1", is_default=True, final_price=1)

    def test_merge_adds_new_local_items(self):
        response = self.client.post(
            "/api/v1/account/wishlist/merge",
            [
                {"productSlug": self.product_a.slug, "priceAtSave": 50_000_000},
                {"productSlug": self.product_b.slug, "priceAtSave": 60_000_000},
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Favorite.objects.filter(user=self.user).count(), 2)
        favorite_a = Favorite.objects.get(user=self.user, product=self.product_a)
        self.assertEqual(favorite_a.price_at_save, 50_000_000)

    def test_merge_does_not_overwrite_existing_account_item(self):
        Favorite.objects.create(user=self.user, product=self.product_a, price_at_save=999)
        self.client.post(
            "/api/v1/account/wishlist/merge",
            [{"productSlug": self.product_a.slug, "priceAtSave": 1}],
            format="json",
        )
        favorite_a = Favorite.objects.get(user=self.user, product=self.product_a)
        self.assertEqual(favorite_a.price_at_save, 999)

    def test_merge_skips_unknown_slug_gracefully(self):
        response = self.client.post(
            "/api/v1/account/wishlist/merge", [{"productSlug": "does-not-exist"}], format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Favorite.objects.filter(user=self.user).count(), 0)


class DeviceListTests(AuthenticatedApiTestCase):
    """E-05 §۳ — «دستگاه‌های من»: فقط OrderItemUnitهای سفارش‌های DELIVERED
    کاربر، با تاریخ‌های آماده برای نمایش."""

    def _make_delivered_order_with_unit(self, *, warranty_months=24, delivered=True):
        from django.utils import timezone

        from apps.catalog.models import Brand, Category, Product, ProductVariant
        from apps.orders.models import Order, OrderItem, OrderItemUnit

        brand = Brand.objects.create(name="MSI Devices", slug="msi-devices-test")
        category = Category.objects.create(slug="devices-test-cat", name="لپ‌تاپ")
        product = Product.objects.create(
            slug="devices-test-product", name="لپ‌تاپ تست دستگاه‌ها", brand=brand, category=category,
            condition="NEW", warranty_months=warranty_months,
            warranty_provider="گارانتی شرکتی" if warranty_months else None,
        )
        variant = ProductVariant.objects.create(product=product, sku="DEV-TEST-1", is_default=True, final_price=1)
        order = Order.objects.create(
            user=self.user, shipping_recipient_name="", shipping_mobile="", shipping_province="",
            shipping_city="", shipping_address_line="", subtotal=1, final_total=1,
            status="DELIVERED" if delivered else "SHIPPED",
            delivered_at=timezone.now() if delivered else None,
        )
        item = OrderItem.objects.create(
            order=order, variant=variant, product_name_snapshot=product.name, sku_snapshot=variant.sku,
            unit_price=1, quantity=1, final_price=1,
        )
        unit = OrderItemUnit.objects.create(order_item=item, serial_number="SN-DEV-0001")
        return order, unit

    def test_returns_device_for_delivered_order_with_warranty(self):
        self._make_delivered_order_with_unit(warranty_months=24)
        response = self.client.get("/api/v1/account/devices")
        self.assertEqual(response.status_code, 200)
        devices = response.data["data"]
        self.assertEqual(len(devices), 1)
        self.assertEqual(devices[0]["serialNumber"], "SN-DEV-0001")
        self.assertTrue(devices[0]["hasWarranty"])
        self.assertIsNotNone(devices[0]["warrantyEndDate"])

    def test_no_warranty_product_shows_null_warranty_end(self):
        self._make_delivered_order_with_unit(warranty_months=None)
        response = self.client.get("/api/v1/account/devices")
        devices = response.data["data"]
        self.assertFalse(devices[0]["hasWarranty"])
        self.assertIsNone(devices[0]["warrantyEndDate"])

    def test_excludes_units_from_non_delivered_orders(self):
        self._make_delivered_order_with_unit(delivered=False)
        response = self.client.get("/api/v1/account/devices")
        self.assertEqual(response.data["data"], [])

    def test_excludes_other_users_devices(self):
        from apps.users.models import User

        self._make_delivered_order_with_unit()
        other = User.objects.create_user(phone="09133330099", is_verified=True)
        from apps.public_api.jwt_tokens import issue_tokens

        access, _ = issue_tokens(other)
        other_client = APIClient()
        other_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = other_client.get("/api/v1/account/devices")
        self.assertEqual(response.data["data"], [])
