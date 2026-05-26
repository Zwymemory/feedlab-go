package controller

import (
	"net/http"

	"feedlab/backend/internal/middleware"
	"feedlab/backend/internal/response"
	"feedlab/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type CommentLikeController struct {
	commentLikeService *service.CommentLikeService
}

func NewCommentLikeController(commentLikeService *service.CommentLikeService) *CommentLikeController {
	return &CommentLikeController{commentLikeService: commentLikeService}
}

func (cl *CommentLikeController) LikeComment(c *gin.Context) {
	commentID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}
	userID, ok := middleware.CurrentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid token", nil)
		return
	}

	result, err := cl.commentLikeService.LikeComment(c.Request.Context(), commentID, userID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}

func (cl *CommentLikeController) UnlikeComment(c *gin.Context) {
	commentID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}
	userID, ok := middleware.CurrentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid token", nil)
		return
	}

	result, err := cl.commentLikeService.UnlikeComment(c.Request.Context(), commentID, userID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}

func (cl *CommentLikeController) IsCommentLiked(c *gin.Context) {
	commentID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}
	userID, ok := middleware.CurrentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid token", nil)
		return
	}

	result, err := cl.commentLikeService.IsCommentLiked(c.Request.Context(), commentID, userID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}
