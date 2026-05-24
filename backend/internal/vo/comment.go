package vo

import (
	"time"

	"feedlab/backend/internal/model"
)

type Comment struct {
	ID            uint64    `json:"id"`
	PostID        uint64    `json:"post_id"`
	UserID        uint64    `json:"user_id"`
	ParentID      uint64    `json:"parent_id"`
	ReplyToUserID uint64    `json:"reply_to_user_id"`
	Content       string    `json:"content"`
	LikeCount     int64     `json:"like_count"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	Author        Author    `json:"author"`
}

type CommentList struct {
	Items    []Comment `json:"items"`
	Page     int       `json:"page"`
	PageSize int       `json:"page_size"`
	Total    int64     `json:"total"`
}

type DeleteCommentResult struct {
	Deleted      bool  `json:"deleted"`
	DeletedCount int64 `json:"deleted_count"`
}

func NewComment(comment model.Comment) Comment {
	return Comment{
		ID:            comment.ID,
		PostID:        comment.PostID,
		UserID:        comment.UserID,
		ParentID:      comment.ParentID,
		ReplyToUserID: comment.ReplyToUserID,
		Content:       comment.Content,
		LikeCount:     comment.LikeCount,
		Status:        comment.Status,
		CreatedAt:     comment.CreatedAt,
		UpdatedAt:     comment.UpdatedAt,
		Author: Author{
			ID:        comment.User.ID,
			Username:  comment.User.Username,
			Nickname:  comment.User.Nickname,
			AvatarURL: comment.User.AvatarURL,
		},
	}
}

func NewComments(comments []model.Comment) []Comment {
	items := make([]Comment, 0, len(comments))
	for _, comment := range comments {
		items = append(items, NewComment(comment))
	}
	return items
}
