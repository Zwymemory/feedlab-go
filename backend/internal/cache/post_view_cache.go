package cache

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const PostViewCountKeyPrefix = "post:view_count"

type PostViewCache struct {
	redis *redis.Client
	ttl   time.Duration
}

func NewPostViewCache(redis *redis.Client, ttl time.Duration) *PostViewCache {
	return &PostViewCache{redis: redis, ttl: ttl}
}

func PostViewCountKey(postID uint64) string {
	return fmt.Sprintf("%s:%d", PostViewCountKeyPrefix, postID)
}

func (c *PostViewCache) Increment(ctx context.Context, postID uint64) (int64, error) {
	if c == nil || c.redis == nil {
		return 0, nil
	}

	key := PostViewCountKey(postID)
	count, err := c.redis.Incr(ctx, key).Result()
	if err != nil {
		return 0, err
	}
	if count == 1 && c.ttl > 0 {
		if err := c.redis.Expire(ctx, key, c.ttl).Err(); err != nil {
			return count, err
		}
	}
	return count, nil
}

func (c *PostViewCache) Get(ctx context.Context, postID uint64) (int64, bool, error) {
	if c == nil || c.redis == nil {
		return 0, false, nil
	}

	count, err := c.redis.Get(ctx, PostViewCountKey(postID)).Int64()
	if errors.Is(err, redis.Nil) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return count, true, nil
}

func (c *PostViewCache) Take(ctx context.Context, postID uint64) (int64, error) {
	if c == nil || c.redis == nil {
		return 0, nil
	}

	count, err := c.redis.GetDel(ctx, PostViewCountKey(postID)).Int64()
	if errors.Is(err, redis.Nil) {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (c *PostViewCache) Delete(ctx context.Context, postID uint64) error {
	if c == nil || c.redis == nil {
		return nil
	}
	return c.redis.Del(ctx, PostViewCountKey(postID)).Err()
}
