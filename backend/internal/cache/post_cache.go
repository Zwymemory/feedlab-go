package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"feedlab/backend/internal/vo"

	"github.com/redis/go-redis/v9"
)

const PostDetailKeyPrefix = "post:detail"
const PostDetailNullKeyPrefix = "post:detail:null"

type PostCache struct {
	redis   *redis.Client
	ttl     time.Duration
	nullTTL time.Duration
}

func NewPostCache(redis *redis.Client, ttl time.Duration, nullTTL time.Duration) *PostCache {
	return &PostCache{redis: redis, ttl: ttl, nullTTL: nullTTL}
}

func PostDetailKey(postID uint64) string {
	return fmt.Sprintf("%s:%d", PostDetailKeyPrefix, postID)
}

func PostDetailNullKey(postID uint64) string {
	return fmt.Sprintf("%s:%d", PostDetailNullKeyPrefix, postID)
}

func (c *PostCache) Get(ctx context.Context, postID uint64) (*vo.Post, bool, error) {
	if c == nil || c.redis == nil || c.ttl <= 0 {
		return nil, false, nil
	}

	body, err := c.redis.Get(ctx, PostDetailKey(postID)).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}

	var post vo.Post
	if err := json.Unmarshal(body, &post); err != nil {
		return nil, false, err
	}
	return &post, true, nil
}

func (c *PostCache) ExistsNull(ctx context.Context, postID uint64) (bool, error) {
	if c == nil || c.redis == nil || c.nullTTL <= 0 {
		return false, nil
	}
	exists, err := c.redis.Exists(ctx, PostDetailNullKey(postID)).Result()
	if err != nil {
		return false, err
	}
	return exists > 0, nil
}

func (c *PostCache) Set(ctx context.Context, post vo.Post) error {
	if c == nil || c.redis == nil || c.ttl <= 0 {
		return nil
	}

	body, err := json.Marshal(post)
	if err != nil {
		return err
	}
	return c.redis.Set(ctx, PostDetailKey(post.ID), body, c.ttl).Err()
}

func (c *PostCache) SetNull(ctx context.Context, postID uint64) error {
	if c == nil || c.redis == nil || c.nullTTL <= 0 {
		return nil
	}
	return c.redis.Set(ctx, PostDetailNullKey(postID), "1", c.nullTTL).Err()
}

func (c *PostCache) Delete(ctx context.Context, postID uint64) error {
	if c == nil || c.redis == nil {
		return nil
	}
	return c.redis.Del(ctx, PostDetailKey(postID), PostDetailNullKey(postID)).Err()
}
