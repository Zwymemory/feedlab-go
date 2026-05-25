package controller

import (
	"net/http"

	"feedlab/backend/internal/dto"
	"feedlab/backend/internal/middleware"
	"feedlab/backend/internal/response"
	"feedlab/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type UserController struct {
	userService *service.UserService
	postService *service.PostService
}

func NewUserController(userService *service.UserService, postService *service.PostService) *UserController {
	return &UserController{userService: userService, postService: postService}
}

// Me godoc
// @Summary Current user profile
// @Description Return the current user profile from JWT context.
// @Tags users
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Body
// @Failure 401 {object} response.Body
// @Router /api/v1/users/me [get]
func (u *UserController) Me(c *gin.Context) {
	userID, ok := middleware.CurrentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid token", nil)
		return
	}

	user, err := u.userService.Me(c.Request.Context(), userID)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, user)
}

// PublicProfile godoc
// @Summary Public user profile
// @Description Return public profile fields for a user without email, role or password fields.
// @Tags users
// @Produce json
// @Param id path int true "user id"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /api/v1/users/{id} [get]
func (u *UserController) PublicProfile(c *gin.Context) {
	userID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}

	user, err := u.userService.PublicProfile(c.Request.Context(), userID)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, user)
}

// ListPosts godoc
// @Summary Public user posts
// @Description List published posts created by a user.
// @Tags users
// @Produce json
// @Param id path int true "user id"
// @Param page query int false "page number"
// @Param page_size query int false "page size"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 404 {object} response.Body
// @Router /api/v1/users/{id}/posts [get]
func (u *UserController) ListPosts(c *gin.Context) {
	userID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}

	var query dto.ListPostsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid query", nil)
		return
	}

	result, err := u.postService.ListByUser(c.Request.Context(), userID, query)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, result)
}
