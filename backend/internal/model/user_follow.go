package model

import "time"

type UserFollow struct {
	ID         uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	FollowerID uint64    `gorm:"not null;uniqueIndex:idx_user_follows_pair;index" json:"follower_id"`
	FolloweeID uint64    `gorm:"not null;uniqueIndex:idx_user_follows_pair;index" json:"followee_id"`
	CreatedAt  time.Time `gorm:"index" json:"created_at"`
}
