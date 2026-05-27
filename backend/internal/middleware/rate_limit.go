package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"feedlab/backend/internal/response"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

const LoginRateLimitKeyPrefix = "rate_limit:login"

type RateLimiter struct {
	redis  *redis.Client
	window time.Duration
	max    int
}

func NewRateLimiter(redis *redis.Client, window time.Duration, max int) *RateLimiter {
	return &RateLimiter{redis: redis, window: window, max: max}
}

func LoginRateLimitKey(ip string) string {
	return fmt.Sprintf("%s:%s", LoginRateLimitKeyPrefix, ip)
}

func (l *RateLimiter) Login() gin.HandlerFunc {
	return func(c *gin.Context) {
		allowed, retryAfter, err := l.allow(c.Request.Context(), LoginRateLimitKey(c.ClientIP()))
		if err != nil || allowed {
			c.Next()
			return
		}

		response.Error(c, http.StatusTooManyRequests, response.CodeTooManyRequests, "too many login attempts", gin.H{
			"retry_after_seconds": retryAfter,
		})
		c.Abort()
	}
}

func (l *RateLimiter) allow(ctx context.Context, key string) (bool, int64, error) {
	if l == nil || l.redis == nil || l.window <= 0 || l.max <= 0 {
		return true, 0, nil
	}

	count, err := l.redis.Incr(ctx, key).Result()
	if err != nil {
		return true, 0, err
	}
	if count == 1 {
		if err := l.redis.Expire(ctx, key, l.window).Err(); err != nil {
			return true, 0, err
		}
	}
	if count <= int64(l.max) {
		return true, 0, nil
	}

	ttl, err := l.redis.TTL(ctx, key).Result()
	if err != nil || ttl < 0 {
		return false, int64(l.window.Seconds()), nil
	}
	return false, int64(ttl.Seconds()), nil
}
