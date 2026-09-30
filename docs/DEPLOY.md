# Production deployment

This guide describes the current architecture. The current Django source and
`docker-compose.prod.yml` are authoritative. Older ADRs and reports document
historical NestJS/Prisma decisions; they do not describe the production stack.

| Component | Hosting | Domain |
| --- | --- | --- |
| Next.js storefront | Vercel | `arbyte.ir`; `www.arbyte.ir` redirects to the primary domain |
| Django API | Iranian VPS, Docker | `api.arbyte.ir` |
| React/Vite Admin SPA | Iranian VPS, served by the Nginx image | `admin.arbyte.ir` |
| PostgreSQL, Redis, Celery worker/beat, Nginx, Certbot | Iranian VPS | Private Docker network, except HTTP/HTTPS at Nginx |

The admin remains a separate SPA. Its `/api/` requests are same-origin through
VPS Nginx to Django. The storefront stays on Vercel; it is not built into the
VPS image.

## Requirements and DNS

- Ubuntu 22.04 or 24.04 VPS; the repository baseline is 2 vCPU, 4 GB RAM,
  60 GB disk. Increase disk for uploaded media and retained backups.
- SSH access, Docker Engine and Compose plugin. Open inbound TCP 22, 80, and
  443. PostgreSQL and Redis ports must not be exposed publicly.
- DNS: `api.arbyte.ir` and `admin.arbyte.ir` A records point to the VPS.
  Configure `arbyte.ir` in Vercel and `www.arbyte.ir` as a Vercel redirect or
  alias to `arbyte.ir`; do not point either storefront hostname to the VPS.
- Allow outbound access from the VPS to the selected image registry and from
  Vercel to `https://api.arbyte.ir`.

## Recommended first-deployment sequence

1. Validate the repository and let GitHub Actions publish images for a commit;
   record that exact commit SHA and verify registry access from the VPS.
2. Point `api.arbyte.ir` and `admin.arbyte.ir` to the VPS. Add `arbyte.ir` and
   `www.arbyte.ir` to the Vercel project, with `www` redirecting to primary.
3. Provision the VPS, clone the repository, and run setup stages 1–4. Fill in
   `.env.production` with the domain, image SHA, and generated secrets first.
4. Run setup stage 5 to start DB/Redis, apply Django migrations, collect static
   files, start Django/Celery, and issue certificates for both VPS domains.
5. Create the Django admin superuser, configure admin operational settings,
   and run setup stages 6–7 to schedule backups/certificate renewal and smoke
   check the VPS endpoints.
6. Add the Vercel Production environment variables below and deploy the
   storefront. The API must be reachable during build/static generation.
7. Verify `arbyte.ir`, the `www` redirect, `api.arbyte.ir`, and the VPS admin;
   exercise auth, cart, uploads, background jobs, and backups before launch.

## Build and publish VPS images

`.github/workflows/build-images.yml` runs on pushes to `main`, version tags,
and manual dispatch. It publishes `arbyte-backend` and `arbyte-nginx` under
`ghcr.io/alinadaf01` (the workflow derives the lower-case repository owner),
tagged with the commit SHA and `latest`. It also uploads a 14-day artifact
containing `docker save` images for offline transfer.

Prefer an immutable commit SHA in `IMAGE_TAG`, not `latest`. The production
example uses `ghcr.io/alinadaf01`; if the package is private, authenticate the
VPS to GHCR before pulling. Alternatively configure the workflow's
`DOCKERHUB_USER` and `DOCKERHUB_TOKEN` Actions secrets and set
`IMAGE_REGISTRY=docker.io/<user>` on the VPS. For offline deployment, download
the workflow artifact, verify its `.sha256` file, transfer the archive to
`deploy/incoming/`, and use the exact registry-qualified names embedded in the
archive in `IMAGE_REGISTRY`.

Build images in GitHub Actions, not on the Iranian VPS: the backend image
installs Playwright Chromium and its system dependencies. The admin SPA is
compiled into the Nginx image. The workflow also publishes `latest`; do not
use that mutable tag for a release or rollback target.

## VPS environment and first installation

On the VPS, clone the repository under `/home/deploy/arbyte` (or another
stable directory), then follow `deploy/setup.sh` stages in order. Stage 1
requires root; continue later stages as the `deploy` user after reconnecting
so Docker group membership applies. Stage 3 creates `.env.production` with
mode 600 and random Django, JWT, encryption, database, cache-revalidation,
and BFF secrets. Keep the printed encryption and shared secrets in a secure
password manager. Set a real image tag, domains, contact email, and optional
provider/backup credentials. Never commit `.env.production`.

Set at least:

- `SECRET_KEY`, `JWT_SIGNING_KEY`, `FIELD_ENCRYPTION_KEY`, `POSTGRES_PASSWORD`
- `REVALIDATE_SECRET`, `BFF_SHARED_SECRET` (the same respective values are
  configured in Vercel)
- `IMAGE_REGISTRY`, immutable `IMAGE_TAG`, and registry login if required
- `CERTBOT_EMAIL`, `DOMAIN_API=api.arbyte.ir`, `DOMAIN_ADMIN=admin.arbyte.ir`
- `KAVENEGAR_API_KEY` when SMS is not configured through the admin settings
- `BACKUP_S3_BUCKET`, endpoint, access key, and secret if off-VPS backups are
  enabled

