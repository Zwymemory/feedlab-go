package vo

import (
	"time"

	"feedlab/backend/internal/model"
)

type Notification struct {
	ID          uint64     `json:"id"`
	UserID      uint64     `json:"user_id"`
	ActorID     uint64     `json:"actor_id"`
	Actor       PublicUser `json:"actor"`
	Type        string     `json:"type"`
	SubjectType string     `json:"subject_type"`
	SubjectID   uint64     `json:"subject_id"`
	PostID      uint64     `json:"post_id"`
	CommentID   uint64     `json:"comment_id"`
	Content     string     `json:"content"`
	IsRead      bool       `json:"is_read"`
	MessageID   string     `json:"message_id"`
	ReadAt      *time.Time `json:"read_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

type NotificationList struct {
	Items    []Notification `json:"items"`
	Page     int            `json:"page"`
	PageSize int            `json:"page_size"`
	Total    int64          `json:"total"`
}

type UnreadNotificationCount struct {
	UnreadCount int64 `json:"unread_count"`
}

type ReadNotificationResult struct {
	Read bool `json:"read"`
}

func NewNotification(item model.Notification) Notification {
	return Notification{
		ID:          item.ID,
		UserID:      item.UserID,
		ActorID:     item.ActorID,
		Actor:       NewPublicUser(item.Actor),
		Type:        item.Type,
		SubjectType: item.SubjectType,
		SubjectID:   item.SubjectID,
		PostID:      item.PostID,
		CommentID:   item.CommentID,
		Content:     item.Content,
		IsRead:      item.IsRead,
		MessageID:   item.MessageID,
		ReadAt:      item.ReadAt,
		CreatedAt:   item.CreatedAt,
	}
}

func NewNotifications(items []model.Notification) []Notification {
	result := make([]Notification, 0, len(items))
	for _, item := range items {
		result = append(result, NewNotification(item))
	}
	return result
}
