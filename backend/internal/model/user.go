package model

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID             uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	Username       string         `gorm:"size:50;not null;uniqueIndex:idx_users_username" json:"username"`
	Email          string         `gorm:"size:100;not null;uniqueIndex:idx_users_email" json:"email"`
	PasswordHash   string         `gorm:"size:255;not null" json:"-"`
	Nickname       string         `gorm:"size:50;not null" json:"nickname"`
	AvatarURL      string         `gorm:"size:255;not null;default:''" json:"avatar_url"`
	Bio            string         `gorm:"size:255;not null;default:''" json:"bio"`
	Role           string         `gorm:"size:20;not null;default:'user'" json:"role"`
	Status         string         `gorm:"size:20;not null;default:'active'" json:"status"`
	FollowerCount  int64          `gorm:"not null;default:0" json:"follower_count"`
	FollowingCount int64          `gorm:"not null;default:0" json:"following_count"`
	PostCount      int64          `gorm:"not null;default:0" json:"post_count"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}
