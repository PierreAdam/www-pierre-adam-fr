# Static CV website served by nginx
FROM nginx:1.27-alpine

# copy the whole site (.dockerignore keeps the project files out), then move the nginx config in place
COPY . /usr/share/nginx/html/
RUN mv /usr/share/nginx/html/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
