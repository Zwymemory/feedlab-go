package model

import (
	"time"

	"gorm.io/gorm"
)

type Post struct {
	ID           uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID       uint64         `gorm:"not null;index" json:"user_id"`
	Title        string         `gorm:"size:120;not null" json:"title"`
	Content      string         `gorm:"type:text;not null" json:"content"`
	CoverURL     string         `gorm:"size:255;not null;default:''" json:"cover_url"`
	ContentType  string         `gorm:"size:20;not null;default:'article'" json:"content_type"`
	Status       string         `gorm:"size:20;not null;default:'published';index" json:"status"`
	ViewCount    int64          `gorm:"not null;default:0" json:"view_count"`
	LikeCount    int64          `gorm:"not null;default:0" json:"like_count"`
	CommentCount int64          `gorm:"not null;default:0" json:"comment_count"`
	CollectCount int64          `gorm:"not null;default:0" json:"collect_count"`
	HotScore     float64        `gorm:"not null;default:0" json:"hot_score"`
	CreatedAt    time.Time      `gorm:"index" json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
	User         User           `gorm:"foreignKey:UserID" json:"-"`
}
