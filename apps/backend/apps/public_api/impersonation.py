"""D-04 §۱ — الحاقیه §۶: IMPERSONATION_BLOCKED_ACTIONS
(packages/contracts/src/auth/index.ts) سمت سرور اجرا می‌شود. فقط دو مورد
از هفت اکشن فعلاً اندپوینت واقعی دارند (account.profile.update،
account.addresses.write) — بقیه (orders.create، payments.initiate،
account.changePassword/changeMobile/delete) هنوز اندپوینتی ندارند (D-05 یا
خارج از قرارداد فعلی)."""

from .errors import ApiError


def assert_not_impersonating(request) -> None:
    token = getattr(request, "auth", None)
    if token and token.get("imp"):
        raise ApiError("IMPERSONATION_FORBIDDEN_ACTION", status=403)
