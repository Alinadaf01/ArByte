"""D-04 §۳/§۵ — سبد مهمان روی واریانت + ادغام موقع ورود + سقف تعداد/موجودی."""

from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.inventory.models import Inventory
from apps.orders.models import Cart, CartItem
from apps.public_api.jwt_tokens import issue_tokens
from apps.users.models import OTPCode, User

CART_SESSION_HEADER = "HTTP_X_CART_SESSION"


def _make_variant(sku="CART-1", quantity=10) -> ProductVariant:
    brand = Brand.objects.create(name=f"Brand {sku}", slug=f"{sku.lower()}-brand")
    category = Category.objects.create(slug=f"{sku.lower()}-cat", name="دسته")
    product = Product.objects.create(
        slug=f"{sku.lower()}-product", name="محصول سبد", brand=brand, category=category, condition="NEW"
    )
    variant = ProductVariant.objects.create(product=product, sku=sku, is_default=True, final_price=10_000_000)
    Inventory.objects.create(variant=variant, quantity=quantity)
    return variant


class GuestCartTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.variant = _make_variant(sku="GUEST-1")

    def test_first_add_returns_session_header(self):
        response = self.client.post(
            "/api/v1/cart/items", {"variantId": self.variant.pk, "quantity": 1}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        session_key = response["X-Cart-Session"]
        self.assertTrue(session_key)
        self.assertEqual(response.data["data"]["itemCount"], 1)

    def test_reusing_session_header_accumulates_same_cart(self):
        first = self.client.post(
            "/api/v1/cart/items", {"variantId": self.variant.pk, "quantity": 1}, format="json"
        )
        session_key = first["X-Cart-Session"]

        second = self.client.post(
            "/api/v1/cart/items",
            {"variantId": self.variant.pk, "quantity": 1},
            format="json",
            **{CART_SESSION_HEADER: session_key},
        )
        self.assertEqual(second.status_code, 201)
        self.assertEqual(second.data["data"]["itemCount"], 2)
        self.assertEqual(Cart.objects.filter(session_key=session_key).count(), 1)

    def test_price_and_label_come_from_live_variant(self):
        response = self.client.post(
            "/api/v1/cart/items", {"variantId": self.variant.pk, "quantity": 2}, format="json"
        )
        item = response.data["data"]["items"][0]
        self.assertEqual(item["variant"]["price"]["final"], 10_000_000)
        self.assertEqual(item["lineTotal"], 20_000_000)

    def test_quantity_above_five_is_validation_error(self):
        response = self.client.post(
            "/api/v1/cart/items", {"variantId": self.variant.pk, "quantity": 6}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "VALIDATION_ERROR")

    def test_quantity_exceeding_stock_is_insufficient_stock(self):
        low_stock = _make_variant(sku="LOW-1", quantity=2)
        response = self.client.post(
            "/api/v1/cart/items", {"variantId": low_stock.pk, "quantity": 3}, format="json"
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "INSUFFICIENT_STOCK")

    def test_out_of_stock_variant_is_variant_unavailable(self):
        out_of_stock = _make_variant(sku="OOS-1", quantity=0)
        response = self.client.post(
            "/api/v1/cart/items", {"variantId": out_of_stock.pk, "quantity": 1}, format="json"
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "VARIANT_UNAVAILABLE")

    def test_unknown_variant_is_variant_not_found(self):
        response = self.client.post("/api/v1/cart/items", {"variantId": 999999, "quantity": 1}, format="json")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["code"], "VARIANT_NOT_FOUND")

    def test_patch_and_delete_item(self):
        add = self.client.post(
            "/api/v1/cart/items", {"variantId": self.variant.pk, "quantity": 1}, format="json"
        )
        session_key = add["X-Cart-Session"]
        item_id = add.data["data"]["items"][0]["id"]

        patched = self.client.patch(
            f"/api/v1/cart/items/{item_id}", {"quantity": 3}, format="json", **{CART_SESSION_HEADER: session_key}
        )
        self.assertEqual(patched.status_code, 200)
        self.assertEqual(patched.data["data"]["items"][0]["quantity"], 3)

        deleted = self.client.delete(f"/api/v1/cart/items/{item_id}", **{CART_SESSION_HEADER: session_key})
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(deleted.data["data"]["itemCount"], 0)

    def test_get_cart_empty_for_new_session(self):
        response = self.client.get("/api/v1/cart")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["items"], [])
        self.assertTrue(response["X-Cart-Session"])


class UserCartTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(phone="09144440001", is_verified=True)
        access_token, _ = issue_tokens(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        self.variant = _make_variant(sku="USER-1")

    def test_logged_in_cart_has_no_session_header(self):
        response = self.client.post(
            "/api/v1/cart/items", {"variantId": self.variant.pk, "quantity": 1}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertNotIn("X-Cart-Session", response)
        self.assertEqual(Cart.objects.get(user=self.user).items.count(), 1)


class GuestToLoginMergeTests(TestCase):
    def setUp(self):
        # هم‌دلیل OtpRequestTests.setUp در tests_d04_auth.py — throttle cache
        # بین تست‌ها rollback نمی‌شود.
        cache.clear()
        self.client = APIClient()
        self.mobile = "09155550001"
        self.variant_a = _make_variant(sku="MERGE-A", quantity=10)
        self.variant_b = _make_variant(sku="MERGE-B", quantity=1)

    def _request_and_get_code(self) -> str:
        self.client.post("/api/v1/auth/otp/request", {"mobile": self.mobile}, format="json")
        otp = OTPCode.objects.filter(phone=self.mobile).order_by("-created_at").first()
        otp.code_hash = make_password("1234")
        otp.save(update_fields=["code_hash"])
        return "1234"

    def test_guest_cart_merges_into_user_cart_on_verify(self):
        guest_add = self.client.post(
            "/api/v1/cart/items", {"variantId": self.variant_a.pk, "quantity": 2}, format="json"
        )
        session_key = guest_add["X-Cart-Session"]

        code = self._request_and_get_code()
        verify = self.client.post(
            "/api/v1/auth/otp/verify",
            {"mobile": self.mobile, "code": code, "cartSessionKey": session_key},
            format="json",
        )
        self.assertEqual(verify.status_code, 200)

        user = User.objects.get(phone=self.mobile)
        user_cart = Cart.objects.get(user=user)
        self.assertEqual(user_cart.items.get(variant=self.variant_a).quantity, 2)
        self.assertFalse(Cart.objects.filter(session_key=session_key).exists())

    def test_merge_sums_quantity_with_existing_user_cart_item(self):
        access_token, _ = issue_tokens(User.objects.create_user(phone=self.mobile, is_verified=True))
        logged_in_client = APIClient()
        logged_in_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        logged_in_client.post("/api/v1/cart/items", {"variantId": self.variant_a.pk, "quantity": 2}, format="json")

        guest_add = self.client.post(
            "/api/v1/cart/items", {"variantId": self.variant_a.pk, "quantity": 2}, format="json"
        )
        session_key = guest_add["X-Cart-Session"]

        code = self._request_and_get_code()
        self.client.post(
            "/api/v1/auth/otp/verify",
            {"mobile": self.mobile, "code": code, "cartSessionKey": session_key},
            format="json",
        )

        user = User.objects.get(phone=self.mobile)
        item = CartItem.objects.get(cart__user=user, variant=self.variant_a)
        self.assertEqual(item.quantity, 4)

    def test_merge_caps_at_available_stock(self):
        # variant_b فقط ۱ موجودی دارد؛ سبد مهمان با ۱ عدد (سقف موقع افزودن
        # هم رعایت می‌شود) بعد از ادغام نباید از موجودی رد شود.
        self.client.post("/api/v1/cart/items", {"variantId": self.variant_b.pk, "quantity": 1}, format="json")
        guest_cart = Cart.objects.get(session_key__isnull=False)
        # موجودی را بعد از افزودن به ۰ می‌رسانیم تا سقف merge را واقعاً تست کنیم.
        inventory = Inventory.objects.get(variant=self.variant_b)
        inventory.quantity = 0
        inventory.save(update_fields=["quantity"])

        code = self._request_and_get_code()
        self.client.post(
            "/api/v1/auth/otp/verify",
            {"mobile": self.mobile, "code": code, "cartSessionKey": guest_cart.session_key},
            format="json",
        )
        user = User.objects.get(phone=self.mobile)
        self.assertFalse(CartItem.objects.filter(cart__user=user, variant=self.variant_b).exists())

    def test_verify_without_cart_session_key_does_not_error(self):
        code = self._request_and_get_code()
        response = self.client.post("/api/v1/auth/otp/verify", {"mobile": self.mobile, "code": code}, format="json")
        self.assertEqual(response.status_code, 200)
