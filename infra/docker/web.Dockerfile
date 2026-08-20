# اجرا از ریشه‌ی مونوریپو: docker build -f infra/docker/web.Dockerfile .
#
# طبق ADR-002: بیلد در محیطی با دسترسی آزاد به اینترنت انجام می‌شود؛ فقط این
# ایمیج نهایی (خودکفا، بدون نیاز به npm install در زمان اجرا) به سرور ایران
# منتقل می‌شود.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable

FROM base AS pruner
COPY . .
RUN npx turbo prune @arbyte/web --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@arbyte/web...

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
