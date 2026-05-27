package dto

type ListNotificationsQuery struct {
	Page       int  `form:"page" binding:"omitempty,min=1"`
	PageSize   int  `form:"page_size" binding:"omitempty,min=1,max=50"`
	UnreadOnly bool `form:"unread_only" binding:"omitempty"`
}
