"""G-02 — بند ۱۰.۷۰ برندبوک: تغییر slug (محصول، دسته، نوشته) و حذف محصول
بدون ریدایرکت، لینک‌های ایندکس‌شده را می‌شکند؛ این‌جا خودکار 301 ساخته می‌شود."""

from django.db.models.signals import pre_save
from django.dispatch import receiver

from apps.catalog.models import Category, Product

from .models import BlogPost, Redirect


def _clear_live(path: str) -> None:
    """مسیری که دوباره صاحب صفحه‌ی زنده شد نباید ریدایرکت شود."""
    Redirect.objects.filter(from_path=path).delete()


def _previous(sender, instance):
    if not instance.pk:
        return None
    return (
        sender.objects.filter(pk=instance.pk)
        .values("slug", *(["deleted_at"] if hasattr(instance, "deleted_at") else []))
        .first()
    )


@receiver(pre_save, sender=Product)
def product_redirects(sender, instance, **kwargs):
    old = _previous(sender, instance)
    if not old:
        _clear_live(f"/products/{instance.slug}")
        return
    if old["slug"] != instance.slug:
        Redirect.point(f"/products/{old['slug']}", f"/products/{instance.slug}")
    if old.get("deleted_at") is None and instance.deleted_at is not None and instance.category_id:
        # محصول حذف‌شده → صفحه‌ی دسته‌اش (نه 404).
        Redirect.point(f"/products/{instance.slug}", f"/category/{instance.category.slug}")


@receiver(pre_save, sender=Category)
def category_redirects(sender, instance, **kwargs):
    old = _previous(sender, instance)
    if not old:
        _clear_live(f"/category/{instance.slug}")
    elif old["slug"] != instance.slug:
        Redirect.point(f"/category/{old['slug']}", f"/category/{instance.slug}")


@receiver(pre_save, sender=BlogPost)
def blog_redirects(sender, instance, **kwargs):
    old = _previous(sender, instance)
    if not old:
        _clear_live(f"/blog/{instance.slug}")
    elif old["slug"] != instance.slug:
        Redirect.point(f"/blog/{old['slug']}", f"/blog/{instance.slug}")
