package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

const (
	CodeSuccess         = 0
	CodeBadRequest      = 40000
	CodeInvalidToken    = 40001
	CodeForbidden       = 40002
	CodeNotFound        = 40400
	CodeConflict        = 40900
	CodeTooManyRequests = 42900
	CodeInternalError   = 50000
)

type Body struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

func Success(c *gin.Context, data any) {
	c.JSON(http.StatusOK, Body{
		Code:    CodeSuccess,
		Message: "success",
		Data:    data,
	})
}

func Created(c *gin.Context, data any) {
	c.JSON(http.StatusCreated, Body{
		Code:    CodeSuccess,
		Message: "success",
		Data:    data,
	})
}

func Error(c *gin.Context, httpStatus int, code int, message string, data any) {
	c.JSON(httpStatus, Body{
		Code:    code,
		Message: message,
		Data:    data,
	})
}
