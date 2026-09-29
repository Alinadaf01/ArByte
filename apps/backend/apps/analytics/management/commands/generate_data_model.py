"""G-03 — `docs/data-model.md` و `docs/erd.md` از مدل‌های Django بازتولید
می‌شوند (منبع حقیقت بعد از حذف Nest/Prisma). بعد از هر migration:

    python manage.py generate_data_model
"""

from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import models

PROJECT_APPS = ("apps.",)
DOCS = Path(settings.BASE_DIR).parent.parent / "docs"


def _project_models():
    for config in apps.get_app_configs():
        if config.name.startswith(PROJECT_APPS):
            ms = sorted(config.get_models(), key=lambda m: m.__name__)
            if ms:
                yield config, ms


def _field_type(field) -> str:
    if field.is_relation and field.related_model:
        kind = {models.ForeignKey: "FK", models.OneToOneField: "1:1", models.ManyToManyField: "M2M"}.get(type(field), "rel")
        return f"{kind} → {field.related_model.__name__}"
    t = field.get_internal_type()
    if getattr(field, "max_length", None) and t in ("CharField", "SlugField"):
        t += f"({field.max_length})"
    return t


def _flags(field) -> str:
    bits = []
    if field.primary_key:
        bits.append("PK")
    if getattr(field, "unique", False) and not field.primary_key:
        bits.append("unique")
    if field.null:
        bits.append("null")
    if field.choices:
        bits.append("choices: " + ", ".join(str(c[0]) for c in field.choices[:8]) + ("…" if len(field.choices) > 8 else ""))
    return " · ".join(bits)


class Command(BaseCommand):
    help = "docs/data-model.md و docs/erd.md را از مدل‌های Django می‌سازد."

    def handle(self, *args, **options):
        lines = [
            "# مدل داده — آربایت",
            "",
            "> خودکار ساخته شده با `python manage.py generate_data_model` (apps/backend)؛ دستی ویرایش نکنید.",
            "> منبع حقیقت: مدل‌های Django در `apps/backend/apps/*/models.py`. نمودار روابط: [erd.md](./erd.md).",
            "",
        ]
        erd = ["# ERD — آربایت", "", "> خودکار از مدل‌های Django (`generate_data_model`).", "", "```mermaid", "erDiagram"]
        project_labels = {c.label for c, _ in _project_models()}
        for config, ms in _project_models():
            lines += [f"## {config.label}", ""]
            for model in ms:
                meta = model._meta
                doc = " ".join((model.__doc__ or "").strip().split("\n\n")[0].split())
                if doc.startswith(model.__name__ + "("):
                    doc = ""
                lines += [f"### {model.__name__}", "", f"جدول `{meta.db_table}`" + (f" — {doc}" if doc else ""), ""]
                lines += ["| فیلد | نوع | ویژگی |", "| --- | --- | --- |"]
                for field in meta.get_fields():
                    if field.auto_created and not field.concrete:
                        continue
                    lines.append(f"| `{field.name}` | {_field_type(field)} | {_flags(field)} |")
                constraints = [c.name for c in getattr(meta, "constraints", [])]
                if constraints:
                    lines += ["", "قیدها: " + "، ".join(f"`{c}`" for c in constraints)]
                lines.append("")
                for field in meta.get_fields():
                    if field.concrete and field.is_relation and field.related_model and field.related_model._meta.app_label in project_labels:
                        right = field.related_model.__name__
                        card = "||--||" if isinstance(field, models.OneToOneField) else ("}o--o{" if field.many_to_many else "}o--||")
                        erd.append(f'  {model.__name__} {card} {right} : "{field.name}"')
        erd += ["```", ""]
        (DOCS / "data-model.md").write_text("\n".join(lines), encoding="utf-8")
        (DOCS / "erd.md").write_text("\n".join(erd), encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"wrote {DOCS / 'data-model.md'} and erd.md"))
