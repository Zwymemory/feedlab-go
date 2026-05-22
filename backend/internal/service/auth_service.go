package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"feedlab/backend/internal/dto"
	"feedlab/backend/internal/model"
	"feedlab/backend/internal/repository"
	"feedlab/backend/internal/vo"
	feedjwt "feedlab/backend/pkg/jwt"
	"feedlab/backend/pkg/password"
)

type AuthService struct {
	users  *repository.UserRepository
	tokens *feedjwt.Manager
}

func NewAuthService(users *repository.UserRepository, tokens *feedjwt.Manager) *AuthService {
	return &AuthService{users: users, tokens: tokens}
}

func (s *AuthService) Register(ctx context.Context, req dto.RegisterRequest) (*vo.User, error) {
	username := strings.TrimSpace(req.Username)
	email := strings.ToLower(strings.TrimSpace(req.Email))
	nickname := strings.TrimSpace(req.Nickname)
	if nickname == "" {
		nickname = username
	}

	exists, err := s.users.ExistsByUsername(ctx, username)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrConflict
	}

	exists, err = s.users.ExistsByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrConflict
	}

	hash, err := password.Hash(req.Password)
	if err != nil {
		return nil, err
	}

	user := model.User{
		Username:     username,
		Email:        email,
		PasswordHash: hash,
		Nickname:     nickname,
		Role:         "user",
		Status:       "active",
	}
	if err := s.users.Create(ctx, &user); err != nil {
		return nil, err
	}

	result := vo.NewUser(user)
	return &result, nil
}

func (s *AuthService) Login(ctx context.Context, req dto.LoginRequest) (*vo.LoginResult, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	user, err := s.users.FindByEmail(ctx, email)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrUnauthorized
	}
	if err != nil {
		return nil, err
	}

	if !password.Compare(user.PasswordHash, req.Password) {
		return nil, ErrUnauthorized
	}
	if user.Status != "active" {
		return nil, ErrForbidden
	}

	token, expiresAt, err := s.tokens.Generate(user.ID, user.Role)
	if err != nil {
		return nil, err
	}

	return &vo.LoginResult{
		AccessToken: token,
		TokenType:   "Bearer",
		ExpiresIn:   int64(time.Until(expiresAt).Seconds()),
		User:        vo.NewUser(*user),
	}, nil
}
