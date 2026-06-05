package dto

type CreatePostRequest struct {
	Title       string             `json:"title" binding:"required,min=1,max=120"`
	Content     string             `json:"content" binding:"omitempty"`
	CoverURL    string             `json:"cover_url" binding:"omitempty,max=255"`
	ContentType string             `json:"content_type" binding:"omitempty,oneof=article image video mixed"`
	Status      string             `json:"status" binding:"omitempty,oneof=draft published"`
	Media       []PostMediaRequest `json:"media" binding:"omitempty,dive"`
}

type PostMediaRequest struct {
	MediaType    string `json:"media_type" binding:"required,oneof=image video"`
	URL          string `json:"url" binding:"required,max=512"`
	OriginalName string `json:"original_name" binding:"omitempty,max=255"`
	MimeType     string `json:"mime_type" binding:"omitempty,max=100"`
	SizeBytes    int64  `json:"size_bytes" binding:"omitempty,min=0"`
	SortOrder    int    `json:"sort_order" binding:"omitempty,min=0"`
}

type ListPostsQuery struct {
	Page     int `form:"page" binding:"omitempty,min=1"`
	PageSize int `form:"page_size" binding:"omitempty,min=1,max=50"`
}

type ListHotPostsQuery struct {
	Limit int `form:"limit" binding:"omitempty,min=1,max=50"`
}

type ListFeedPostsQuery struct {
	Cursor string `form:"cursor" binding:"omitempty"`
	Limit  int    `form:"limit" binding:"omitempty,min=1,max=50"`
}

type ListUserLikesQuery struct {
	Page     int `form:"page" binding:"omitempty,min=1"`
	PageSize int `form:"page_size" binding:"omitempty,min=1,max=50"`
}

type ListUserCollectsQuery struct {
	Page     int `form:"page" binding:"omitempty,min=1"`
	PageSize int `form:"page_size" binding:"omitempty,min=1,max=50"`
}
