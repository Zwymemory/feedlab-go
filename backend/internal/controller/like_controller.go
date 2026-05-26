package controller

import (
	"net/http"

	"feedlab/backend/internal/dto"
	"feedlab/backend/internal/middleware"
	"feedlab/backend/internal/response"
	"feedlab/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type LikeController struct {
	likeService *service.LikeService
}

func NewLikeController(likeService *service.LikeService) *LikeController {
	return &LikeController{likeService: likeService}
}

func (l *LikeController) LikePost(c *gin.Context) {
	postID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}
	userID, ok := middleware.CurrentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid token", nil)
		return
	}

	result, err := l.likeService.LikePost(c.Request.Context(), postID, userID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}

func (l *LikeController) UnlikePost(c *gin.Context) {
	postID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}
	userID, ok := middleware.CurrentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid token", nil)
		return
	}

	result, err := l.likeService.UnlikePost(c.Request.Context(), postID, userID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}

func (l *LikeController) IsPostLiked(c *gin.Context) {
	postID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}
	userID, ok := middleware.CurrentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid token", nil)
		return
	}

	result, err := l.likeService.IsPostLiked(c.Request.Context(), postID, userID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}

func (l *LikeController) ListUserLikes(c *gin.Context) {
	userID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}

	var query dto.ListUserLikesQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid query", nil)
		return
	}

	result, err := l.likeService.ListUserLikes(c.Request.Context(), userID, query)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}
