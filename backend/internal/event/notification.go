package event

import "context"

const (
	NotificationTypePostLike    = "post_like"
	NotificationTypePostCollect = "post_collect"
	NotificationTypeComment     = "comment"
	NotificationTypeReply       = "reply"
	NotificationTypeFollow      = "follow"
	NotificationTypeCommentLike = "comment_like"
)

type NotificationEvent struct {
	MessageID   string `json:"message_id"`
	Type        string `json:"type"`
	RecipientID uint64 `json:"recipient_id"`
	ActorID     uint64 `json:"actor_id"`
	SubjectType string `json:"subject_type"`
	SubjectID   uint64 `json:"subject_id"`
	PostID      uint64 `json:"post_id"`
	CommentID   uint64 `json:"comment_id"`
	Content     string `json:"content"`
}

type NotificationPublisher interface {
	PublishNotification(ctx context.Context, event NotificationEvent) error
}

type NoopNotificationPublisher struct{}

func (NoopNotificationPublisher) PublishNotification(context.Context, NotificationEvent) error {
	return nil
}
