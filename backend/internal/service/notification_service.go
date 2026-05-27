package service

import (
	"context"
	"errors"

	"feedlab/backend/internal/dto"
	"feedlab/backend/internal/event"
	"feedlab/backend/internal/model"
	"feedlab/backend/internal/repository"
	"feedlab/backend/internal/vo"
)

type NotificationService struct {
	notifications *repository.NotificationRepository
	users         *repository.UserRepository
}

func NewNotificationService(notifications *repository.NotificationRepository, users *repository.UserRepository) *NotificationService {
	return &NotificationService{notifications: notifications, users: users}
}

func (s *NotificationService) CreateFromEvent(ctx context.Context, evt event.NotificationEvent) error {
	if evt.MessageID == "" || evt.RecipientID == 0 || evt.ActorID == 0 || evt.Type == "" || evt.SubjectType == "" || evt.SubjectID == 0 {
		return ErrBadRequest
	}
	if evt.RecipientID == evt.ActorID {
		return nil
	}
	notification := model.Notification{
		UserID:      evt.RecipientID,
		ActorID:     evt.ActorID,
		Type:        evt.Type,
		SubjectType: evt.SubjectType,
		SubjectID:   evt.SubjectID,
		PostID:      evt.PostID,
		CommentID:   evt.CommentID,
		Content:     evt.Content,
		MessageID:   evt.MessageID,
	}
	return s.notifications.Create(ctx, &notification)
}

func (s *NotificationService) List(ctx context.Context, userID uint64, query dto.ListNotificationsQuery) (*vo.NotificationList, error) {
	if _, err := s.users.FindByID(ctx, userID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	page := query.Page
	if page <= 0 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize <= 0 {
		pageSize = 10
	}

	items, total, err := s.notifications.ListByUser(ctx, userID, page, pageSize, query.UnreadOnly)
	if err != nil {
		return nil, err
	}
	return &vo.NotificationList{
		Items:    vo.NewNotifications(items),
		Page:     page,
		PageSize: pageSize,
		Total:    total,
	}, nil
}

func (s *NotificationService) UnreadCount(ctx context.Context, userID uint64) (*vo.UnreadNotificationCount, error) {
	count, err := s.notifications.UnreadCount(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &vo.UnreadNotificationCount{UnreadCount: count}, nil
}

func (s *NotificationService) MarkRead(ctx context.Context, userID uint64, notificationID uint64) (*vo.ReadNotificationResult, error) {
	if err := s.notifications.MarkRead(ctx, userID, notificationID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &vo.ReadNotificationResult{Read: true}, nil
}

func (s *NotificationService) MarkAllRead(ctx context.Context, userID uint64) (*vo.ReadNotificationResult, error) {
	if err := s.notifications.MarkAllRead(ctx, userID); err != nil {
		return nil, err
	}
	return &vo.ReadNotificationResult{Read: true}, nil
}
