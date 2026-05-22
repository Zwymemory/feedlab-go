package repository

import (
	"context"
	"errors"

	"feedlab/backend/internal/model"

	"gorm.io/gorm"
)

type PostRepository struct {
	db *gorm.DB
}

func NewPostRepository(db *gorm.DB) *PostRepository {
	return &PostRepository{db: db}
}

func (r *PostRepository) WithTx(tx *gorm.DB) *PostRepository {
	return &PostRepository{db: tx}
}

func (r *PostRepository) Transaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(fn)
}

func (r *PostRepository) Create(ctx context.Context, post *model.Post) error {
	return r.db.WithContext(ctx).Create(post).Error
}

func (r *PostRepository) FindByID(ctx context.Context, id uint64) (*model.Post, error) {
	var post model.Post
	err := r.db.WithContext(ctx).Preload("User").First(&post, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &post, nil
}

func (r *PostRepository) FindPublishedByID(ctx context.Context, id uint64) (*model.Post, error) {
	var post model.Post
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("status = ?", "published").
		First(&post, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &post, nil
}

func (r *PostRepository) ListPublished(ctx context.Context, page int, pageSize int) ([]model.Post, int64, error) {
	var total int64
	query := r.db.WithContext(ctx).Model(&model.Post{}).Where("status = ?", "published")
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var posts []model.Post
	offset := (page - 1) * pageSize
	err := query.
		Preload("User").
		Order("created_at DESC").
		Order("id DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&posts).Error
	if err != nil {
		return nil, 0, err
	}
	return posts, total, nil
}

func (r *PostRepository) SoftDelete(ctx context.Context, id uint64) error {
	result := r.db.WithContext(ctx).Delete(&model.Post{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}
