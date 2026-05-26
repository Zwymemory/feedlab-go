package model

import (
	"time"

	"gorm.io/gorm"
)

type Comment struct {
	ID            uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	PostID        uint64         `gorm:"not null;index" json:"post_id"`
	UserID        uint64         `gorm:"not null;index" json:"user_id"`
	ParentID      uint64         `gorm:"not null;default:0;index" json:"parent_id"`
	ReplyToUserID uint64         `gorm:"not null;default:0;index" json:"reply_to_user_id"`
	Content       string         `gorm:"type:text;not null" json:"content"`
	LikeCount     int64          `gorm:"not null;default:0" json:"like_count"`
	Status        string         `gorm:"size:20;not null;default:'published';index" json:"status"`
	CreatedAt     time.Time      `gorm:"index" json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
	User          User           `gorm:"foreignKey:UserID" json:"-"`
}
