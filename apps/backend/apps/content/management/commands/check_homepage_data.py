"""AUDIT §۱۴ — بررسی فقط‌خواندنی داده‌ی واقعی صفحه‌ی اصلی روی هر محیط.

    python manage.py check_homepage_data [--strict]

از همان `get_homepage()` که فروشگاه می‌خواند استفاده می‌کند (نه پرس‌وجوی
موازی)، پس «بلوک فعال ولی پنهان» (مثلاً دوئل با محصول ناموجود) هم دیده
می‌شود. هیچ داده‌ای تغییر نمی‌کند. --strict: با مشکل، کد خروج ۱.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.content.models import BlogPost, HomepageBlock
from apps.public_api.services import get_homepage
from apps.settings.models import SiteSettings


class Command(BaseCommand):
    help = "بررسی فقط‌خواندنی داده‌ی بخش‌های صفحه‌ی اصلی (AUDIT §۱۴)."

    def add_arguments(self, parser):
        parser.add_argument("--strict", action="store_true")

    def handle(self, *args, strict=False, **options):
        problems: list[str] = []
        rows = {row.type: row for row in HomepageBlock.objects.filter(is_active=True).order_by("sort_order")}
        served = {block["type"]: block for block in get_homepage()["blocks"]}

        def line(section: str, ok: bool, detail: str):
            self.stdout.write(f"{'OK ' if ok else '!! '} {section:<14} {detail}")
            if not ok:
                problems.append(section)

        for kind in ("HERO", "CATEGORY_GRID", "FLAGSHIP_DUEL", "PRODUCT_RAIL", "BENEFITS"):
            row, block = rows.get(kind), served.get(kind)
            if row is None:
                line(kind, False, "بلوک فعال وجود ندارد")
                continue
            if block is None:
                line(kind, False, "بلوک فعال است ولی به فروشگاه نمی‌رسد (زمان‌بندی یا محصول/دسته‌ی ناموجود)")
                continue
            config = row.config or {}
            if kind == "HERO":
                line(kind, bool(block.get("framesManifest")), f"manifest={block.get('framesManifest')!r}")
            elif kind == "CATEGORY_GRID":
                wanted, cats = config.get("categorySlugs") or [], block["categories"]
                no_image = [c["slug"] for c in cats if not c.get("image")]
                line(kind, len(cats) == len(wanted) and not no_image, f"{len(cats)}/{len(wanted)} دسته؛ بی‌تصویر: {no_image or '-'}")
            elif kind == "FLAGSHIP_DUEL":
                empty = [m["label"] for m in block["metrics"] if not all(m["values"])]
                names = " vs ".join(p["name"] for p in block["products"])
                line(kind, not empty, f"{names}؛ معیار خالی: {empty or '-'}")
            elif kind == "PRODUCT_RAIL":
                wanted, cards = config.get("productSlugs") or [], block["products"]
                missing = sorted(set(wanted) - {c["slug"] for c in cards})
                no_image = [c["slug"] for c in cards if not c.get("image")]
                line(kind, not missing and not no_image and bool(cards), f"{len(cards)}/{len(wanted)} محصول؛ ناموجود: {missing or '-'}؛ بی‌تصویر: {no_image or '-'}")
            else:
                line(kind, True, row.title or "")

        posts = BlogPost.objects.filter(is_published=True, published_at__lte=timezone.now()).count()
        line("JOURNAL", posts > 0, f"{posts} نوشته‌ی منتشرشده")
        site = SiteSettings.load()
        line("FAQ/SUPPORT", bool(site.phone_display and site.business_hours), f"تلفن={'دارد' if site.phone_display else 'ندارد'}، ساعت کاری={len(site.business_hours or [])} ردیف")
        socials = [k for k in ("instagram_url", "telegram_url", "whatsapp_url", "linkedin_url", "youtube_url") if getattr(site, k)]
        line("COMMUNITY", bool(socials), f"شبکه‌ها: {socials or '-'}")

        self.stdout.write(f"\n{len(problems)} مشکل." if problems else "\nهمه‌ی بخش‌ها داده دارند.")
        if strict and problems:
            raise SystemExit(1)
