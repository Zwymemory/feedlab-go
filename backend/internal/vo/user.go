package vo

import (
	"time"

	"feedlab/backend/internal/model"
)

type User struct {
	ID             uint64    `json:"id"`
	Username       string    `json:"username"`
	Email          string    `json:"email"`
	Nickname       string    `json:"nickname"`
	AvatarURL      string    `json:"avatar_url"`
	Bio            string    `json:"bio"`
	Role           string    `json:"role"`
	Status         string    `json:"status"`
	FollowerCount  int64     `json:"follower_count"`
	FollowingCount int64     `json:"following_count"`
	PostCount      int64     `json:"post_count"`
	CreatedAt      time.Time `json:"created_at"`
}

type LoginResult struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int64  `json:"expires_in"`
	User        User   `json:"user"`
}

func NewUser(user model.User) User {
	return User{
		ID:             user.ID,
		Username:       user.Username,
		Email:          user.Email,
		Nickname:       user.Nickname,
		AvatarURL:      user.AvatarURL,
		Bio:            user.Bio,
		Role:           user.Role,
		Status:         user.Status,
		FollowerCount:  user.FollowerCount,
		FollowingCount: user.FollowingCount,
		PostCount:      user.PostCount,
		CreatedAt:      user.CreatedAt,
	}
}
