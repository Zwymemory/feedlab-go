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

type LikeService struct {
	likes     *repository.PostLikeRepository
	posts     *repository.PostRepository
	users     *repository.UserRepository
	postCache *cache.PostCache
}

func NewLikeService(likes *repository.PostLikeRepository, posts *repository.PostRepository, users *repository.UserRepository, postCache *cache.PostCache) *LikeService {
	return &LikeService{likes: likes, posts: posts, users: users, postCache: postCache}
}

func (s *LikeService) LikePost(ctx context.Context, postID uint64, userID uint64) (*vo.LikeStatus, error) {
	if _, err := s.posts.FindPublishedByID(ctx, postID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	err := s.likes.Transaction(ctx, func(tx *gorm.DB) error {
		txLikes := s.likes.WithTx(tx)
		txPosts := s.posts.WithTx(tx)

		created, err := txLikes.Like(ctx, postID, userID)
		if err != nil {
			return err
		}
		if created {
			return txPosts.IncrementLikeCount(ctx, postID, 1)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	_ = s.postCache.Delete(ctx, postID)

	likeCount, err := s.posts.GetPublishedLikeCount(ctx, postID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &vo.LikeStatus{PostID: postID, Liked: true, LikeCount: likeCount}, nil
}

func (s *LikeService) UnlikePost(ctx context.Context, postID uint64, userID uint64) (*vo.LikeStatus, error) {
	if _, err := s.posts.FindPublishedByID(ctx, postID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	err := s.likes.Transaction(ctx, func(tx *gorm.DB) error {
		txLikes := s.likes.WithTx(tx)
		txPosts := s.posts.WithTx(tx)

		deleted, err := txLikes.Unlike(ctx, postID, userID)
		if err != nil {
			return err
		}
		if deleted {
			return txPosts.IncrementLikeCount(ctx, postID, -1)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	_ = s.postCache.Delete(ctx, postID)

	likeCount, err := s.posts.GetPublishedLikeCount(ctx, postID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &vo.LikeStatus{PostID: postID, Liked: false, LikeCount: likeCount}, nil
}

func (s *LikeService) IsPostLiked(ctx context.Context, postID uint64, userID uint64) (*vo.LikeStatus, error) {
	likeCount, err := s.posts.GetPublishedLikeCount(ctx, postID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	liked, err := s.likes.Exists(ctx, postID, userID)
	if err != nil {
		return nil, err
	}
	return &vo.LikeStatus{PostID: postID, Liked: liked, LikeCount: likeCount}, nil
}

func (s *LikeService) ListUserLikes(ctx context.Context, userID uint64, query dto.ListUserLikesQuery) (*vo.PostList, error) {
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

	posts, total, err := s.likes.ListUserLikedPosts(ctx, userID, page, pageSize)
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
