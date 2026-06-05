FROM node:22-alpine AS builder

WORKDIR /src/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM caddy:2.9-alpine

COPY --from=builder /src/frontend/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
