package service

import (
	"context"
	"errors"

	"feedlab/backend/internal/repository"
	"feedlab/backend/internal/vo"
)

type UserService struct {
	users *repository.UserRepository
}

func NewUserService(users *repository.UserRepository) *UserService {
	return &UserService{users: users}
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
