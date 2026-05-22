package middleware

import (
	"net/http"
	"strings"

	"feedlab/backend/internal/response"
	feedjwt "feedlab/backend/pkg/jwt"

	"github.com/gin-gonic/gin"
)

const (
	contextUserID = "user_id"
	contextRole   = "role"
)

type AuthMiddleware struct {
	tokens *feedjwt.Manager
}

func NewAuthMiddleware(tokens *feedjwt.Manager) *AuthMiddleware {
	return &AuthMiddleware{tokens: tokens}
}

func (m *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "missing authorization header", nil)
			c.Abort()
			return
		}

		parts := strings.Fields(header)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid authorization header", nil)
			c.Abort()
			return
		}

		claims, err := m.tokens.Parse(parts[1])
		if err != nil {
			response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid token", nil)
			c.Abort()
			return
		}

		c.Set(contextUserID, claims.UserID)
		c.Set(contextRole, claims.Role)
		c.Next()
	}
}

func CurrentUserID(c *gin.Context) (uint64, bool) {
	value, exists := c.Get(contextUserID)
	if !exists {
		return 0, false
	}
	userID, ok := value.(uint64)
	return userID, ok
}

func CurrentRole(c *gin.Context) (string, bool) {
	value, exists := c.Get(contextRole)
	if !exists {
		return "", false
	}
	role, ok := value.(string)
	return role, ok
}
