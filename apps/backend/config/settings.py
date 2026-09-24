"""
Django settings for the ArByte backend (config project).

Imported from vybeshop@a6b592759a7b16b5524356db81f48958af960dbd (D-01) and
rebranded/pruned per 01-tasks/batch-02/D-01.md.
"""

import sys
from datetime import timedelta
from pathlib import Path

import dj_database_url
from celery.schedules import crontab
from corsheaders.defaults import default_headers
from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY", default="django-insecure-dev-key-change-me")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "corsheaders",
    "drf_spectacular",
    "imagekit",
    # local apps
    "apps.users",
    "apps.catalog",
    "apps.orders",
    "apps.inventory",
    "apps.content",
    "apps.settings",
    "apps.analytics",
    "apps.notifications",
    "apps.admin_api",
    "apps.documents",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database
DATABASES = {
    "default": dj_database_url.parse(
        config(
            "DATABASE_URL",
            # Same docker-compose Postgres as the rest of the monorepo
            # (infra/docker/docker-compose.dev.yml, host port 5435 — see
            # that file's own comment on why not the 5432 default), a
            # separate database (arbyte_dj) from Nest's own `arbyte`.
            default="postgres://arbyte:arbyte@localhost:5435/arbyte_dj",
        )
    )
}


# Custom user model (apps.users.User), phone-based auth — see users app (task #36)
AUTH_USER_MODEL = "users.User"


AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# Internationalization — storefront is Persian/RTL, Iran timezone
LANGUAGE_CODE = "fa"
TIME_ZONE = "Asia/Tehran"
USE_I18N = True
USE_TZ = True


# Static & media files
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# CORS — apps/web (3000) and apps/admin (3001) dev servers. Both call this
# backend directly only from D-03 onward; harmless to have configured early.
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000,http://localhost:3001",
    cast=Csv(),
)
# Custom response headers are invisible to cross-origin fetch() unless
# explicitly exposed — without this, the guest cart session key the backend
# hands out on X-Cart-Session never reaches the storefront's JS, so every
# request looks like a brand-new guest and the cart never persists.
CORS_EXPOSE_HEADERS = ["X-Cart-Session"]
# ...and the storefront also needs to send X-Cart-Session back on later
# requests, which the CORS preflight blocks unless it's in the allow-list too.
CORS_ALLOW_HEADERS = [*default_headers, "x-cart-session"]


# Payment gateways redirect the user's browser to a server-built callback
# URL (BACKEND_BASE_URL) and, after verify, we redirect them back into the
# SPA (FRONTEND_BASE_URL) — neither is guessable from the request itself
# the way DRF's request.build_absolute_uri() would be, since the gateway
# calls back on its own schedule outside any request context tied to the
# original browser session.
BACKEND_BASE_URL = config("BACKEND_BASE_URL", default="http://localhost:8000")
FRONTEND_BASE_URL = config("FRONTEND_BASE_URL", default="http://localhost:3000")


