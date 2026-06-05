#!/bin/sh
set -eu

cat > "${FEEDLAB_CONFIG:-/app/config.yaml}" <<EOF
server:
  addr: ":8080"
  mode: "${FEEDLAB_SERVER_MODE:-release}"

mysql:
  host: "${FEEDLAB_MYSQL_HOST:-mysql}"
  port: ${FEEDLAB_MYSQL_PORT:-3306}
  username: "${FEEDLAB_MYSQL_USER:-feedlab}"
  password: "${FEEDLAB_MYSQL_PASSWORD:-feedlab_pass}"
  database: "${FEEDLAB_MYSQL_DATABASE:-feedlab}"
  charset: "utf8mb4"
  parse_time: true
  loc: "Local"
  max_idle_conns: ${FEEDLAB_MYSQL_MAX_IDLE_CONNS:-5}
  max_open_conns: ${FEEDLAB_MYSQL_MAX_OPEN_CONNS:-20}

redis:
  addr: "${FEEDLAB_REDIS_ADDR:-redis:6379}"
  password: "${FEEDLAB_REDIS_PASSWORD:-}"
  db: ${FEEDLAB_REDIS_DB:-0}
  post_detail_ttl_seconds: ${FEEDLAB_POST_DETAIL_TTL_SECONDS:-300}
  user_profile_ttl_seconds: ${FEEDLAB_USER_PROFILE_TTL_SECONDS:-600}
  post_view_ttl_seconds: ${FEEDLAB_POST_VIEW_TTL_SECONDS:-86400}
  post_view_flush_threshold: ${FEEDLAB_POST_VIEW_FLUSH_THRESHOLD:-100}
  comment_list_ttl_seconds: ${FEEDLAB_COMMENT_LIST_TTL_SECONDS:-120}
  null_cache_ttl_seconds: ${FEEDLAB_NULL_CACHE_TTL_SECONDS:-60}

rabbitmq:
  enabled: ${FEEDLAB_RABBITMQ_ENABLED:-true}
  url: "${FEEDLAB_RABBITMQ_URL:-amqp://feedlab:feedlab_pass@rabbitmq:5672/}"
  notification_queue: "${FEEDLAB_NOTIFICATION_QUEUE:-notification.queue}"

jwt:
  secret: "${FEEDLAB_JWT_SECRET:-feedlab_change_me_in_production}"
  issuer: "${FEEDLAB_JWT_ISSUER:-feedlab}"
  expires_hours: ${FEEDLAB_JWT_EXPIRES_HOURS:-2}

rate_limit:
  login_window_seconds: ${FEEDLAB_LOGIN_WINDOW_SECONDS:-60}
  login_max_attempts: ${FEEDLAB_LOGIN_MAX_ATTEMPTS:-10}

log:
  level: "${FEEDLAB_LOG_LEVEL:-info}"
EOF

exec "$@"
