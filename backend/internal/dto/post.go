package dto

type CreatePostRequest struct {
	Title       string `json:"title" binding:"required,min=1,max=120"`
	Content     string `json:"content" binding:"required,min=1"`
	CoverURL    string `json:"cover_url" binding:"omitempty,max=255"`
	ContentType string `json:"content_type" binding:"omitempty,oneof=article image video"`
	Status      string `json:"status" binding:"omitempty,oneof=draft published"`
}

type ListPostsQuery struct {
	Page     int `form:"page" binding:"omitempty,min=1"`
	PageSize int `form:"page_size" binding:"omitempty,min=1,max=50"`
}

type ListUserLikesQuery struct {
	Page     int `form:"page" binding:"omitempty,min=1"`
	PageSize int `form:"page_size" binding:"omitempty,min=1,max=50"`
}
