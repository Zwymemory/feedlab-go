package model

import "time"

type PostCollect struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	PostID    uint64    `gorm:"not null;uniqueIndex:idx_post_collects_post_user;index" json:"post_id"`
	UserID    uint64    `gorm:"not null;uniqueIndex:idx_post_collects_post_user;index" json:"user_id"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`
}
