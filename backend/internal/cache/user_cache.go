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

const UserProfileKeyPrefix = "user:profile"

type UserCache struct {
	redis *redis.Client
	ttl   time.Duration
}

func NewUserCache(redis *redis.Client, ttl time.Duration) *UserCache {
	return &UserCache{redis: redis, ttl: ttl}
}

func UserProfileKey(userID uint64) string {
	return fmt.Sprintf("%s:%d", UserProfileKeyPrefix, userID)
}

func (c *UserCache) GetPublicProfile(ctx context.Context, userID uint64) (*vo.PublicUser, bool, error) {
	if c == nil || c.redis == nil || c.ttl <= 0 {
		return nil, false, nil
	}

	body, err := c.redis.Get(ctx, UserProfileKey(userID)).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}

	var user vo.PublicUser
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, false, err
	}
	return &user, true, nil
}

func (c *UserCache) SetPublicProfile(ctx context.Context, user vo.PublicUser) error {
	if c == nil || c.redis == nil || c.ttl <= 0 {
		return nil
	}

	body, err := json.Marshal(user)
	if err != nil {
		return err
	}
	return c.redis.Set(ctx, UserProfileKey(user.ID), body, c.ttl).Err()
}

func (c *UserCache) DeletePublicProfile(ctx context.Context, userID uint64) error {
	if c == nil || c.redis == nil {
		return nil
	}
	return c.redis.Del(ctx, UserProfileKey(userID)).Err()
}
