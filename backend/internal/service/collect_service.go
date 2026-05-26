package service

import (
	"context"
	"errors"

	"feedlab/backend/internal/cache"
	"feedlab/backend/internal/dto"
	"feedlab/backend/internal/repository"
	"feedlab/backend/internal/vo"

	"gorm.io/gorm"
)

type CollectService struct {
	collects  *repository.PostCollectRepository
	posts     *repository.PostRepository
	users     *repository.UserRepository
	postCache *cache.PostCache
	hotPosts  *cache.HotPostCache
}

func NewCollectService(collects *repository.PostCollectRepository, posts *repository.PostRepository, users *repository.UserRepository, postCache *cache.PostCache, hotPosts *cache.HotPostCache) *CollectService {
	return &CollectService{collects: collects, posts: posts, users: users, postCache: postCache, hotPosts: hotPosts}
}

func (s *CollectService) CollectPost(ctx context.Context, postID uint64, userID uint64) (*vo.CollectStatus, error) {
	if _, err := s.posts.FindPublishedByID(ctx, postID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	err := s.collects.Transaction(ctx, func(tx *gorm.DB) error {
		txCollects := s.collects.WithTx(tx)
		txPosts := s.posts.WithTx(tx)

		created, err := txCollects.Collect(ctx, postID, userID)
		if err != nil {
			return err
		}
		if created {
			return txPosts.IncrementCollectCount(ctx, postID, 1)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	_ = s.postCache.Delete(ctx, postID)
	refreshHotPostScore(ctx, s.posts, s.hotPosts, postID)

	collectCount, err := s.posts.GetPublishedCollectCount(ctx, postID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &vo.CollectStatus{PostID: postID, Collected: true, CollectCount: collectCount}, nil
}

func (s *CollectService) UncollectPost(ctx context.Context, postID uint64, userID uint64) (*vo.CollectStatus, error) {
	if _, err := s.posts.FindPublishedByID(ctx, postID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	err := s.collects.Transaction(ctx, func(tx *gorm.DB) error {
		txCollects := s.collects.WithTx(tx)
		txPosts := s.posts.WithTx(tx)

		deleted, err := txCollects.Uncollect(ctx, postID, userID)
		if err != nil {
			return err
		}
		if deleted {
			return txPosts.IncrementCollectCount(ctx, postID, -1)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	_ = s.postCache.Delete(ctx, postID)
	refreshHotPostScore(ctx, s.posts, s.hotPosts, postID)

	collectCount, err := s.posts.GetPublishedCollectCount(ctx, postID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &vo.CollectStatus{PostID: postID, Collected: false, CollectCount: collectCount}, nil
}

func (s *CollectService) IsPostCollected(ctx context.Context, postID uint64, userID uint64) (*vo.CollectStatus, error) {
	collectCount, err := s.posts.GetPublishedCollectCount(ctx, postID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	collected, err := s.collects.Exists(ctx, postID, userID)
	if err != nil {
		return nil, err
	}
	return &vo.CollectStatus{PostID: postID, Collected: collected, CollectCount: collectCount}, nil
}

func (s *CollectService) ListUserCollects(ctx context.Context, userID uint64, query dto.ListUserCollectsQuery) (*vo.PostList, error) {
	if _, err := s.users.FindByID(ctx, userID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	page := query.Page
	if page <= 0 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize <= 0 {
		pageSize = 10
	}

	posts, total, err := s.collects.ListUserCollectedPosts(ctx, userID, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &vo.PostList{
		Items:    vo.NewPosts(posts),
		Page:     page,
		PageSize: pageSize,
		Total:    total,
	}, nil
}
