package service

import (
	"context"
	"errors"

	"feedlab/backend/internal/cache"
	"feedlab/backend/internal/repository"
	"feedlab/backend/internal/vo"
)

type UserService struct {
	users     *repository.UserRepository
	userCache *cache.UserCache
}

func NewUserService(users *repository.UserRepository, userCache *cache.UserCache) *UserService {
	return &UserService{users: users, userCache: userCache}
}

func (s *UserService) Me(ctx context.Context, userID uint64) (*vo.User, error) {
	user, err := s.users.FindByID(ctx, userID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	result := vo.NewUser(*user)
	return &result, nil
}

func (s *UserService) PublicProfile(ctx context.Context, userID uint64) (*vo.PublicUser, error) {
	if cached, ok, err := s.userCache.GetPublicProfile(ctx, userID); err == nil && ok {
		return cached, nil
	}
	if exists, err := s.userCache.ExistsPublicProfileNull(ctx, userID); err == nil && exists {
		return nil, ErrNotFound
	}

	user, err := s.users.FindByID(ctx, userID)
	if errors.Is(err, repository.ErrNotFound) {
		_ = s.userCache.SetPublicProfileNull(ctx, userID)
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	result := vo.NewPublicUser(*user)
	_ = s.userCache.SetPublicProfile(ctx, result)
	return &result, nil
}
