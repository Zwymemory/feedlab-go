package controller

import (
	"net/http"

	"feedlab/backend/internal/response"
	"feedlab/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type HealthController struct {
	healthService *service.HealthService
}

func NewHealthController(healthService *service.HealthService) *HealthController {
	return &HealthController{healthService: healthService}
}

// Health godoc
// @Summary Health check
// @Description Check API, MySQL and Redis availability.
// @Tags health
// @Produce json
// @Success 200 {object} response.Body
// @Failure 500 {object} response.Body
// @Router /healthz [get]
func (h *HealthController) Health(c *gin.Context) {
	result, ok := h.healthService.Check(c.Request.Context())
	if !ok {
		response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "dependency unhealthy", result)
		return
	}
	response.Success(c, result)
}
