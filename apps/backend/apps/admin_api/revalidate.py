"""F-02 — ابطال کش صفحه‌های فروشگاه بعد از ذخیره در پنل. فروشگاه (Next.js)
صفحه‌ها را با `revalidate: 30|60` کش می‌کند؛ این تابع بعد از commit یک
درخواست به `POST {STOREFRONT_URL}/api/revalidate` می‌فرستد (apps/web،
`REVALIDATE_SECRET` مشترک) تا تغییر همان لحظه دیده شود. بدون تنظیم
env هیچ کاری نمی‌کند — کش زمانی فروشگاه همچنان حداکثر بعد از ۶۰ ثانیه
به‌روز می‌شود، پس خطای شبکه هرگز ذخیره‌ی ادمین را خراب نمی‌کند."""

import logging

import requests
from decouple import config
from django.db import transaction

logger = logging.getLogger(__name__)

STOREFRONT_URL = config("STOREFRONT_URL", default="")
REVALIDATE_SECRET = config("REVALIDATE_SECRET", default="")


def _send(paths: list[str]) -> None:
    try:
        requests.post(
            f"{STOREFRONT_URL.rstrip('/')}/api/revalidate",
            json={"paths": paths},
            headers={"x-revalidate-secret": REVALIDATE_SECRET},
            timeout=3,
        )
    except requests.RequestException as exc:
        logger.warning("storefront revalidate failed for %s: %s", paths, exc)


def revalidate_storefront(*paths: str) -> None:
    if not (STOREFRONT_URL and REVALIDATE_SECRET):
        return
    unique = sorted({p for p in paths if p})
    if unique:
        transaction.on_commit(lambda: _send(unique))
