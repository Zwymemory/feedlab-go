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

func (r *PostRepository) IncrementLikeCount(ctx context.Context, postID uint64, delta int64) error {
	result := r.db.WithContext(ctx).
		Model(&model.Post{}).
		Where("id = ?", postID).
		UpdateColumn("like_count", gorm.Expr("CASE WHEN like_count + ? < 0 THEN 0 ELSE like_count + ? END", delta, delta))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PostRepository) GetPublishedLikeCount(ctx context.Context, postID uint64) (int64, error) {
	var post model.Post
	err := r.db.WithContext(ctx).
		Select("like_count").
		Where("status = ?", "published").
		First(&post, postID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, ErrNotFound
	}
	if err != nil {
		return 0, err
	}
	return post.LikeCount, nil
}

func (r *PostRepository) IncrementCollectCount(ctx context.Context, postID uint64, delta int64) error {
	result := r.db.WithContext(ctx).
		Model(&model.Post{}).
		Where("id = ? AND status = ?", postID, "published").
		UpdateColumn("collect_count", gorm.Expr("CASE WHEN collect_count + ? < 0 THEN 0 ELSE collect_count + ? END", delta, delta))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PostRepository) GetPublishedCollectCount(ctx context.Context, postID uint64) (int64, error) {
	var post model.Post
	err := r.db.WithContext(ctx).
		Select("collect_count").
		Where("status = ?", "published").
		First(&post, postID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, ErrNotFound
	}
	if err != nil {
		return 0, err
	}
	return post.CollectCount, nil
}

func (r *PostRepository) IncrementCommentCount(ctx context.Context, postID uint64, delta int64) error {
	result := r.db.WithContext(ctx).
		Model(&model.Post{}).
		Where("id = ? AND status = ?", postID, "published").
		UpdateColumn("comment_count", gorm.Expr("CASE WHEN comment_count + ? < 0 THEN 0 ELSE comment_count + ? END", delta, delta))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}
