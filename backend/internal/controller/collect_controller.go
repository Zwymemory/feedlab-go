package controller

import (
	"net/http"

	"feedlab/backend/internal/dto"
	"feedlab/backend/internal/middleware"
	"feedlab/backend/internal/response"
	"feedlab/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type CollectController struct {
	collectService *service.CollectService
}

func NewCollectController(collectService *service.CollectService) *CollectController {
	return &CollectController{collectService: collectService}
}

func (cc *CollectController) CollectPost(c *gin.Context) {
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

	result, err := cc.collectService.CollectPost(c.Request.Context(), postID, userID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}

func (cc *CollectController) UncollectPost(c *gin.Context) {
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

	result, err := cc.collectService.UncollectPost(c.Request.Context(), postID, userID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}

func (cc *CollectController) IsPostCollected(c *gin.Context) {
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

	result, err := cc.collectService.IsPostCollected(c.Request.Context(), postID, userID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}

func (cc *CollectController) ListUserCollects(c *gin.Context) {
	userID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}

	var query dto.ListUserCollectsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid query", nil)
		return
	}

	result, err := cc.collectService.ListUserCollects(c.Request.Context(), userID, query)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}
