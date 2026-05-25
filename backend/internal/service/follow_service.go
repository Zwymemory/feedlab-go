package service

import (
	"context"
	"errors"

	"feedlab/backend/internal/dto"
	"feedlab/backend/internal/repository"
	"feedlab/backend/internal/vo"

	"gorm.io/gorm"
)

type FollowService struct {
	follows *repository.UserFollowRepository
	users   *repository.UserRepository
}

func NewFollowService(follows *repository.UserFollowRepository, users *repository.UserRepository) *FollowService {
	return &FollowService{follows: follows, users: users}
}

func (s *FollowService) Follow(ctx context.Context, currentUserID uint64, targetUserID uint64) (*vo.FollowStatus, error) {
	if currentUserID == targetUserID {
		return nil, ErrBadRequest
	}
	if err := s.ensureUsersExist(ctx, currentUserID, targetUserID); err != nil {
		return nil, err
	}

	err := s.follows.Transaction(ctx, func(tx *gorm.DB) error {
		txFollows := s.follows.WithTx(tx)
		txUsers := s.users.WithTx(tx)

		created, err := txFollows.Follow(ctx, currentUserID, targetUserID)
		if err != nil {
			return err
		}
		if !created {
			return nil
		}
		if err := txUsers.IncrementFollowingCount(ctx, currentUserID, 1); err != nil {
			return err
		}
		return txUsers.IncrementFollowerCount(ctx, targetUserID, 1)
	})
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return s.followStatus(ctx, targetUserID, true)
}

func (s *FollowService) Unfollow(ctx context.Context, currentUserID uint64, targetUserID uint64) (*vo.FollowStatus, error) {
	if currentUserID == targetUserID {
		return nil, ErrBadRequest
	}
	if err := s.ensureUsersExist(ctx, currentUserID, targetUserID); err != nil {
		return nil, err
	}

	err := s.follows.Transaction(ctx, func(tx *gorm.DB) error {
		txFollows := s.follows.WithTx(tx)
		txUsers := s.users.WithTx(tx)

		deleted, err := txFollows.Unfollow(ctx, currentUserID, targetUserID)
		if err != nil {
			return err
		}
		if !deleted {
			return nil
		}
		if err := txUsers.IncrementFollowingCount(ctx, currentUserID, -1); err != nil {
			return err
		}
		return txUsers.IncrementFollowerCount(ctx, targetUserID, -1)
	})
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return s.followStatus(ctx, targetUserID, false)
}

func (s *FollowService) IsFollowed(ctx context.Context, currentUserID uint64, targetUserID uint64) (*vo.FollowStatus, error) {
	if currentUserID == targetUserID {
		return nil, ErrBadRequest
	}
	if err := s.ensureUsersExist(ctx, currentUserID, targetUserID); err != nil {
		return nil, err
	}

	followed, err := s.follows.Exists(ctx, currentUserID, targetUserID)
	if err != nil {
		return nil, err
	}
	return s.followStatus(ctx, targetUserID, followed)
}

func (s *FollowService) ListFollowers(ctx context.Context, userID uint64, query dto.ListFollowsQuery) (*vo.PublicUserList, error) {
	if _, err := s.users.FindByID(ctx, userID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	page, pageSize := followPagination(query)
	users, total, err := s.follows.ListFollowers(ctx, userID, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &vo.PublicUserList{
		Items:    vo.NewPublicUsers(users),
		Page:     page,
		PageSize: pageSize,
		Total:    total,
	}, nil
}

func (s *FollowService) ListFollowing(ctx context.Context, userID uint64, query dto.ListFollowsQuery) (*vo.PublicUserList, error) {
	if _, err := s.users.FindByID(ctx, userID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	page, pageSize := followPagination(query)
	users, total, err := s.follows.ListFollowing(ctx, userID, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &vo.PublicUserList{
		Items:    vo.NewPublicUsers(users),
		Page:     page,
		PageSize: pageSize,
		Total:    total,
	}, nil
}

func (s *FollowService) ensureUsersExist(ctx context.Context, currentUserID uint64, targetUserID uint64) error {
	if _, err := s.users.FindByID(ctx, currentUserID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return ErrNotFound
		}
		return err
	}
	if _, err := s.users.FindByID(ctx, targetUserID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return ErrNotFound
		}
		return err
	}
	return nil
}

func (s *FollowService) followStatus(ctx context.Context, targetUserID uint64, followed bool) (*vo.FollowStatus, error) {
	target, err := s.users.FindByID(ctx, targetUserID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &vo.FollowStatus{UserID: targetUserID, Followed: followed, FollowerCount: target.FollowerCount}, nil
}

func followPagination(query dto.ListFollowsQuery) (int, int) {
	page := query.Page
	if page <= 0 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize <= 0 {
		pageSize = 10
	}
	return page, pageSize
}
