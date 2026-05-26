package repository

import (
	"context"

	"feedlab/backend/internal/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PostLikeRepository struct {
	db *gorm.DB
}

func NewPostLikeRepository(db *gorm.DB) *PostLikeRepository {
	return &PostLikeRepository{db: db}
}

func (r *PostLikeRepository) WithTx(tx *gorm.DB) *PostLikeRepository {
	return &PostLikeRepository{db: tx}
}

func (r *PostLikeRepository) Transaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(fn)
}

func (r *PostLikeRepository) Like(ctx context.Context, postID uint64, userID uint64) (bool, error) {
	like := model.PostLike{PostID: postID, UserID: userID}
	result := r.db.WithContext(ctx).
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(&like)
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}

func (r *PostLikeRepository) Unlike(ctx context.Context, postID uint64, userID uint64) (bool, error) {
	result := r.db.WithContext(ctx).
		Where("post_id = ? AND user_id = ?", postID, userID).
		Delete(&model.PostLike{})
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}

func (r *PostLikeRepository) Exists(ctx context.Context, postID uint64, userID uint64) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.PostLike{}).
		Where("post_id = ? AND user_id = ?", postID, userID).
		Count(&count).Error
	return count > 0, err
}

func (r *PostLikeRepository) ListUserLikedPosts(ctx context.Context, userID uint64, page int, pageSize int) ([]model.Post, int64, error) {
	base := r.db.WithContext(ctx).
		Model(&model.Post{}).
		Joins("JOIN post_likes ON post_likes.post_id = posts.id").
		Where("post_likes.user_id = ? AND posts.status = ?", userID, "published")

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var posts []model.Post
	offset := (page - 1) * pageSize
	err := r.db.WithContext(ctx).
		Model(&model.Post{}).
		Joins("JOIN post_likes ON post_likes.post_id = posts.id").
		Where("post_likes.user_id = ? AND posts.status = ?", userID, "published").
		Preload("User").
		Order("post_likes.created_at DESC").
		Order("posts.id DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&posts).Error
	if err != nil {
		return nil, 0, err
	}
	return posts, total, nil
}
