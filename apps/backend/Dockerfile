# Production image. Built by .github/workflows/build-backend-image.yml and
# pushed to Docker Hub (<user>/vybeshop-backend) — the Iranian VPS only pulls
# it (deploy/setup.sh stage 4), never builds it. Reason: `playwright install
# --with-deps chromium` below downloads Chromium from cdn.playwright.dev,
# which geoblocks Iranian IPs with a 403 (Azure Front Door, confirmed
# deliberate — not a local network/firewall issue). GitHub's own runners
# aren't geoblocked, so the image is built there instead. See
# deploy/STAGE4-FIX-TASK.md for the full investigation.
#
# web, celery-worker, and celery-beat in docker-compose.prod.yml all use this
# same image with different `command:` overrides — one build serves all
# three, since the ~2GB Chromium payload is identical either way.
#
# Multi-stage: the deps stage builds a self-contained venv so the final
# stage's own layer doesn't carry pip's build/wheel cache alongside it.
FROM python:3.12-slim-bookworm AS deps

ENV PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt


FROM python:3.12-slim-bookworm

# Python 3.12 pinned deliberately over whatever's on the dev machine — needs
# to be a version every pinned dependency (psycopg2-binary, Pillow,
# Playwright) has prebuilt wheels for, not the newest available interpreter.
#
# PLAYWRIGHT_BROWSERS_PATH: Playwright defaults to installing browsers under
# the *installing* user's home (root, since apt --with-deps needs root) —
# but the container runs as the unprivileged `arbyte` user below, which can't
# read /root. Pinning an explicit, world-readable path (chmod'd after
# install, further down) decouples "who installed it" from "who runs it".
# Without this, Chromium launches fine in every local/dev context (same user
# throughout) and only fails the first time a real PDF is generated in this
# container — exactly the gap deploy/STAGE4-FIX-TASK.md flagged as never
# verified.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=config.settings_production \
    PATH="/opt/venv/bin:$PATH" \
    PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright

WORKDIR /app

# libpq5 — psycopg2-binary's runtime dependency (the wheel bundles its own
# libpq, but the *client* still needs libpq5's shared libs on some bases).
# curl — used by the Compose healthcheck below, and handy for debugging.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /opt/venv /opt/venv

# Playwright's own installer pulls in the exact Chromium build the pinned
# `playwright` package expects (only chromium — firefox/webkit are never
# installed) plus every apt package it needs to run headless. Cache cleanup
# lives in this same RUN so the removed files don't persist in an earlier
# layer; chmod makes the browser readable/executable by the non-root `arbyte`
# user that actually runs it (see PLAYWRIGHT_BROWSERS_PATH above).
RUN playwright install --with-deps chromium \
    && chmod -R a+rX /opt/ms-playwright \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /root/.cache

COPY . .

# Runs as a non-root user — collectstatic/migrate happen at container start
# (see docker-compose.prod.yml's command), not at build time, since they
# need the real database/env to be available.
RUN useradd --create-home --uid 1000 arbyte && chown -R arbyte:arbyte /app
USER arbyte

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60"]
