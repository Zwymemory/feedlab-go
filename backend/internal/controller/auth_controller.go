package controller

import (
	"errors"
	"net/http"

	"feedlab/backend/internal/dto"
	"feedlab/backend/internal/response"
	"feedlab/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type AuthController struct {
	authService *service.AuthService
}

func NewAuthController(authService *service.AuthService) *AuthController {
	return &AuthController{authService: authService}
}

// Register godoc
// @Summary Register user
// @Description Create a FeedLab user account with bcrypt password hashing.
// @Tags auth
// @Accept json
// @Produce json
// @Param body body dto.RegisterRequest true "register payload"
// @Success 201 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 409 {object} response.Body
// @Router /api/v1/auth/register [post]
func (a *AuthController) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid request body", nil)
		return
	}

	user, err := a.authService.Register(c.Request.Context(), req)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Created(c, user)
}

// Login godoc
// @Summary Login user
// @Description Login with email and password, then return an access token.
// @Tags auth
// @Accept json
// @Produce json
// @Param body body dto.LoginRequest true "login payload"
// @Success 200 {object} response.Body
// @Failure 400 {object} response.Body
// @Failure 401 {object} response.Body
// @Router /api/v1/auth/login [post]
func (a *AuthController) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid request body", nil)
		return
	}

	result, err := a.authService.Login(c.Request.Context(), req)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, result)
}

func writeServiceError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrBadRequest):
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, err.Error(), nil)
	case errors.Is(err, service.ErrUnauthorized):
		response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid email or password", nil)
	case errors.Is(err, service.ErrForbidden):
		response.Error(c, http.StatusForbidden, response.CodeForbidden, "permission denied", nil)
	case errors.Is(err, service.ErrNotFound):
		response.Error(c, http.StatusNotFound, response.CodeNotFound, "resource not found", nil)
	case errors.Is(err, service.ErrConflict):
		response.Error(c, http.StatusConflict, response.CodeConflict, "resource already exists", nil)
	default:
		response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "internal server error", nil)
	}
}
