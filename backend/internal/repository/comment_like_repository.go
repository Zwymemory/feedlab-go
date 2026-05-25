package repository

import (
	"context"

	"feedlab/backend/internal/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CommentLikeRepository struct {
	db *gorm.DB
}

func NewCommentLikeRepository(db *gorm.DB) *CommentLikeRepository {
	return &CommentLikeRepository{db: db}
}

func (r *CommentLikeRepository) WithTx(tx *gorm.DB) *CommentLikeRepository {
	return &CommentLikeRepository{db: tx}
}

func (r *CommentLikeRepository) Transaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(fn)
}

func (r *CommentLikeRepository) Like(ctx context.Context, commentID uint64, userID uint64) (bool, error) {
	like := model.CommentLike{CommentID: commentID, UserID: userID}
	result := r.db.WithContext(ctx).
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(&like)
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}

func (r *CommentLikeRepository) Unlike(ctx context.Context, commentID uint64, userID uint64) (bool, error) {
	result := r.db.WithContext(ctx).
		Where("comment_id = ? AND user_id = ?", commentID, userID).
		Delete(&model.CommentLike{})
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}

func (r *CommentLikeRepository) Exists(ctx context.Context, commentID uint64, userID uint64) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.CommentLike{}).
		Where("comment_id = ? AND user_id = ?", commentID, userID).
		Count(&count).Error
	return count > 0, err
}
