#!/usr/bin/env bash
# آربایت — بازگردانی از بک‌آپ deploy/backup.sh.
#
#   ./deploy/restore.sh 20261001-033000          (پوشه‌ی deploy/backups/<STAMP>)
#
# ⚠️ دیتابیس و فایل‌های فعلی جایگزین می‌شوند. اول یک بک‌آپ تازه از وضعیت فعلی
# گرفته می‌شود. در طول بازگردانی web/Celery متوقف‌اند (چند دقیقه قطعی).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.production"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
BACKUPS_DIR="${BACKUPS_DIR:-$SCRIPT_DIR/backups}"
STAMP="${1:?نام پوشه‌ی بک‌آپ (مثلاً 20261001-033000) را بدهید}"
DIR="$BACKUPS_DIR/$STAMP"

set -a; source "$ENV_FILE"; set +a
dc() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

[[ -f "$DIR/db.dump" ]] || { echo "بک‌آپ $DIR پیدا نشد" >&2; exit 1; }
( cd "$DIR" && sha256sum -c SHA256SUMS ) || { echo "checksum نمی‌خواند — بک‌آپ خراب است" >&2; exit 1; }

if [[ "${ASSUME_YES:-0}" != "1" ]]; then
    read -r -p "دیتابیس و media با $STAMP جایگزین شود؟ [y/N] " reply
    [[ "$reply" =~ ^[Yy]$ ]] || exit 1
fi

echo "[..] بک‌آپ ایمنی از وضعیت فعلی..."
"$SCRIPT_DIR/backup.sh"

dc stop web celery-worker celery-beat
dc exec -T db pg_restore -U "${POSTGRES_USER:-arbyte}" -d "${POSTGRES_DB:-arbyte}" --clean --if-exists --no-owner <"$DIR/db.dump"
for vol in media private_media; do
    docker run --rm -v "arbyte_${vol}:/data" -v "$DIR:/backup:ro" alpine \
        sh -c "find /data -mindepth 1 -delete && tar xzf /backup/${vol}.tar.gz -C /data && chown -R 1000:1000 /data"
done
dc up -d web celery-worker celery-beat
echo "[OK] بازگردانی $STAMP انجام شد. smoke: scripts/smoke.sh https://\$DOMAIN_API https://\$DOMAIN_ADMIN"
