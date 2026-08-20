# اجرا از ریشه‌ی مونوریپو: docker build -f infra/docker/api.Dockerfile .

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable

FROM base AS pruner
COPY . .
RUN npx turbo prune @arbyte/api --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@arbyte/api...
# pnpm deploy یک node_modules مسطح و فقط-پروداکشن برای همین یک پکیج می‌سازد —
# ایمیج نهایی به هیچ workspace:* یا pnpm-store‌ای وابسته نیست.
RUN pnpm --filter=@arbyte/api --prod deploy /app/deploy/api

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs

COPY --from=installer --chown=nestjs:nodejs /app/deploy/api ./

USER nestjs
EXPOSE 4000
ENV NODE_ENV=production

CMD ["node", "dist/main.js"]
