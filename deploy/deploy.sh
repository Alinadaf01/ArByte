#!/usr/bin/env bash
# آربایت — استقرار نسخه‌ی تازه بدون قطعی.
#
#   ./deploy/deploy.sh [IMAGE_TAG]      مثلاً ./deploy/deploy.sh 3f2a1bc  (پیش‌فرض: همان .env.production)
#
# ترتیب: git pull (فایل‌های compose/nginx) → دریافت ایمیج → migrate و collectstatic
# با ایمیج تازه → کانتینر web تازه کنار قبلی بالا و سالم می‌شود → قبلی خارج →
# Celery و nginx تازه → smoke. nginx آدرس web را هر ۱۰ ثانیه دوباره resolve
# می‌کند (resolver داکر)، پس در جابه‌جایی درخواستی قطع نمی‌شود.
# ⚠️ migrationها باید با نسخه‌ی قبلی سازگار باشند (ستون تازه nullable/پیش‌فرض‌دار؛
# حذف ستون در انتشار بعدی) — چند ثانیه هر دو نسخه هم‌زمان کار می‌کنند.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.production"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
dc() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

[[ -f "$ENV_FILE" ]] || { echo "$ENV_FILE نیست — deploy/setup.sh 3" >&2; exit 1; }
cd "$PROJECT_DIR"

if [[ -n "${1:-}" ]]; then
    sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=$1|" "$ENV_FILE"
fi
set -a; source "$ENV_FILE"; set +a
echo "[..] نسخه: ${IMAGE_TAG}"

if [[ -d .git && "${SKIP_GIT_PULL:-0}" != "1" ]]; then
    git pull --ff-only || echo "[WARN] git pull نشد (دسترسی به GitHub؟) — با فایل‌های فعلی ادامه."
fi

shopt -s nullglob
archives=("$SCRIPT_DIR"/incoming/*.tar "$SCRIPT_DIR"/incoming/*.tar.gz)
if (( ${#archives[@]} )); then
    for a in "${archives[@]}"; do docker load -i "$a" && mv "$a" "$a.loaded"; done
else
    for i in 1 2 3 4 5; do dc pull web nginx && break; [[ $i == 5 ]] && exit 1; sleep $((i * 10)); done
fi

echo "[..] migrate + collectstatic با ایمیج تازه..."
dc run --rm --no-deps web python manage.py migrate --noinput
dc run --rm --no-deps web python manage.py collectstatic --noinput

old_ids="$(dc ps -q web)"
echo "[..] کانتینر web تازه کنار قبلی..."
dc up -d --no-deps --no-recreate --scale web=2 web
new_id=""
for cid in $(dc ps -q web); do
    grep -q "$cid" <<<"$old_ids" || new_id="$cid"
done
[[ -n "$new_id" ]] || { echo "[ERR] کانتینر تازه ساخته نشد" >&2; exit 1; }

for i in $(seq 1 40); do
    state="$(docker inspect -f '{{.State.Health.Status}}' "$new_id")"
    [[ "$state" == "healthy" ]] && break
    [[ "$state" == "unhealthy" ]] && { docker logs --tail 50 "$new_id"; docker rm -f "$new_id"; echo "[ERR] نسخه‌ی تازه سالم نشد؛ نسخه‌ی قبلی دست‌نخورده ماند." >&2; exit 1; }
    sleep 3
done
[[ "$(docker inspect -f '{{.State.Health.Status}}' "$new_id")" == "healthy" ]] || { docker rm -f "$new_id"; echo "[ERR] timeout سلامت" >&2; exit 1; }
echo "[OK] نسخه‌ی تازه سالم است."

# nginx چند ثانیه فرصت دارد resolve را به‌روز کند، بعد قبلی‌ها graceful متوقف می‌شوند.
sleep 12
for cid in $old_ids; do docker stop -t 30 "$cid" >/dev/null && docker rm "$cid" >/dev/null; done
# ۱ کانتینر web با نام استاندارد (compose شماره را از روی موجودها ادامه می‌دهد).
dc up -d --no-deps --no-recreate --scale web=1 web

dc up -d --no-deps celery-worker celery-beat
NGINX_MODE=ssl dc up -d --no-deps nginx
docker image prune -f >/dev/null

if [[ -x "$PROJECT_DIR/scripts/smoke.sh" ]]; then
    "$PROJECT_DIR/scripts/smoke.sh" "https://$DOMAIN_API" "https://$DOMAIN_ADMIN" "${STOREFRONT_URL:-}"
fi
echo "[OK] استقرار ${IMAGE_TAG} تمام شد."
