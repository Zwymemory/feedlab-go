package service

import (
	"context"
	"errors"

	"feedlab/backend/internal/cache"
	"feedlab/backend/internal/event"
	"feedlab/backend/internal/model"
	"feedlab/backend/internal/repository"
	"feedlab/backend/internal/vo"

	"gorm.io/gorm"
)

type CommentLikeService struct {
	likes        *repository.CommentLikeRepository
	comments     *repository.CommentRepository
	commentCache *cache.CommentCache
	publisher    event.NotificationPublisher
}

func NewCommentLikeService(likes *repository.CommentLikeRepository, comments *repository.CommentRepository, commentCache *cache.CommentCache, publisher event.NotificationPublisher) *CommentLikeService {
	return &CommentLikeService{likes: likes, comments: comments, commentCache: commentCache, publisher: publisher}
}

func (s *CommentLikeService) LikeComment(ctx context.Context, commentID uint64, userID uint64) (*vo.CommentLikeStatus, error) {
	comment, err := s.ensurePublishedComment(ctx, commentID)
	if err != nil {
		return nil, err
	}

	var created bool
	err = s.likes.Transaction(ctx, func(tx *gorm.DB) error {
		txLikes := s.likes.WithTx(tx)
		txComments := s.comments.WithTx(tx)

		inserted, err := txLikes.Like(ctx, commentID, userID)
		if err != nil {
			return err
		}
		created = inserted
		if inserted {
			return txComments.IncrementLikeCount(ctx, commentID, 1)
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	s.deleteCommentListCache(ctx, comment)
	if created {
		publishNotification(ctx, s.publisher, commentLikeEvent(*comment, userID))
	}

	likeCount, err := s.comments.GetPublishedLikeCount(ctx, commentID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &vo.CommentLikeStatus{CommentID: commentID, Liked: true, LikeCount: likeCount}, nil
}

func (s *CommentLikeService) UnlikeComment(ctx context.Context, commentID uint64, userID uint64) (*vo.CommentLikeStatus, error) {
	comment, err := s.ensurePublishedComment(ctx, commentID)
	if err != nil {
		return nil, err
	}

	err = s.likes.Transaction(ctx, func(tx *gorm.DB) error {
		txLikes := s.likes.WithTx(tx)
		txComments := s.comments.WithTx(tx)

		deleted, err := txLikes.Unlike(ctx, commentID, userID)
		if err != nil {
			return err
		}
		if deleted {
			return txComments.IncrementLikeCount(ctx, commentID, -1)
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	s.deleteCommentListCache(ctx, comment)

	likeCount, err := s.comments.GetPublishedLikeCount(ctx, commentID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &vo.CommentLikeStatus{CommentID: commentID, Liked: false, LikeCount: likeCount}, nil
}

func (s *CommentLikeService) IsCommentLiked(ctx context.Context, commentID uint64, userID uint64) (*vo.CommentLikeStatus, error) {
	if _, err := s.ensurePublishedComment(ctx, commentID); err != nil {
		return nil, err
	}

	liked, err := s.likes.Exists(ctx, commentID, userID)
	if err != nil {
		return nil, err
	}
	likeCount, err := s.comments.GetPublishedLikeCount(ctx, commentID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &vo.CommentLikeStatus{CommentID: commentID, Liked: liked, LikeCount: likeCount}, nil
}

func (s *CommentLikeService) ensurePublishedComment(ctx context.Context, commentID uint64) (*model.Comment, error) {
	comment, err := s.comments.FindByID(ctx, commentID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if comment.Status != "published" {
		return nil, ErrNotFound
	}
	return comment, nil
}

func (s *CommentLikeService) deleteCommentListCache(ctx context.Context, comment *model.Comment) {
	if comment.ParentID == 0 {
		_ = s.commentCache.DeletePostComments(ctx, comment.PostID)
		return
	}
	_ = s.commentCache.DeleteReplies(ctx, comment.ParentID)
}
