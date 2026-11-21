# ایمیج arbyte-storefront: build خودمیزبان فروشگاه (Next.js، output: standalone).
# ADR-002 عمداً بدون هیچ قابلیت اختصاصی Vercel نوشته شده (نه Image Optimization
# ابری، نه Edge Middleware، نه KV/Blob/Analytics) — دقیقاً برای همین روز: اجرا
# روی هر سرور Node.js، نه فقط Vercel. از ریشه‌ی مونوریپو build شود:
#   docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_APP_URL=https://arbyte.ir .
#
# NEXT_PUBLIC_* در زمان build در باندل کلاینت جاسازی می‌شوند (نه runtime) —
# همان الگوی VITE_* در deploy/nginx/Dockerfile برای پنل. بقیه‌ی متغیرها
# (API_INTERNAL_URL، BFF_SHARED_SECRET، REVALIDATE_SECRET) در runtime از
# docker-compose.prod.yml می‌آیند، این‌جا نیستند.
FROM node:22-alpine AS builder
ARG NEXT_PUBLIC_APP_URL=https://arbyte.ir
ARG NEXT_PUBLIC_API_BASE_URL=https://api.arbyte.ir/api/v1
ARG NEXT_PUBLIC_GTM_ID=GTM-KFBTHTFT
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_GTM_ID=$NEXT_PUBLIC_GTM_ID \
    NODE_ENV=production
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter @arbyte/web... \
    && pnpm --filter @arbyte/web build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
# standalone: فقط node_modules ردیابی‌شده (نه کل مونوریپو) + سرور مستقل؛
# .next/static و public جدا کپی می‌شوند چون standalone output آن‌ها را ندارد.
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public
RUN addgroup -S arbyte && adduser -S arbyte -G arbyte && chown -R arbyte:arbyte /app
USER arbyte
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
