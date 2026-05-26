package cache

import (
	"context"
	"fmt"
	"strconv"

	"github.com/redis/go-redis/v9"
)

const RankHotPostsKey = "rank:hot_posts"

type HotPostCache struct {
	redis *redis.Client
}

type HotPostRank struct {
	PostID uint64
	Score  float64
}

func NewHotPostCache(redis *redis.Client) *HotPostCache {
	return &HotPostCache{redis: redis}
}

func (c *HotPostCache) SetScore(ctx context.Context, postID uint64, score float64) error {
	if c == nil || c.redis == nil {
		return nil
	}
	return c.redis.ZAdd(ctx, RankHotPostsKey, redis.Z{
		Score:  score,
		Member: strconv.FormatUint(postID, 10),
	}).Err()
}

func (c *HotPostCache) Remove(ctx context.Context, postID uint64) error {
	if c == nil || c.redis == nil {
		return nil
	}
	return c.redis.ZRem(ctx, RankHotPostsKey, strconv.FormatUint(postID, 10)).Err()
}

func (c *HotPostCache) Top(ctx context.Context, limit int) ([]HotPostRank, error) {
	if c == nil || c.redis == nil || limit <= 0 {
		return nil, nil
	}

	items, err := c.redis.ZRevRangeWithScores(ctx, RankHotPostsKey, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, err
	}

	ranks := make([]HotPostRank, 0, len(items))
	for _, item := range items {
		id, err := strconv.ParseUint(fmt.Sprint(item.Member), 10, 64)
		if err != nil {
			continue
		}
		ranks = append(ranks, HotPostRank{PostID: id, Score: item.Score})
	}
	return ranks, nil
}
