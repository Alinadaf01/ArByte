#!/usr/bin/env bash
# آربایت — راه‌اندازی یک‌باره‌ی سرور ایران (api + admin + Celery)، مرحله‌به‌مرحله.
# الگو: deploy/setup.sh وایب‌شاپ (vybeshop@a6b5927)، بازنویسی‌شده برای آربایت.
#
#   sudo ./deploy/setup.sh 1   سخت‌سازی: کاربر deploy، فایروال ۲۲/۸۰/۴۴۳، fail2ban، سواپ، به‌روزرسانی امنیتی
#   ./deploy/setup.sh 2        نصب Docker (+ تنظیم دانلود/لاگ)
#   ./deploy/setup.sh 3        ساخت .env.production با secretهای تصادفی
#   ./deploy/setup.sh 4        دریافت ایمیج‌ها (pull از رجیستری یا docker load از deploy/incoming/)
#   ./deploy/setup.sh 5        بالا آوردن سرویس‌ها + migrate + گواهی SSL (certbot)
#   ./deploy/setup.sh 6        cron: بک‌آپ روزانه و تمدید گواهی
#   ./deploy/setup.sh 7        بررسی نهایی (smoke) + گزارش
#
# هر مرحله قابل تکرار است و قبل از کار مخرب تأیید می‌گیرد. راهنما: docs/DEPLOY.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.production"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
SWAP_SIZE_GB="${SWAP_SIZE_GB:-2}"

C_OK="\033[32m"; C_WARN="\033[33m"; C_ERR="\033[31m"; C_RESET="\033[0m"
log() { echo -e "[..] $*"; }
ok() { echo -e "${C_OK}[OK]${C_RESET} $*"; }
warn() { echo -e "${C_WARN}[WARN]${C_RESET} $*"; }
err() { echo -e "${C_ERR}[ERR]${C_RESET} $*" >&2; }
confirm() {
    read -r -p "$1 [y/N] " reply
    [[ "$reply" =~ ^[Yy]$ ]] || { err "لغو شد."; exit 1; }
}
dc() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }
need_env() { [[ -f "$ENV_FILE" ]] || { err "$ENV_FILE نیست — اول مرحله ۳."; exit 1; }; }
load_env() { need_env; set -a; source "$ENV_FILE"; set +a; }

# تلاش مجدد برای شبکه‌ی ناپایدار ایران ↔ رجیستری‌ها (کند، نه بسته).
retry() {
    local n=1 delays=(10 20 40 60)
    until "$@"; do
        if (( n >= 5 )); then return 1; fi
        warn "تلاش $n ناموفق؛ ${delays[$((n - 1))]} ثانیه بعد دوباره..."
        sleep "${delays[$((n - 1))]}"; n=$((n + 1))
    done
}

stage_1() {
    [[ $EUID -eq 0 ]] || { err "مرحله ۱ با root: sudo $0 1"; exit 1; }
    log "کاربر $DEPLOY_USER (فقط کلید SSH)..."
    id -u "$DEPLOY_USER" &>/dev/null || adduser --disabled-password --gecos "" "$DEPLOY_USER"
    usermod -aG sudo "$DEPLOY_USER"
    if [[ -f /root/.ssh/authorized_keys && ! -f /home/$DEPLOY_USER/.ssh/authorized_keys ]]; then
        install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
        install -m 600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/authorized_keys"
    fi
    apt-get update -qq
    apt-get install -y -qq ufw fail2ban unattended-upgrades curl git cron >/dev/null
    ufw allow 22/tcp; ufw allow 80/tcp; ufw allow 443/tcp
    # ترافیک خروجی کانتینرها؛ Postgres/Redis هرگز پورت بیرونی ندارند.
    sed -i 's/^DEFAULT_FORWARD_POLICY=.*/DEFAULT_FORWARD_POLICY="ACCEPT"/' /etc/default/ufw
    ufw status | grep -q "Status: active" && ufw reload || { confirm "فایروال فعال شود (فقط ۲۲/۸۰/۴۴۳)؟"; ufw --force enable; }
    systemctl enable --now fail2ban
    dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null
    timedatectl set-timezone Asia/Tehran
    if ! swapon --show | grep -q .; then
        fallocate -l "${SWAP_SIZE_GB}G" /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
        grep -q "^/swapfile " /etc/fstab || echo "/swapfile none swap sw 0 0" >>/etc/fstab
    fi
    ok "سرور سخت شد. حالا با «ssh $DEPLOY_USER@<IP>» وارد شوید و مرحله ۲."
}

stage_2() {
    if ! docker version &>/dev/null; then
        log "نصب Docker..."
        retry curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
        sudo sh /tmp/get-docker.sh && rm -f /tmp/get-docker.sh
        sudo usermod -aG docker "$USER"
        warn "گروه docker اضافه شد: یک بار خارج و وارد شوید، بعد دوباره مرحله ۲."
        exit 0
    fi
    # دانلود تک‌لایه (لینک ناپایدار) و چرخش لاگ کانتینرها.
    sudo tee /etc/docker/daemon.json >/dev/null <<'JSON'
{
  "max-concurrent-downloads": 1,
  "log-driver": "json-file",
  "log-opts": { "max-size": "20m", "max-file": "5" }
}
JSON
    sudo systemctl restart docker
    docker compose version >/dev/null && ok "Docker و compose آماده‌اند: $(docker --version)"
}

