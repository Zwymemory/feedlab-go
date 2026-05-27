package model

import (
	"time"

	"gorm.io/gorm"
)

type Notification struct {
	ID          uint64         `gorm:"primaryKey" json:"id"`
	UserID      uint64         `gorm:"not null;index" json:"user_id"`
	ActorID     uint64         `gorm:"not null;index" json:"actor_id"`
	Type        string         `gorm:"size:40;not null;index" json:"type"`
	SubjectType string         `gorm:"size:40;not null" json:"subject_type"`
	SubjectID   uint64         `gorm:"not null;index" json:"subject_id"`
	PostID      uint64         `gorm:"not null;default:0;index" json:"post_id"`
	CommentID   uint64         `gorm:"not null;default:0;index" json:"comment_id"`
	Content     string         `gorm:"type:text;not null" json:"content"`
	IsRead      bool           `gorm:"not null;default:false;index" json:"is_read"`
	MessageID   string         `gorm:"size:120;not null;uniqueIndex:idx_notifications_message_id" json:"message_id"`
	ReadAt      *time.Time     `json:"read_at"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	Actor       User           `gorm:"foreignKey:ActorID" json:"actor"`
}
