package service

import (
	"context"
	"errors"

	"feedlab/backend/internal/repository"
	"feedlab/backend/internal/vo"

	"gorm.io/gorm"
)

type CommentLikeService struct {
	likes    *repository.CommentLikeRepository
	comments *repository.CommentRepository
}

func NewCommentLikeService(likes *repository.CommentLikeRepository, comments *repository.CommentRepository) *CommentLikeService {
	return &CommentLikeService{likes: likes, comments: comments}
}

func (s *CommentLikeService) LikeComment(ctx context.Context, commentID uint64, userID uint64) (*vo.CommentLikeStatus, error) {
	if err := s.ensurePublishedComment(ctx, commentID); err != nil {
		return nil, err
	}

	err := s.likes.Transaction(ctx, func(tx *gorm.DB) error {
		txLikes := s.likes.WithTx(tx)
		txComments := s.comments.WithTx(tx)

		created, err := txLikes.Like(ctx, commentID, userID)
		if err != nil {
			return err
		}
		if created {
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
	if err := s.ensurePublishedComment(ctx, commentID); err != nil {
		return nil, err
	}

	err := s.likes.Transaction(ctx, func(tx *gorm.DB) error {
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
	if err := s.ensurePublishedComment(ctx, commentID); err != nil {
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

func (s *CommentLikeService) ensurePublishedComment(ctx context.Context, commentID uint64) error {
	comment, err := s.comments.FindByID(ctx, commentID)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if comment.Status != "published" {
		return ErrNotFound
	}
	return nil
}
