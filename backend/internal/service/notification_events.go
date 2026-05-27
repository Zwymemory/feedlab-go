package service

import (
	"context"
	"fmt"

	"feedlab/backend/internal/event"
	"feedlab/backend/internal/model"
)

func publishNotification(ctx context.Context, publisher event.NotificationPublisher, evt event.NotificationEvent) {
	if publisher == nil || evt.RecipientID == 0 || evt.ActorID == 0 || evt.RecipientID == evt.ActorID {
		return
	}
	_ = publisher.PublishNotification(ctx, evt)
}

func postInteractionEvent(kind string, post model.Post, actorID uint64) event.NotificationEvent {
	return event.NotificationEvent{
		MessageID:   fmt.Sprintf("%s:%d:%d", kind, post.ID, actorID),
		Type:        kind,
		RecipientID: post.UserID,
		ActorID:     actorID,
		SubjectType: "post",
		SubjectID:   post.ID,
		PostID:      post.ID,
		Content:     post.Title,
	}
}

func followEvent(targetUserID uint64, actorID uint64) event.NotificationEvent {
	return event.NotificationEvent{
		MessageID:   fmt.Sprintf("%s:%d:%d", event.NotificationTypeFollow, targetUserID, actorID),
		Type:        event.NotificationTypeFollow,
		RecipientID: targetUserID,
		ActorID:     actorID,
		SubjectType: "user",
		SubjectID:   actorID,
		Content:     "started following you",
	}
}

func commentEvent(kind string, recipientID uint64, actorID uint64, postID uint64, commentID uint64, content string) event.NotificationEvent {
	return event.NotificationEvent{
		MessageID:   fmt.Sprintf("%s:%d", kind, commentID),
		Type:        kind,
		RecipientID: recipientID,
		ActorID:     actorID,
		SubjectType: "comment",
		SubjectID:   commentID,
		PostID:      postID,
		CommentID:   commentID,
		Content:     content,
	}
}

func commentLikeEvent(comment model.Comment, actorID uint64) event.NotificationEvent {
	return event.NotificationEvent{
		MessageID:   fmt.Sprintf("%s:%d:%d", event.NotificationTypeCommentLike, comment.ID, actorID),
		Type:        event.NotificationTypeCommentLike,
		RecipientID: comment.UserID,
		ActorID:     actorID,
		SubjectType: "comment",
		SubjectID:   comment.ID,
		PostID:      comment.PostID,
		CommentID:   comment.ID,
		Content:     comment.Content,
	}
}
