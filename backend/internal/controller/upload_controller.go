package controller

import (
	"net/http"

	"feedlab/backend/internal/response"
	"feedlab/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type UploadController struct {
	uploadService *service.UploadService
}

func NewUploadController(uploadService *service.UploadService) *UploadController {
	return &UploadController{uploadService: uploadService}
}

func (u *UploadController) UploadMedia(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "missing upload file", nil)
		return
	}

	result, err := u.uploadService.SaveMedia(file)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Created(c, result)
}
