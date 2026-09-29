#!/usr/bin/env bash
# آربایت — بک‌آپ روزانه (cron: deploy/setup.sh مرحله ۶): pg_dump + media +
# رسیدهای خصوصی؛ نگه‌داری BACKUP_RETENTION_DAYS (پیش‌فرض ۱۴) روز؛ کپی اختیاری
# به S3 سازگار. هر خطای واقعی کد غیرصفر می‌دهد (لاگ cron).
#
# بازگردانی: deploy/restore.sh <STAMP>   (docs/DEPLOY.md §۶)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.production"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
BACKUPS_DIR="${BACKUPS_DIR:-$SCRIPT_DIR/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"

set -a; source "$ENV_FILE"; set +a
dc() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }
mkdir -p "$BACKUPS_DIR"
DIR="$BACKUPS_DIR/$STAMP"
mkdir "$DIR"

echo "[$(date -Iseconds)] بک‌آپ $STAMP..."
dc exec -T db pg_dump -U "${POSTGRES_USER:-arbyte}" -d "${POSTGRES_DB:-arbyte}" -Fc >"$DIR/db.dump"
# dump خالی/خراب را همین‌جا بگیر، نه روز بازگردانی.
dc exec -T db pg_restore --list <"$DIR/db.dump" >/dev/null
for vol in media private_media; do
    docker run --rm -v "arbyte_${vol}:/data:ro" -v "$DIR:/backup" alpine \
        tar czf "/backup/${vol}.tar.gz" -C /data .
done
( cd "$DIR" && sha256sum db.dump media.tar.gz private_media.tar.gz >SHA256SUMS )
chmod -R go-rwx "$DIR"
echo "حجم: $(du -sh "$DIR" | cut -f1)"

# نگه‌داری: پوشه‌های قدیمی‌تر از N روز.
find "$BACKUPS_DIR" -mindepth 1 -maxdepth 1 -type d -name '20*' -mtime +"${BACKUP_RETENTION_DAYS:-14}" -print -exec rm -rf {} +

if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
    docker run --rm -v "$DIR:/backup:ro" \
        -e AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY" -e AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_KEY" \
        amazon/aws-cli s3 cp /backup "s3://$BACKUP_S3_BUCKET/arbyte/$STAMP/" --recursive --endpoint-url "$BACKUP_S3_ENDPOINT"
    echo "کپی بیرون از سرور: s3://$BACKUP_S3_BUCKET/arbyte/$STAMP/"
else
    echo "[WARN] BACKUP_S3_BUCKET خالی است — بک‌آپ فقط روی همین سرور است." >&2
fi
echo "[$(date -Iseconds)] تمام: $DIR"
