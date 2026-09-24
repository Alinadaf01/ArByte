from django.contrib.auth.models import Group

from apps.catalog.models import Category, Product
from apps.inventory.models import StockMovement
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

    def make_product(self, *, sku="TEST-001", slug="test-product", name="Test Product", price=100000, stock=10, category=None) -> Product:
        if category is None:
            category, _ = Category.objects.get_or_create(slug="desktop-stands", defaults={"name": "Desktop Stands"})
        product = Product.objects.create(sku=sku, slug=slug, name=name, price=price, category=category)
        if stock:
            StockMovement.objects.record(product, "purchase", stock, reference="PO-TEST")
        return product