# Django REST Framework
REST_FRAMEWORK = {
    # Global camelCase in/out per BACKEND-TASK.md — frontend never sees snake_case.
    "DEFAULT_RENDERER_CLASSES": (
        "djangorestframework_camel_case.render.CamelCaseJSONRenderer",
        "djangorestframework_camel_case.render.CamelCaseBrowsableAPIRenderer",
    ),
    "DEFAULT_PARSER_CLASSES": (
        "djangorestframework_camel_case.parser.CamelCaseJSONParser",
        "djangorestframework_camel_case.parser.CamelCaseFormParser",
        "djangorestframework_camel_case.parser.CamelCaseMultiPartParser",
    ),
    # `credentials` (ApiCredential) holds provider-defined keys like "apiKey"
    # or "merchantId" verbatim inside a JSON blob — the camelCase parser
    # underscoreizes nested dict keys by default, which would silently store
    # "api_key" instead and break every client that reads credentials back
    # with `data.get("apiKey")` (kavenegar_client.py, orders/providers/*).
    "JSON_UNDERSCOREIZE": {"ignore_fields": ("credentials",)},
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
    ),
    "DEFAULT_PAGINATION_CLASS": "config.pagination.StandardPagination",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    # Export endpoints use `?format=xlsx` as a plain query param telling the
    # view which file to build (ADMIN-API-CONTRACT.md — stock movement and
    # reports export). DRF's own content negotiation reserves that same query
    # param name to pick a *renderer* by format suffix, and raises Http404
    # before the view even runs when no renderer declares that format —
    # disable the override so it doesn't collide with our unrelated use.
    "URL_FORMAT_OVERRIDE": None,
    # Scoped, not global — only the handful of views that set their own
    # `throttle_scope` (§7.5 security review: admin login, contact form,
    # checkout, OTP request/verify) are throttled at all. Rates are per
    # client IP for anonymous endpoints (ScopedRateThrottle falls back to IP
    # when there's no authenticated user), per user once authenticated.
    "DEFAULT_THROTTLE_RATES": {
        "otp_request": "8/hour",
        "otp_verify": "20/hour",
        "admin_login": "10/min",
        "contact_form": "5/hour",
        "checkout": "20/hour",
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "ArByte Admin API",
    "DESCRIPTION": "Admin API for ArByte (apps/backend) — see ADMIN-API-CONTRACT.md.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "CAMELIZE_NAMES": True,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": True,
    "SIGNING_KEY": config("JWT_SIGNING_KEY", default=SECRET_KEY),
}


# Celery — background jobs (SMS, email, reports)
REDIS_URL = config("REDIS_URL", default="redis://localhost:6379/0")
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
# Run tasks synchronously under `manage.py test` — no worker/broker needed to
# assert on their effects, and it keeps the test suite from depending on
# Redis. Also overridable via env for local `runserver` dev without Redis
# running (e.g. Docker Compose not up) — never set in a real deployment.
CELERY_TASK_ALWAYS_EAGER = config("CELERY_TASK_ALWAYS_EAGER", default="test" in sys.argv, cast=bool)

CELERY_BEAT_SCHEDULE = {
    "aggregate-daily-stats": {
        "task": "apps.analytics.tasks.aggregate_daily_stats",
        "schedule": crontab(hour=1, minute=0),  # 01:00 server time — rolls up yesterday, purges >90 days
    },
}

# DRF throttling (§7.5 security review) stores its per-client counters in
# Django's cache framework. Without an explicit CACHES setting, Django falls
# back to an in-process LocMemCache — fine for one dev process, but under
# multiple production workers each process gets its own counter, so an
# attacker effectively gets (rate limit × worker count) instead of the
# configured rate. Shares the same Redis instance Celery already uses.
# Same "test in sys.argv" carve-out as CELERY_TASK_ALWAYS_EAGER above — the
# test suite shouldn't need a running Redis to exercise throttled views.
if "test" in sys.argv:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
        }
    }


# django-encrypted-model-fields — used by apps.settings.ApiCredential
FIELD_ENCRYPTION_KEY = config("FIELD_ENCRYPTION_KEY", default="")


# Production hardening (§7.5 security review) — gated on DEBUG rather than
# always-on because most of these break local `runserver` over plain HTTP
# (SECURE_SSL_REDIRECT would redirect-loop, the *_COOKIE_SECURE flags would
# silently stop cookies from being set at all without HTTPS).
if not DEBUG:
    if SECRET_KEY == "django-insecure-dev-key-change-me":
        raise RuntimeError(
            "SECRET_KEY is still the dev default with DEBUG=False — set a real "
            "SECRET_KEY env var before running in production."
        )
    SECURE_SSL_REDIRECT = True
    # Nginx (see DEPLOY.md, §8) terminates TLS and proxies plain HTTP to
    # Django — without this, Django can't tell the original request was
    # HTTPS and SECURE_SSL_REDIRECT above would redirect-loop forever. Nginx
    # config must set `X-Forwarded-Proto` for this to be trustworthy.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
