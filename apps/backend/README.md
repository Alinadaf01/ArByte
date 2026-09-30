# apps/backend — ArByte Django backend

Django 5 + DRF is the current backend and source of truth for the API. It runs
on the Iranian VPS with PostgreSQL, Redis, Celery, and Nginx; the Next.js
storefront is deployed separately on Vercel. Older ADRs and reports describe
historical NestJS/Prisma decisions and are not the current deployment plan.

## Setup

```bash
cd apps/backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt   # or .venv/bin/pip on macOS/Linux
copy .env.example .env                          # or cp on macOS/Linux
```

Create the `arbyte_dj` database once, on the monorepo's existing Postgres
container (`infra/docker/docker-compose.dev.yml`, host port 5435):

```bash
docker exec -it arbyte-dev-postgres-1 psql -U arbyte -c "CREATE DATABASE arbyte_dj OWNER arbyte;"
```

Then, from the repo root:

```bash
pnpm be:migrate
pnpm be:dev      # http://localhost:8000
node scripts/backend.mjs python manage.py createsuperuser
```

## Scope (D-01)

- Kept: every model, `apps/admin_api` (`/api/admin/...`), `apps/documents`
  (PDF generation), `apps/orders/services.py` + `apps/orders/providers/`
  (payment-gateway abstractions, all disabled by default), OTP/impersonation
  logic on `apps/users` models, Celery, `docs/api` and the ArByte Zod
  contract remain the source of truth for the _public_ API shape.
- Removed: the paginated PDF-catalog reader (`CatalogFile`/`CatalogSpread`/
  `CatalogEdition`), every public (non-admin) `/api/...` endpoint for
  catalog/content/settings/users/orders/analytics (rebuilt from scratch
  against the ArByte contract under `/api/v1/` in D-03/D-04/D-05), vybeshop's
  fixtures/seed data, and all vybeshop branding.
- Not yet touched: the catalog data model still matches vybeshop's
  single-price-per-product shape (`D-02` rebuilds it onto ArByte's
  variant-based model), and vybeshop's own React admin frontend was not
  imported (`batch-04`).

## Root scripts

`pnpm be:dev` / `be:test` / `be:migrate` / `be:lint` (`scripts/backend.mjs`)
run against this app's own `.venv`, independent of frontend Node tooling.
`apps/backend` is intentionally **not** part of the pnpm workspace
(it's Python) — Turbo never touches it.
