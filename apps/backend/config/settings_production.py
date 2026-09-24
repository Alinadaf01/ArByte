"""Production settings overlay (§8 deploy prep) — NOT wired up as the active
settings module anywhere by default; the container/Compose setup this ships
alongside sets `DJANGO_SETTINGS_MODULE=config.settings_production`
explicitly (see ../../docker-compose.prod.yml and ../../DEPLOY.md).

Everything environment-sensitive (DEBUG, ALLOWED_HOSTS, DATABASE_URL,
SECRET_KEY, the SECURE_* hardening block, ...) already lives in
config/settings.py and is driven entirely by env vars — that's the
single source of truth both here and in local dev. This module only adds
the handful of things that should be true in production specifically and
would be actively wrong in local dev, so they don't belong behind a `DEBUG`
check in the shared file.
"""

from .settings import *  # noqa: F403

if DEBUG:  # noqa: F405 — from config.settings
    raise RuntimeError(
        "config.settings_production was loaded with DEBUG=True — check the "
        "DEBUG env var. This settings module is for production containers only."
    )

# Hashed, cache-busting filenames for collectstatic output (e.g.
# style.a1b2c3d4.css) so a new deploy can set a far-future Cache-Control
# header on /static/ (see DEPLOY.md's Nginx config) without stale-asset
# issues — plain STATIC_ROOT alone doesn't give you this.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"},
}
