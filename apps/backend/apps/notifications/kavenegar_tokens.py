"""E-03 §۲ — پاک‌سازی مقدار هر پارامتر Lookup کاوه‌نگار طبق قواعد پنل:
`token`/`token2`/`token3` هیچ فاصله‌ای قبول نمی‌کنند (فاصله باعث رد پیامک
می‌شود، نه فقط بدشکلی)، `token10` حداکثر ۵ فاصله، `token20` حداکثر ۸."""

ZWNJ = "‌"

_NO_SPACE_FIELDS = {"token", "token2", "token3"}
_MAX_SPACES = {"token10": 5, "token20": 8}


def sanitize_kavenegar_token(value: object, field: str) -> str:
    text = "" if value is None else str(value).strip()
    if not text:
        return text

    if field in _NO_SPACE_FIELDS:
        return "".join(ZWNJ if ch.isspace() else ch for ch in text)

    max_spaces = _MAX_SPACES.get(field)
    if max_spaces is None:
        return text

    words = text.split(" ")
    if len(words) - 1 <= max_spaces:
        return text
    return " ".join(words[: max_spaces + 1])


def build_kavenegar_tokens(token_map: dict, context: dict) -> dict:
    """`token_map`: `{"token": "orderNumber", "token10": "firstName"}` (روی
    `SmsTemplate`)، `context`: مقادیر خام فراخوان. خروجی همان چیزی است که
    مستقیم به `verify_lookup()` می‌رود -- هر مقدار از قبل پاک‌سازی شده."""
    return {
        field: sanitize_kavenegar_token(context.get(context_key), field)
        for field, context_key in token_map.items()
    }
