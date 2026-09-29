from pathlib import Path

from django.core.management.base import BaseCommand

from apps.documents.warranty_demo import render_demo_html, render_demo_pdf

DEFAULT_OUT = Path(__file__).resolve().parents[6] / "docs" / "design" / "documents"


class Command(BaseCommand):
    help = "DEMO — حالت‌های کارت گارانتی را با داده‌ی نمونه در warranty-demo.pdf رندر می‌کند (بدون دیتابیس)."

    def add_arguments(self, parser):
        parser.add_argument("--out", default=str(DEFAULT_OUT))
        parser.add_argument(
            "--html", action="store_true",
            help="warranty-demo.html هم برای پیش‌نمایش در مرورگر (چند مگابایت، لوگو/فونت inline؛ کامیت نشود).",
        )

    def handle(self, *args, out, html, **options):
        out_dir = Path(out)
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "warranty-demo.pdf").write_bytes(render_demo_pdf())
        if html:
            (out_dir / "warranty-demo.html").write_text(render_demo_html(), encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"warranty-demo → {out_dir}"))
