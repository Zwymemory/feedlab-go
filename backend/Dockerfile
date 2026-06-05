FROM golang:1.26-alpine AS builder

WORKDIR /src/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/feedlab-api ./cmd/api \
    && CGO_ENABLED=0 GOOS=linux go build -o /out/seed-demo ./cmd/seed-demo

FROM alpine:3.21

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /out/feedlab-api /app/feedlab-api
COPY --from=builder /out/seed-demo /app/seed-demo
COPY deploy/backend-entrypoint.sh /app/backend-entrypoint.sh

RUN chmod +x /app/backend-entrypoint.sh \
    && mkdir -p /app/uploads

ENV FEEDLAB_CONFIG=/app/config.yaml

EXPOSE 8080

ENTRYPOINT ["/app/backend-entrypoint.sh"]
CMD ["/app/feedlab-api"]
