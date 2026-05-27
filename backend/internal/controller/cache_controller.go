package controller

import (
	"net/http"

	"feedlab/backend/internal/dto"
	"feedlab/backend/internal/response"
	"feedlab/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type CacheController struct {
	cacheService *service.CacheService
}

func NewCacheController(cacheService *service.CacheService) *CacheController {
	return &CacheController{cacheService: cacheService}
}

// PostStatus godoc
// @Summary Inspect post cache status
// @Description Inspect Redis keys related to a post without returning cached payloads.
// @Tags cache
// @Produce json
// @Security BearerAuth
// @Param id path int true "post id"
// @Param page query int false "comment page"
// @Param page_size query int false "comment page size"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Router /api/v1/cache/posts/{id}/status [get]
func (c *CacheController) PostStatus(ctx *gin.Context) {
	postID, ok := parseIDParam(ctx, "id")
	if !ok {
		response.Error(ctx, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}

	var query dto.PostCacheStatusQuery
	if err := ctx.ShouldBindQuery(&query); err != nil {
		response.Error(ctx, http.StatusBadRequest, response.CodeBadRequest, "invalid query", nil)
		return
	}

	status, err := c.cacheService.PostStatus(ctx.Request.Context(), postID, query)
	if err != nil {
		writeServiceError(ctx, err)
		return
	}
	response.Success(ctx, status)
}
