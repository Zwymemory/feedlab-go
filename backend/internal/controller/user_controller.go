package controller

import (
	"net/http"

	"feedlab/backend/internal/middleware"
	"feedlab/backend/internal/response"
	"feedlab/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type UserController struct {
	userService *service.UserService
}

func NewUserController(userService *service.UserService) *UserController {
	return &UserController{userService: userService}
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
