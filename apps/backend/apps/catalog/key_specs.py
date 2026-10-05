"""AUDIT §۱۲.۴ — مشخصات کلیدی (backend-owned، مرتب‌شده‌ی صریح).

ترتیب از `SpecificationDefinition.key_spec_order` می‌آید و برای هر واریانت
از مشخصات همان واریانت + مشخصات مشترک محصول ساخته می‌شود (مشخصه‌ی واریانت
بر محصول مقدم است). مشخصات کامل (`build_spec_groups`) دست‌نخورده می‌ماند.
"""

import re

MAX_KEY_SPECS = 4

# پیش‌فرض برای تعریف‌های تازه/seed: پردازنده، گرافیک، رم.
_DEFAULT_ORDER = (
    (1, re.compile(r"^(cpu|processor)(-|$)"), ("پردازنده",)),
    (2, re.compile(r"^(gpu|graphics)(-|$)"), ("گرافیک", "کارت گرافیک")),
    (3, re.compile(r"^(ram|memory)(-|$)"), ("حافظه رم", "رم")),
)


def default_key_spec_order(key: str, name_fa: str = "") -> int | None:
    for order, key_re, names in _DEFAULT_ORDER:
        if key_re.match(key or "") or (name_fa or "").strip() in names:
            return order
    return None
