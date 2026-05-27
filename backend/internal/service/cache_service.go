package service

import (
	"context"
	"errors"
	"time"

	"feedlab/backend/internal/cache"
	"feedlab/backend/internal/dto"
	"feedlab/backend/internal/vo"

	"github.com/redis/go-redis/v9"
)

type CacheService struct {
	redis *redis.Client
}

func NewCacheService(redis *redis.Client) *CacheService {
	return &CacheService{redis: redis}
}

func (s *CacheService) PostStatus(ctx context.Context, postID uint64, query dto.PostCacheStatusQuery) (*vo.PostCacheStatus, error) {
	page := query.Page
	if page <= 0 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize <= 0 {
		pageSize = 10
	}

	postDetailKey := cache.PostDetailKey(postID)
	postViewKey := cache.PostViewCountKey(postID)
	commentsKey := cache.PostCommentsKey(postID, page, pageSize)

	postDetail, err := s.keyStatus(ctx, postDetailKey)
	if err != nil {
		return nil, err
	}
	postView, err := s.counterStatus(ctx, postViewKey)
	if err != nil {
		return nil, err
	}
	comments, err := s.keyStatus(ctx, commentsKey)
	if err != nil {
		return nil, err
	}
	hotRank, err := s.hotRankStatus(ctx, postID)
	if err != nil {
		return nil, err
	}

	return &vo.PostCacheStatus{
		PostID:        postID,
		PostDetail:    postDetail,
		PostViewCount: postView,
		Comments:      comments,
		HotRank:       hotRank,
	}, nil
}

func (s *CacheService) keyStatus(ctx context.Context, key string) (vo.CacheKeyStatus, error) {
	ttl, exists, err := s.ttl(ctx, key)
	if err != nil {
		return vo.CacheKeyStatus{}, err
	}
	return vo.CacheKeyStatus{Key: key, Exists: exists, TTLSeconds: ttl}, nil
}

func (s *CacheService) counterStatus(ctx context.Context, key string) (vo.CacheCounterStatus, error) {
	ttl, exists, err := s.ttl(ctx, key)
	if err != nil {
		return vo.CacheCounterStatus{}, err
	}
	status := vo.CacheCounterStatus{Key: key, Exists: exists, TTLSeconds: ttl}
	if !exists {
		return status, nil
	}

	value, err := s.redis.Get(ctx, key).Int64()
	if errors.Is(err, redis.Nil) {
		return vo.CacheCounterStatus{Key: key, Exists: false, TTLSeconds: -2}, nil
	}
	if err != nil {
		return vo.CacheCounterStatus{}, err
	}
	status.Value = value
	return status, nil
}

func (s *CacheService) hotRankStatus(ctx context.Context, postID uint64) (vo.CacheRankStatus, error) {
	if s == nil || s.redis == nil {
		return vo.CacheRankStatus{Key: cache.RankHotPostsKey, Exists: false}, nil
	}

	score, err := s.redis.ZScore(ctx, cache.RankHotPostsKey, cache.HotPostMember(postID)).Result()
	if errors.Is(err, redis.Nil) {
		return vo.CacheRankStatus{Key: cache.RankHotPostsKey, Exists: false}, nil
	}
	if err != nil {
		return vo.CacheRankStatus{}, err
	}
	return vo.CacheRankStatus{Key: cache.RankHotPostsKey, Exists: true, Score: score}, nil
}

func (s *CacheService) ttl(ctx context.Context, key string) (int64, bool, error) {
	if s == nil || s.redis == nil {
		return -2, false, nil
	}

	ttl, err := s.redis.TTL(ctx, key).Result()
	if err != nil {
		return 0, false, err
	}
	if ttl == -2*time.Second {
		return -2, false, nil
	}
	if ttl == -1*time.Second {
		return -1, true, nil
	}
	return int64(ttl.Seconds()), true, nil
}
