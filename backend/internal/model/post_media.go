package model

import "time"

type PostMedia struct {
	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	PostID       uint64    `gorm:"not null;index" json:"post_id"`
	MediaType    string    `gorm:"size:20;not null;index" json:"media_type"`
	URL          string    `gorm:"size:512;not null" json:"url"`
	OriginalName string    `gorm:"size:255;not null;default:''" json:"original_name"`
	MimeType     string    `gorm:"size:100;not null;default:''" json:"mime_type"`
	SizeBytes    int64     `gorm:"not null;default:0" json:"size_bytes"`
	SortOrder    int       `gorm:"not null;default:0" json:"sort_order"`
	CreatedAt    time.Time `gorm:"index" json:"created_at"`
}