stage_3() {
    cd "$PROJECT_DIR"
    if [[ -f "$ENV_FILE" ]]; then
        ok "$ENV_FILE از قبل هست — secretها دست نمی‌خورند."
        return
    fi
    cp .env.production.example "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    local secret jwt fernet pg reval bff
    secret="$(openssl rand -base64 64 | tr -d '\n/+=')"
    jwt="$(openssl rand -base64 64 | tr -d '\n/+=')"
    fernet="$(openssl rand -base64 32 | tr '+/' '-_')"
    pg="$(openssl rand -hex 24)"
    reval="$(openssl rand -hex 32)"
    bff="$(openssl rand -hex 32)"
    sed -i "s|^SECRET_KEY=.*|SECRET_KEY=$secret|; s|^JWT_SIGNING_KEY=.*|JWT_SIGNING_KEY=$jwt|; \
        s|^FIELD_ENCRYPTION_KEY=.*|FIELD_ENCRYPTION_KEY=$fernet|; s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$pg|; \
        s|^DATABASE_URL=.*|DATABASE_URL=postgres://arbyte:$pg@db:5432/arbyte|; \
        s|^REVALIDATE_SECRET=.*|REVALIDATE_SECRET=$reval|; s|^BFF_SHARED_SECRET=.*|BFF_SHARED_SECRET=$bff|" "$ENV_FILE"
    ok ".env.production ساخته شد. دامنه‌ها، IMAGE_REGISTRY و KAVENEGAR_API_KEY را در آن ویرایش کنید."
    warn "این سه مقدار را همین حالا بیرون از سرور نگه دارید:"
    echo "  FIELD_ENCRYPTION_KEY=$fernet   (گم شود = کلیدهای پنل غیرقابل‌خواندن)"
    echo "  REVALIDATE_SECRET=$reval   (در Vercel هم)"
    echo "  BFF_SHARED_SECRET=$bff   (در Vercel هم)"
}

stage_4() {
    load_env
    cd "$PROJECT_DIR"
    shopt -s nullglob
    local archives=("$SCRIPT_DIR"/incoming/*.tar "$SCRIPT_DIR"/incoming/*.tar.gz)
    if (( ${#archives[@]} )); then
        # مسیر آفلاین: ایمیج‌ها بیرون ساخته و با `docker save` منتقل شده‌اند (docs/DEPLOY.md §۲.ب).
        for a in "${archives[@]}"; do log "docker load < $a"; docker load -i "$a"; done
    else
        if [[ -n "${DOCKERHUB_TOKEN:-}" ]]; then
            retry sh -c 'echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USER" --password-stdin'
        fi
        retry dc pull web nginx
    fi
    retry dc pull db redis || true
    ok "ایمیج‌ها آماده‌اند:"; docker images | grep -E "arbyte-(backend|nginx)" || true
}

stage_5() {
    load_env
    cd "$PROJECT_DIR"
    mkdir -p "$SCRIPT_DIR/certbot/conf" "$SCRIPT_DIR/certbot/www"
    dc up -d db redis
    log "migrate + collectstatic..."
    dc run --rm web python manage.py migrate --noinput
    dc run --rm web python manage.py collectstatic --noinput
    dc up -d web celery-worker celery-beat
    if [[ ! -f "$SCRIPT_DIR/certbot/conf/live/$DOMAIN_API/fullchain.pem" ]]; then
        log "گواهی Let's Encrypt برای $DOMAIN_API و $DOMAIN_ADMIN (DNS هر دو باید به این سرور اشاره کند)..."
        NGINX_MODE=bootstrap dc up -d --force-recreate nginx
        sleep 3
        dc run --rm certbot certonly --webroot -w /var/www/certbot \
            -d "$DOMAIN_API" -d "$DOMAIN_ADMIN" --email "$CERTBOT_EMAIL" --agree-tos --no-eff-email --non-interactive
    fi
    NGINX_MODE=ssl dc up -d --force-recreate nginx
    dc ps
    ok "سرویس‌ها بالا هستند. ساخت مدیر: dc exec web python manage.py createsuperuser"
}

stage_6() {
    local cron_file=/etc/cron.d/arbyte
    sudo tee "$cron_file" >/dev/null <<CRON
# آربایت — بک‌آپ روزانه ۰۳:۳۰ (نگه‌داری ۱۴ روز) و تمدید گواهی هر روز ۰۴:۱۵
SHELL=/bin/bash
30 3 * * * $USER $SCRIPT_DIR/backup.sh >> $SCRIPT_DIR/backups/backup.log 2>&1
15 4 * * * $USER cd $PROJECT_DIR && docker compose --env-file $ENV_FILE -f $COMPOSE_FILE run --rm certbot renew --quiet && docker compose --env-file $ENV_FILE -f $COMPOSE_FILE exec -T nginx nginx -s reload
CRON
    sudo chmod 644 "$cron_file"
    mkdir -p "$SCRIPT_DIR/backups"
    ok "cron نصب شد ($cron_file). اولین بک‌آپ آزمایشی:"
    "$SCRIPT_DIR/backup.sh"
}

stage_7() {
    load_env
    dc ps
    "$PROJECT_DIR/scripts/smoke.sh" "https://$DOMAIN_API" "https://$DOMAIN_ADMIN" "${STOREFRONT_URL:-}"
}

case "${1:-}" in
    1) stage_1 ;; 2) stage_2 ;; 3) stage_3 ;; 4) stage_4 ;; 5) stage_5 ;; 6) stage_6 ;; 7) stage_7 ;;
    *) sed -n '2,14p' "$0"; exit 1 ;;
esac
