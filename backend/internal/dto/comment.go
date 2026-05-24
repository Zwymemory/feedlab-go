package dto

type CreateCommentRequest struct {
	Content  string `json:"content" binding:"required,min=1,max=1000"`
	ParentID uint64 `json:"parent_id" binding:"omitempty,min=0"`
}

type ListCommentsQuery struct {
	Page     int `form:"page" binding:"omitempty,min=1"`
	PageSize int `form:"page_size" binding:"omitempty,min=1,max=50"`
}
