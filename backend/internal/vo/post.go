package vo

import (
	"time"

	"feedlab/backend/internal/model"
)

type Author struct {
	ID        uint64 `json:"id"`
	Username  string `json:"username"`
	Nickname  string `json:"nickname"`
	AvatarURL string `json:"avatar_url"`
}

type Post struct {
	ID           uint64      `json:"id"`
	UserID       uint64      `json:"user_id"`
	Title        string      `json:"title"`
	Content      string      `json:"content"`
	CoverURL     string      `json:"cover_url"`
	ContentType  string      `json:"content_type"`
	Status       string      `json:"status"`
	ViewCount    int64       `json:"view_count"`
	LikeCount    int64       `json:"like_count"`
	CommentCount int64       `json:"comment_count"`
	CollectCount int64       `json:"collect_count"`
	HotScore     float64     `json:"hot_score"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
	Author       Author      `json:"author"`
	Media        []PostMedia `json:"media"`
}

type PostMedia struct {
	ID           uint64    `json:"id"`
	PostID       uint64    `json:"post_id"`
	MediaType    string    `json:"media_type"`
	URL          string    `json:"url"`
	OriginalName string    `json:"original_name"`
	MimeType     string    `json:"mime_type"`
	SizeBytes    int64     `json:"size_bytes"`
	SortOrder    int       `json:"sort_order"`
	CreatedAt    time.Time `json:"created_at"`
}

type PostList struct {
	Items    []Post `json:"items"`
	Page     int    `json:"page"`
	PageSize int    `json:"page_size"`
	Total    int64  `json:"total"`
}

type FeedPostList struct {
	Items      []Post `json:"items"`
	NextCursor string `json:"next_cursor"`
	HasMore    bool   `json:"has_more"`
	Limit      int    `json:"limit"`
}

type LikeStatus struct {
	PostID    uint64 `json:"post_id"`
	Liked     bool   `json:"liked"`
	LikeCount int64  `json:"like_count"`
}

type CollectStatus struct {
	PostID       uint64 `json:"post_id"`
	Collected    bool   `json:"collected"`
	CollectCount int64  `json:"collect_count"`
}

func NewPost(post model.Post) Post {
	return Post{
		ID:           post.ID,
		UserID:       post.UserID,
		Title:        post.Title,
		Content:      post.Content,
		CoverURL:     post.CoverURL,
		ContentType:  post.ContentType,
		Status:       post.Status,
		ViewCount:    post.ViewCount,
		LikeCount:    post.LikeCount,
		CommentCount: post.CommentCount,
		CollectCount: post.CollectCount,
		HotScore:     post.HotScore,
		CreatedAt:    post.CreatedAt,
		UpdatedAt:    post.UpdatedAt,
		Author: Author{
			ID:        post.User.ID,
			Username:  post.User.Username,
			Nickname:  post.User.Nickname,
			AvatarURL: post.User.AvatarURL,
		},
		Media: NewPostMediaList(post.Media),
	}
}

func NewPosts(posts []model.Post) []Post {
	items := make([]Post, 0, len(posts))
	for _, post := range posts {
		items = append(items, NewPost(post))
	}
	return items
}

func NewPostMedia(media model.PostMedia) PostMedia {
	return PostMedia{
		ID:           media.ID,
		PostID:       media.PostID,
		MediaType:    media.MediaType,
		URL:          media.URL,
		OriginalName: media.OriginalName,
		MimeType:     media.MimeType,
		SizeBytes:    media.SizeBytes,
		SortOrder:    media.SortOrder,
		CreatedAt:    media.CreatedAt,
	}
}

func NewPostMediaList(media []model.PostMedia) []PostMedia {
	items := make([]PostMedia, 0, len(media))
	for _, item := range media {
		items = append(items, NewPostMedia(item))
	}
	return items
}
