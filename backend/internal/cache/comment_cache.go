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

const (
	PostCommentsKeyPrefix    = "post:comments"
	CommentRepliesKeyPrefix  = "comment:replies"
	commentCacheScanPageSize = 100
)

type CommentCache struct {
	redis *redis.Client
	ttl   time.Duration
}

func NewCommentCache(redis *redis.Client, ttl time.Duration) *CommentCache {
	return &CommentCache{redis: redis, ttl: ttl}
}

func PostCommentsKey(postID uint64, page int, pageSize int) string {
	return fmt.Sprintf("%s:%d:page:%d:size:%d", PostCommentsKeyPrefix, postID, page, pageSize)
}

func CommentRepliesKey(parentID uint64, page int, pageSize int) string {
	return fmt.Sprintf("%s:%d:page:%d:size:%d", CommentRepliesKeyPrefix, parentID, page, pageSize)
}

func (c *CommentCache) GetPostComments(ctx context.Context, postID uint64, page int, pageSize int) (*vo.CommentList, bool, error) {
	return c.get(ctx, PostCommentsKey(postID, page, pageSize))
}

func (c *CommentCache) SetPostComments(ctx context.Context, postID uint64, list vo.CommentList) error {
	return c.set(ctx, PostCommentsKey(postID, list.Page, list.PageSize), list)
}

func (c *CommentCache) DeletePostComments(ctx context.Context, postID uint64) error {
	return c.deleteByPattern(ctx, fmt.Sprintf("%s:%d:page:*", PostCommentsKeyPrefix, postID))
}

func (c *CommentCache) GetReplies(ctx context.Context, parentID uint64, page int, pageSize int) (*vo.CommentList, bool, error) {
	return c.get(ctx, CommentRepliesKey(parentID, page, pageSize))
}

func (c *CommentCache) SetReplies(ctx context.Context, parentID uint64, list vo.CommentList) error {
	return c.set(ctx, CommentRepliesKey(parentID, list.Page, list.PageSize), list)
}

func (c *CommentCache) DeleteReplies(ctx context.Context, parentID uint64) error {
	return c.deleteByPattern(ctx, fmt.Sprintf("%s:%d:page:*", CommentRepliesKeyPrefix, parentID))
}

func (c *CommentCache) get(ctx context.Context, key string) (*vo.CommentList, bool, error) {
	if c == nil || c.redis == nil || c.ttl <= 0 {
		return nil, false, nil
	}

	body, err := c.redis.Get(ctx, key).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}

	var list vo.CommentList
	if err := json.Unmarshal(body, &list); err != nil {
		return nil, false, err
	}
	return &list, true, nil
}

func (c *CommentCache) set(ctx context.Context, key string, list vo.CommentList) error {
	if c == nil || c.redis == nil || c.ttl <= 0 {
		return nil
	}

	body, err := json.Marshal(list)
	if err != nil {
		return err
	}
	return c.redis.Set(ctx, key, body, c.ttl).Err()
}

func (c *CommentCache) deleteByPattern(ctx context.Context, pattern string) error {
	if c == nil || c.redis == nil {
		return nil
	}

	var cursor uint64
	for {
		keys, nextCursor, err := c.redis.Scan(ctx, cursor, pattern, commentCacheScanPageSize).Result()
		if err != nil {
			return err
		}
		if len(keys) > 0 {
			if err := c.redis.Del(ctx, keys...).Err(); err != nil {
				return err
			}
		}
		if nextCursor == 0 {
			return nil
		}
		cursor = nextCursor
	}
}
