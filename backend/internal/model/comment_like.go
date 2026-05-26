package model

import "time"

type CommentLike struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	CommentID uint64    `gorm:"not null;uniqueIndex:idx_comment_likes_comment_user;index" json:"comment_id"`
	UserID    uint64    `gorm:"not null;uniqueIndex:idx_comment_likes_comment_user;index" json:"user_id"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`
}
