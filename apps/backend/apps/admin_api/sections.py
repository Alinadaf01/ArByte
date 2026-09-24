"""Permission sections — BACKEND-TASK.md §7.5. Each admin panel section gets
up to four actions (view/create/edit/delete, whichever apply). Every
admin_api view's permission_classes should come from permissions.require_section()
here instead of the old blanket IsAdminStaff, so a role can be scoped to
exactly what it needs instead of all-or-nothing.

Dashboard isn't a section — it's a summary of already-gated data and every
staff member can see it, per the spec's own role table never mentioning it.
"""

SECTIONS = [
    ("homepage", "صفحه اصلی", ["view", "create", "edit", "delete"]),
    ("products", "محصولات", ["view", "create", "edit", "delete"]),
    ("categories", "دسته‌بندی‌ها", ["view", "create", "edit", "delete"]),
    ("specs", "مشخصات محصولات", ["view", "create", "edit", "delete"]),
    ("pricing", "اصلاح قیمت", ["view", "edit"]),
    ("cost_price", "قیمت تمام‌شده محصول", ["view"]),
    ("orders", "سفارشات", ["view", "edit"]),
    ("inventory", "موجودی", ["view", "edit"]),
    ("stock_ledger", "کاردکس", ["view", "create"]),
    ("returns", "مرجوعی‌ها", ["view", "edit"]),
    ("messages", "پیام‌ها", ["view", "edit"]),
    ("reviews", "نظرات", ["view", "edit"]),
    ("blog", "بلاگ", ["view", "create", "edit", "delete"]),
    ("coupons", "کدهای تخفیف", ["view", "create", "edit", "delete"]),
    ("reports", "گزارش‌های فروش و سود", ["view"]),
    ("settings", "تنظیمات سایت", ["view", "edit"]),
    ("credentials", "کلیدهای API", ["view", "create", "edit", "delete"]),
    ("users", "کاربران", ["view", "create", "edit"]),
    ("roles", "مدیریت نقش‌ها و دسترسی", ["view", "edit"]),
    ("activity_log", "لاگ فعالیت", ["view"]),
    ("search_console", "سرچ کنسول", ["view"]),
]

SECTION_KEYS = [key for key, _, _ in SECTIONS]
SECTION_LABELS = {key: label for key, label, _ in SECTIONS}
SECTION_ACTIONS = {key: actions for key, _, actions in SECTIONS}

ACTION_LABELS = {"view": "مشاهده", "create": "ایجاد", "edit": "ویرایش", "delete": "حذف"}

# Never granted by default when a NEW role is created — §7.5 "بخش‌های حساس —
# پیش‌فرض خاموش". Enforced by the roles-create endpoint, not just the UI.
SENSITIVE_SECTIONS = {"credentials", "reports", "cost_price", "pricing", "roles", "activity_log"}

PERMISSION_APP_LABEL = "admin_api"


def codename(section: str, action: str) -> str:
    return f"sec_{section}_{action}"


def perm_string(section: str, action: str) -> str:
    return f"{PERMISSION_APP_LABEL}.{codename(section, action)}"


# name -> {description, grants: {section: [actions]}} — created by a data
# migration (see migrations/0002_admin_roles.py). is_system=True on all of
# them (can't be deleted, per §7.5).
DEFAULT_ROLES = {
    "مدیر کل": {
        "description": "دسترسی کامل به همه بخش‌های پنل",
        "grants": {key: list(actions) for key, _, actions in SECTIONS},
    },
    "مدیر محصول": {
        "description": "محصولات، دسته‌بندی‌ها، مشخصات، بلاگ، نظرات، صفحه اصلی — بدون قیمت تمام‌شده و گزارش فروش",
        "grants": {
            "products": ["view", "create", "edit", "delete"],
            "categories": ["view", "create", "edit", "delete"],
            "specs": ["view", "create", "edit", "delete"],
            "blog": ["view", "create", "edit", "delete"],
            "reviews": ["view", "edit"],
            "homepage": ["view", "create", "edit", "delete"],
        },
    },
    "مدیر سفارشات": {
        "description": "سفارشات، موجودی، کاردکس، مرجوعی، پیام‌ها — بدون تنظیمات و گزارش مالی",
        "grants": {
            "orders": ["view", "edit"],
            "inventory": ["view", "edit"],
            "stock_ledger": ["view", "create"],
            "returns": ["view", "edit"],
            "messages": ["view", "edit"],
        },
    },
    "پشتیبانی": {
        "description": "فقط خواندن سفارشات و کاربران، پاسخ به پیام‌ها",
        "grants": {
            "orders": ["view"],
            "users": ["view"],
            "messages": ["view", "edit"],
        },
    },
    "حسابدار": {
        "description": "گزارش‌های فروش و خروجی‌ها — بدون ویرایش هیچ‌چیز",
        "grants": {
            "reports": ["view"],
        },
    },
}