The setup stages install Docker, create the environment, obtain images, start
PostgreSQL/Redis, run migrations and `collectstatic`, start Django/Celery, and
obtain a single Let's Encrypt certificate covering both VPS domains. Then
create the Django admin superuser and complete the admin panel's operational
settings. `deploy/setup.sh 7` runs the deployment smoke check.

## Vercel storefront

Create a Vercel project from this repository, set Root Directory to
`apps/web`, Framework Preset to Next.js, and Node.js to 22. Set the following
for the **Production** environment and trigger a production deployment:

| Variable | Production value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://arbyte.ir` |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.arbyte.ir/api/v1` |
| `API_INTERNAL_URL` | `https://api.arbyte.ir/api/v1` |
| `REVALIDATE_SECRET` | Same value as VPS `.env.production` |
| `BFF_SHARED_SECRET` | Same value as VPS `.env.production` |

The first two values are public configuration, not secrets. The latter two
are server-only secrets; never use a `NEXT_PUBLIC_` prefix for them. Set
equivalent valid API URLs in Preview if preview builds should render API data.
Production configuration validates the storefront and API origins and refuses
HTTP/localhost API URLs. Localhost defaults remain limited to development and
CI.

Attach `arbyte.ir` as the Vercel primary domain. Add `www.arbyte.ir` and set
Vercel's redirect to the primary domain. Check that Vercel can reach the API
from the selected deployment region. Client-side browser access to the API is
limited by Django CORS; server-side Vercel requests do not use browser CORS.

## CORS, CSRF, and authentication

Django CORS allows the storefront origins `https://arbyte.ir` and
`https://www.arbyte.ir`, plus `https://admin.arbyte.ir`. The VPS admin API is
same-origin at `admin.arbyte.ir`; Django admin/session use is disabled unless
`DJANGO_ADMIN_URL` is explicitly set. `CSRF_TRUSTED_ORIGINS` includes those
origins and `https://api.arbyte.ir` for secure Django admin/session use if
enabled. Do not enable wildcard CORS or credentialed cross-origin cookies.

Storefront access and refresh tokens are httpOnly, Secure, SameSite=Lax
cookies scoped to the Vercel storefront host. Browser mutations go through
same-origin Next.js BFF handlers, which validate the request Origin and
forward requests to Django; Vercel sends the shared BFF secret and client IP
header for rate limiting. The API domain does not set storefront auth cookies.
Admin uses its own same-origin SPA authentication flow. Keep HTTPS enabled on
both VPS domains and do not loosen cookie flags in production.

## Static and uploaded files

The backend deployment runs `collectstatic` into the named `static` volume;
Nginx serves `/static/` from that volume. Public uploaded files use the
`media` volume and `/media/` Nginx alias on the API/admin VPS. Private receipt
uploads use the separate `private_media` volume and are delivered only by
authenticated Django endpoints, never by Nginx. The storefront's Next.js
rewrite proxies its `/media/*` and `/feeds/*` paths to the production API
origin. Preserve the media volumes when replacing containers.

## Updates, migrations, and rollback

Run `./deploy/deploy.sh <commit-sha>` from the VPS checkout. It fast-forward
updates deployment files, pulls the matching images, runs Django migrations
and `collectstatic`, starts a candidate web container alongside the old one,
waits for its health check, smoke-checks the public endpoints, and then
replaces the old web container and refreshes Celery/Nginx.

The image rollout is only partly reversible. If the candidate fails its
health check, the script removes that candidate and leaves the old web
container running. The script does **not** reverse database migrations. A
migration can change the schema before candidate health is known, and a
smoke failure can occur after shared schema changes. Keep migrations backward
compatible with the currently running code (expand/contract across releases).
An image-only rollback to a previous SHA is safe only when that image supports
the current database schema. Otherwise restore a verified database/media
backup during a planned outage or deploy a forward-fix. Rollback never means
deleting a database volume.

Take and verify a backup before releases with schema/data migrations. Preserve
the previous immutable image SHA and deploy scripts/config as well as the
database backup. `deploy/deploy.sh` does not automatically make a pre-migration
backup.

## Backups and restore

`deploy/setup.sh 6` schedules a daily backup. `deploy/backup.sh` exports a
PostgreSQL custom-format dump, public media, private media, and SHA-256
checksums, retaining the configured number of days locally. With S3-compatible
settings it copies the archive off-server. Local VPS backups alone do not
protect against VPS loss; configure off-server storage, restrict its access,
and enable encryption at rest there (the script does not encrypt archives).
The dump includes sensitive customer/admin data and receipt files.

Keep `FIELD_ENCRYPTION_KEY` in a separate secure backup: losing it makes
database-stored encrypted provider credentials unreadable. Protect all other
production secrets as well. Test `deploy/restore.sh <timestamp>` regularly on
a separate staging VPS; restore replaces database and media data and stops
web/Celery during the operation. Verify checksums and smoke-test the restored
site. Do not run restore against production unless intentionally recovering
production from a chosen backup.

## Validation and operations

From the repository root, run CI/build validation before publishing images.
After deployment, verify `https://api.arbyte.ir/api/v1/health`, the admin SPA
at `https://admin.arbyte.ir`, and the storefront plus `www` redirect at
`https://arbyte.ir`. Also verify login, cart persistence, OTP delivery,
uploads, payment callbacks if enabled, Celery scheduled tasks, certificate
renewal, and a completed off-server backup.

Useful commands on the VPS:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 web celery-worker celery-beat nginx
./deploy/backup.sh
./deploy/deploy.sh <previous-commit-sha>
```

The final command is an image rollback only and is subject to the schema
compatibility limitation above.
