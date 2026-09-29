# ایمیج arbyte-nginx: پنل مدیریت (build ایستا) + پیکربندی nginx.
# از ریشه‌ی مونوریپو build شود: docker build -f deploy/nginx/Dockerfile .
FROM node:22-alpine AS admin
ARG STOREFRONT_URL=https://arbyte.ir
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter @arbyte/admin... \
    && VITE_ADMIN_API_BASE_URL= VITE_STOREFRONT_URL=$STOREFRONT_URL pnpm --filter @arbyte/admin build \
    && find apps/admin/dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.svg' -o -name '*.html' \) -exec gzip -9 -k {} \;

FROM nginx:1.27-alpine
# envsubst فقط همین دو متغیر را جایگزین کند (نه $host و … خود nginx).
ENV NGINX_ENVSUBST_FILTER="^DOMAIN_"
COPY deploy/nginx/arbyte.conf.template deploy/nginx/bootstrap.conf.template /etc/nginx/arbyte/
COPY deploy/nginx/05-arbyte-mode.sh /docker-entrypoint.d/05-arbyte-mode.sh
COPY --from=admin /repo/apps/admin/dist /usr/share/nginx/admin
