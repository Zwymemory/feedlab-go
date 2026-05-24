package repository

import (
	"context"
	"errors"

	"feedlab/backend/internal/model"

	"gorm.io/gorm"
)

type CommentRepository struct {
	db *gorm.DB
}

func NewCommentRepository(db *gorm.DB) *CommentRepository {
	return &CommentRepository{db: db}
}

func (r *CommentRepository) WithTx(tx *gorm.DB) *CommentRepository {
	return &CommentRepository{db: tx}
}

func (r *CommentRepository) Transaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(fn)
}

func (r *CommentRepository) Create(ctx context.Context, comment *model.Comment) error {
	return r.db.WithContext(ctx).Create(comment).Error
}

func (r *CommentRepository) FindByID(ctx context.Context, id uint64) (*model.Comment, error) {
	var comment model.Comment
	err := r.db.WithContext(ctx).Preload("User").First(&comment, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &comment, nil
}

func (r *CommentRepository) ListPostComments(ctx context.Context, postID uint64, page int, pageSize int) ([]model.Comment, int64, error) {
	var total int64
	query := r.db.WithContext(ctx).
		Model(&model.Comment{}).
		Where("post_id = ? AND parent_id = ? AND status = ?", postID, 0, "published")
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var comments []model.Comment
	offset := (page - 1) * pageSize
	err := query.
		Preload("User").
		Order("created_at DESC").
		Order("id DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&comments).Error
	if err != nil {
		return nil, 0, err
	}
	return comments, total, nil
}

func (r *CommentRepository) ListReplies(ctx context.Context, parentID uint64, page int, pageSize int) ([]model.Comment, int64, error) {
	var total int64
	query := r.db.WithContext(ctx).
		Model(&model.Comment{}).
		Where("parent_id = ? AND status = ?", parentID, "published")
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var comments []model.Comment
	offset := (page - 1) * pageSize
	err := query.
		Preload("User").
		Order("created_at ASC").
		Order("id ASC").
		Limit(pageSize).
		Offset(offset).
		Find(&comments).Error
	if err != nil {
		return nil, 0, err
	}
	return comments, total, nil
}

func (r *CommentRepository) SoftDeleteCascade(ctx context.Context, commentID uint64) (int64, error) {
	result := r.db.WithContext(ctx).
		Where("id = ? OR parent_id = ?", commentID, commentID).
		Delete(&model.Comment{})
	if result.Error != nil {
		return 0, result.Error
	}
	if result.RowsAffected == 0 {
		return 0, ErrNotFound
	}
	return result.RowsAffected, nil
}
