package controller

import (
	"net/http"
	"strconv"

	"feedlab/backend/internal/dto"
	"feedlab/backend/internal/middleware"
	"feedlab/backend/internal/response"
	"feedlab/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type PostController struct {
	postService *service.PostService
}

func NewPostController(postService *service.PostService) *PostController {
	return &PostController{postService: postService}
}

// Create godoc
// @Summary Create post
// @Description Create a post for the current user and update user post count in one transaction.
// @Tags posts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body dto.CreatePostRequest true "create post payload"
// @Success 201 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Router /api/v1/posts [post]
func (p *PostController) Create(c *gin.Context) {
	userID, ok := middleware.CurrentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid token", nil)
		return
	}

	var req dto.CreatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid request body", nil)
		return
	}

	post, err := p.postService.Create(c.Request.Context(), userID, req)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Created(c, post)
}

// List godoc
// @Summary List published posts
// @Description List published posts by page and page_size.
// @Tags posts
// @Produce json
// @Param page query int false "page number"
// @Param page_size query int false "page size"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Router /api/v1/posts [get]
func (p *PostController) List(c *gin.Context) {
	var query dto.ListPostsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid query", nil)
		return
	}

	result, err := p.postService.List(c.Request.Context(), query)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, result)
}

// Feed godoc
// @Summary Cursor feed posts
// @Description List published posts by cursor for infinite-scroll feed.
// @Tags feed
// @Produce json
// @Param cursor query string false "cursor returned by previous request"
// @Param limit query int false "max number of feed posts"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Router /api/v1/feed/posts [get]
func (p *PostController) Feed(c *gin.Context) {
	var query dto.ListFeedPostsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid query", nil)
		return
	}

	result, err := p.postService.Feed(c.Request.Context(), query)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, result)
}

// Hot godoc
// @Summary List hot posts
// @Description List hot published posts from Redis ZSet with MySQL fallback.
// @Tags posts
// @Produce json
// @Param limit query int false "max number of hot posts"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Router /api/v1/posts/hot [get]
func (p *PostController) Hot(c *gin.Context) {
	var query dto.ListHotPostsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid query", nil)
		return
	}

	result, err := p.postService.Hot(c.Request.Context(), query)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, result)
}

// Detail godoc
// @Summary Post detail
// @Description Return a published post detail.
// @Tags posts
// @Produce json
// @Param id path int true "post id"
// @Success 200 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /api/v1/posts/{id} [get]
func (p *PostController) Detail(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}

	post, err := p.postService.Detail(c.Request.Context(), id)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, post)
}

// Delete godoc
// @Summary Delete post
// @Description Soft delete a post. Only the author or admin can delete it.
// @Tags posts
// @Produce json
// @Security BearerAuth
// @Param id path int true "post id"
// @Success 200 {object} response.Body
// @Failure 401 {object} response.Body
// @Failure 403 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /api/v1/posts/{id} [delete]
func (p *PostController) Delete(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}
	userID, ok := middleware.CurrentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid token", nil)
		return
	}
	role, _ := middleware.CurrentRole(c)

	if err := p.postService.Delete(c.Request.Context(), id, userID, role); err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{"deleted": true})
}

func parseIDParam(c *gin.Context, name string) (uint64, bool) {
	id, err := strconv.ParseUint(c.Param(name), 10, 64)
	return id, err == nil && id > 0
}
