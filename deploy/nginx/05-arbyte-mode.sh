#!/bin/sh
# پیش از 20-envsubst-on-templates.sh ایمیج رسمی: قالب را بر اساس NGINX_MODE انتخاب می‌کند.
set -e
mkdir -p /etc/nginx/templates
rm -f /etc/nginx/conf.d/default.conf
if [ "${NGINX_MODE:-ssl}" = "bootstrap" ]; then
  cp /etc/nginx/arbyte/bootstrap.conf.template /etc/nginx/templates/default.conf.template
else
  cp /etc/nginx/arbyte/arbyte.conf.template /etc/nginx/templates/default.conf.template
fi
