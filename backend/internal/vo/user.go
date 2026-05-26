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

type PublicUser struct {
	ID             uint64    `json:"id"`
	Username       string    `json:"username"`
	Nickname       string    `json:"nickname"`
	AvatarURL      string    `json:"avatar_url"`
	Bio            string    `json:"bio"`
	FollowerCount  int64     `json:"follower_count"`
	FollowingCount int64     `json:"following_count"`
	PostCount      int64     `json:"post_count"`
	CreatedAt      time.Time `json:"created_at"`
}

type PublicUserList struct {
	Items    []PublicUser `json:"items"`
	Page     int          `json:"page"`
	PageSize int          `json:"page_size"`
	Total    int64        `json:"total"`
}

type FollowStatus struct {
	UserID        uint64 `json:"user_id"`
	Followed      bool   `json:"followed"`
	FollowerCount int64  `json:"follower_count"`
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

func NewPublicUser(user model.User) PublicUser {
	return PublicUser{
		ID:             user.ID,
		Username:       user.Username,
		Nickname:       user.Nickname,
		AvatarURL:      user.AvatarURL,
		Bio:            user.Bio,
		FollowerCount:  user.FollowerCount,
		FollowingCount: user.FollowingCount,
		PostCount:      user.PostCount,
		CreatedAt:      user.CreatedAt,
	}
}

func NewPublicUsers(users []model.User) []PublicUser {
	items := make([]PublicUser, 0, len(users))
	for _, user := range users {
		items = append(items, NewPublicUser(user))
	}
	return items
}
