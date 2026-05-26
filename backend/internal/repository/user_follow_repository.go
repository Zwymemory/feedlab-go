package repository

import (
	"context"

	"feedlab/backend/internal/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type UserFollowRepository struct {
	db *gorm.DB
}

func NewUserFollowRepository(db *gorm.DB) *UserFollowRepository {
	return &UserFollowRepository{db: db}
}

func (r *UserFollowRepository) WithTx(tx *gorm.DB) *UserFollowRepository {
	return &UserFollowRepository{db: tx}
}

func (r *UserFollowRepository) Transaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(fn)
}

func (r *UserFollowRepository) Follow(ctx context.Context, followerID uint64, followeeID uint64) (bool, error) {
	follow := model.UserFollow{FollowerID: followerID, FolloweeID: followeeID}
	result := r.db.WithContext(ctx).
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(&follow)
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}

func (r *UserFollowRepository) Unfollow(ctx context.Context, followerID uint64, followeeID uint64) (bool, error) {
	result := r.db.WithContext(ctx).
		Where("follower_id = ? AND followee_id = ?", followerID, followeeID).
		Delete(&model.UserFollow{})
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}

func (r *UserFollowRepository) Exists(ctx context.Context, followerID uint64, followeeID uint64) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.UserFollow{}).
		Where("follower_id = ? AND followee_id = ?", followerID, followeeID).
		Count(&count).Error
	return count > 0, err
}

func (r *UserFollowRepository) ListFollowers(ctx context.Context, followeeID uint64, page int, pageSize int) ([]model.User, int64, error) {
	base := r.db.WithContext(ctx).
		Model(&model.User{}).
		Joins("JOIN user_follows ON user_follows.follower_id = users.id").
		Where("user_follows.followee_id = ?", followeeID)

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var users []model.User
	offset := (page - 1) * pageSize
	err := r.db.WithContext(ctx).
		Model(&model.User{}).
		Joins("JOIN user_follows ON user_follows.follower_id = users.id").
		Where("user_follows.followee_id = ?", followeeID).
		Order("user_follows.created_at DESC").
		Order("users.id DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&users).Error
	if err != nil {
		return nil, 0, err
	}
	return users, total, nil
}

func (r *UserFollowRepository) ListFollowing(ctx context.Context, followerID uint64, page int, pageSize int) ([]model.User, int64, error) {
	base := r.db.WithContext(ctx).
		Model(&model.User{}).
		Joins("JOIN user_follows ON user_follows.followee_id = users.id").
		Where("user_follows.follower_id = ?", followerID)

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var users []model.User
	offset := (page - 1) * pageSize
	err := r.db.WithContext(ctx).
		Model(&model.User{}).
		Joins("JOIN user_follows ON user_follows.followee_id = users.id").
		Where("user_follows.follower_id = ?", followerID).
		Order("user_follows.created_at DESC").
		Order("users.id DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&users).Error
	if err != nil {
		return nil, 0, err
	}
	return users, total, nil
}
