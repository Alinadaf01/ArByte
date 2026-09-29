from django.contrib.auth.models import Group

from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.inventory.models import Inventory
from apps.users.models import User


class AdminApiTestMixin:
    """Shared fixtures for admin_api tests — every test module needs a
    staff user and non-staff user at minimum to exercise the permission gate."""

    def make_staff(self, phone="09121110001", **kwargs) -> User:
        # مدیر کل (not is_superuser) on purpose — most existing tests just
        # need "can do everything", but routing them through a real granted
        # role (rather than the superuser bypass) also exercises
        # require_section()'s actual permission-string matching, so a typo'd
        # section name would fail these tests too, not just role-scoped ones.
        kwargs.setdefault("is_verified", True)
        user = User.objects.create_user(phone=phone, password="staff-pass-123", is_staff=True, **kwargs)
        user.groups.add(Group.objects.get(name="مدیر کل"))
        return user

    def make_superuser(self, phone="09121110099", **kwargs) -> User:
        kwargs.setdefault("is_verified", True)
        return User.objects.create_user(phone=phone, password="super-pass-123", is_staff=True, is_superuser=True, **kwargs)

    def make_customer(self, phone="09121110002", **kwargs) -> User:
        kwargs.setdefault("is_verified", True)
        return User.objects.create_user(phone=phone, **kwargs)

    def make_product(
        self, *, sku="TEST-001", slug="test-product", name="Test Product", price=100000, stock=10, category=None,
        requires_serial=False,
    ) -> Product:
        """D-02 §۲ — builds the whole Brand/Category/Product/ProductVariant/
        Inventory chain and returns the Product (kept for callers that only
        need `.pk`/`.name`/`.slug`); the default variant is reachable via
        `product.default_variant` or `product.variants.first()`.

        E-03 §۳ — requires_serial پیش‌فرض مدل True است (اکثر دسته‌های واقعی
        سریال‌دارند)، ولی این fixture عمداً False پیش‌فرض می‌گیرد چون بیشتر
        تست‌های ادمین گذار وضعیت را تست می‌کنند نه سریال — کدی که واقعاً
        سریال را تست می‌کند صریح `requires_serial=True` می‌دهد."""
        if category is None:
            category, _ = Category.objects.get_or_create(slug="desktop-stands", defaults={"name": "Desktop Stands"})
        brand, _ = Brand.objects.get_or_create(name="Test Brand", defaults={"slug": "test-brand"})
        product = Product.objects.create(
            slug=slug, name=name, brand=brand, category=category, condition="NEW", requires_serial=requires_serial,
        )
        variant = ProductVariant.objects.create(
            product=product, sku=sku, is_default=True, final_price=price
        )
        Inventory.objects.create(variant=variant, low_stock_threshold=5)
        if stock:
            Inventory.objects.stock_in(variant, stock, reference="fixture")
        return product

    def make_variant(self, *, product=None, **kwargs) -> ProductVariant:
        """For tests that need the ProductVariant directly (OrderItem.variant,
        CartItem.variant, ...)."""
        if product is None:
            product = self.make_product()
        return product.variants.first()
