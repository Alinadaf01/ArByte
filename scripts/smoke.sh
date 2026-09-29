#!/usr/bin/env bash
# آربایت — smoke test بعد از هر استقرار.
#
#   scripts/smoke.sh https://api.arbyte.ir https://admin.arbyte.ir [https://arbyte.ir]
#
# هر بررسی یک خط ✓/✗؛ هر خطا → کد خروج ۱. SMOKE_INSECURE=1 برای گواهی خودامضا
# (فقط آزمون محلی).

set -uo pipefail
API="${1:?آدرس API}"; ADMIN="${2:?آدرس پنل}"; SHOP="${3:-}"
CURL=(curl -sS --max-time 20)
[[ "${SMOKE_INSECURE:-0}" == "1" ]] && CURL+=(-k)
fails=0

check() {  # check "توضیح" URL کد_مورد_انتظار [رشته‌ی لازم در بدنه] [هدر لازم]
    local name="$1" url="$2" want="$3" needle="${4:-}" header="${5:-}" out code body headers
    out="$("${CURL[@]}" -D - -o /tmp/smoke.body -w '%{http_code}' "$url" 2>/dev/null)"; code="${out: -3}"
    headers="${out%???}"; body="$(cat /tmp/smoke.body 2>/dev/null)"
    if [[ "$code" != "$want" ]]; then echo "✗ $name — $url → $code (انتظار $want)"; fails=$((fails + 1)); return; fi
    if [[ -n "$needle" && "$body" != *"$needle"* ]]; then echo "✗ $name — «$needle» در پاسخ نیست"; fails=$((fails + 1)); return; fi
    if [[ -n "$header" ]] && ! grep -qi "^$header" <<<"$headers"; then echo "✗ $name — هدر $header نیست"; fails=$((fails + 1)); return; fi
    echo "✓ $name"
}

echo "— API ($API)"
check "سلامت (DB/Redis/Storage)"   "$API/api/v1/health" 200 '"status"' "strict-transport-security"
check "فهرست محصولات"              "$API/api/v1/catalog/products?perPage=1" 200 '"data"'
check "دسته‌ها"                     "$API/api/v1/catalog/categories" 200 '"data"'
check "وبلاگ"                       "$API/api/v1/blog" 200 '"pagination"'
check "اطلاعات فروشگاه"            "$API/api/v1/content/site-info" 200 '"socials"'
check "فید ترب"                     "$API/feeds/torob" 200 '"products"'
check "endpoint ورود پنل (GET → ۴۰۵)" "$API/api/admin/auth/login/" 405
check "مسیر ناشناخته → ۴۰۴"         "$API/nope" 404
check "رسید خصوصی مستقیم سرو نشود" "$API/media/receipts/private/x.jpg" 404
check "Swagger در تولید خاموش"      "$API/api/docs/" 404

echo "— پنل ($ADMIN)"
check "صفحه‌ی پنل"                  "$ADMIN/" 200 'id="root"' "content-security-policy"
check "پراکسی API پنل"              "$ADMIN/api/v1/health" 200 '"status"'

if [[ -n "$SHOP" ]]; then
    echo "— فروشگاه ($SHOP)"
    check "صفحه‌ی اصلی"              "$SHOP/" 200 "آربایت" "content-security-policy"
    check "فروشگاه"                  "$SHOP/products" 200
    check "وبلاگ"                    "$SHOP/blog" 200
    check "robots.txt"               "$SHOP/robots.txt" 200 "Sitemap:"
    check "sitemap.xml"              "$SHOP/sitemap.xml" 200 "<urlset"
    check "فید ترب روی دامنه‌ی فروشگاه" "$SHOP/feeds/torob" 200 '"products"'
    check "۴۰۴ واقعی"                "$SHOP/__smoke_missing__" 404
fi

echo
if (( fails )); then echo "✗ $fails بررسی ناموفق"; exit 1; fi
echo "✓ همه‌ی بررسی‌ها سبز"
