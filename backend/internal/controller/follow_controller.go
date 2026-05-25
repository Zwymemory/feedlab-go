package controller

import (
	"net/http"

	"feedlab/backend/internal/dto"
	"feedlab/backend/internal/middleware"
	"feedlab/backend/internal/response"
	"feedlab/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type FollowController struct {
	followService *service.FollowService
}

func NewFollowController(followService *service.FollowService) *FollowController {
	return &FollowController{followService: followService}
}

func (fc *FollowController) Follow(c *gin.Context) {
	targetUserID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}
	currentUserID, ok := middleware.CurrentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid token", nil)
		return
	}

	result, err := fc.followService.Follow(c.Request.Context(), currentUserID, targetUserID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}

func (fc *FollowController) Unfollow(c *gin.Context) {
	targetUserID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}
	currentUserID, ok := middleware.CurrentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid token", nil)
		return
	}

	result, err := fc.followService.Unfollow(c.Request.Context(), currentUserID, targetUserID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}

func (fc *FollowController) IsFollowed(c *gin.Context) {
	targetUserID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}
	currentUserID, ok := middleware.CurrentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid token", nil)
		return
	}

	result, err := fc.followService.IsFollowed(c.Request.Context(), currentUserID, targetUserID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}

func (fc *FollowController) ListFollowers(c *gin.Context) {
	userID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}

	var query dto.ListFollowsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid query", nil)
		return
	}

	result, err := fc.followService.ListFollowers(c.Request.Context(), userID, query)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}

func (fc *FollowController) ListFollowing(c *gin.Context) {
	userID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}

	var query dto.ListFollowsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid query", nil)
		return
	}

	result, err := fc.followService.ListFollowing(c.Request.Context(), userID, query)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}
