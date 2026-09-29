#!/usr/bin/env bash
# آربایت — اندازه‌گیری زمان پاسخ (docs/DEPLOY.md §۴.۳). از هر جا اجرا شود:
# لپ‌تاپ داخل ایران (تجربه‌ی کاربر)، و یک سرور خارج (نزدیک ناحیه‌ی Vercel،
# معادل مسیر SSR ← API).
#
#   scripts/measure-latency.sh https://arbyte.ir https://api.arbyte.ir [تعداد=5]
set -uo pipefail
SHOP="${1:?آدرس فروشگاه}"; API="${2:?آدرس API}"; N="${3:-5}"

measure() {  # میانه‌ی TTFB و کل، به میلی‌ثانیه
    local url="$1" t ttfb=() total=()
    for _ in $(seq "$N"); do
        t="$(curl -s -o /dev/null -w '%{time_starttransfer} %{time_total}' --max-time 30 "$url")"
        ttfb+=("$(awk '{printf "%d", $1*1000}' <<<"$t")"); total+=("$(awk '{printf "%d", $2*1000}' <<<"$t")")
    done
    local m=$(( N / 2 ))
    printf "%-55s TTFB %5s ms   کل %5s ms\n" "$url" \
        "$(printf '%s\n' "${ttfb[@]}" | sort -n | sed -n "$((m + 1))p")" \
        "$(printf '%s\n' "${total[@]}" | sort -n | sed -n "$((m + 1))p")"
}

echo "— API (مسیر SSR فروشگاه ← سرور ایران)"
for p in /api/v1/health "/api/v1/catalog/products?perPage=24" /api/v1/content/homepage; do measure "$API$p"; done
echo "— فروشگاه (HTML رندرشده)"
for p in / /products /blog; do measure "$SHOP$p"; done
cat <<'TXT'

راهنما: TTFB فروشگاه زیر ~۸۰۰ms خوب است. اگر API از بیرون ایران بالای ۵۰۰ms یا
ناپایدار بود، گزینه‌های docs/DEPLOY.md §۴.۴ را ببینید.
TXT
