package controller

import (
	"net/http"

	"feedlab/backend/internal/dto"
	"feedlab/backend/internal/middleware"
	"feedlab/backend/internal/response"
	"feedlab/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type CommentController struct {
	commentService *service.CommentService
}

func NewCommentController(commentService *service.CommentService) *CommentController {
	return &CommentController{commentService: commentService}
}

func (cc *CommentController) Create(c *gin.Context) {
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

	var req dto.CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid request body", nil)
		return
	}

	comment, err := cc.commentService.Create(c.Request.Context(), postID, userID, req)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Created(c, comment)
}

func (cc *CommentController) ListPostComments(c *gin.Context) {
	postID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}

	var query dto.ListCommentsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid query", nil)
		return
	}

	result, err := cc.commentService.ListPostComments(c.Request.Context(), postID, query)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}

func (cc *CommentController) ListReplies(c *gin.Context) {
	commentID, ok := parseIDParam(c, "id")
	if !ok {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
		return
	}

	var query dto.ListCommentsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid query", nil)
		return
	}

	result, err := cc.commentService.ListReplies(c.Request.Context(), commentID, query)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}

func (cc *CommentController) Delete(c *gin.Context) {
	commentID, ok := parseIDParam(c, "id")
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

	result, err := cc.commentService.Delete(c.Request.Context(), commentID, userID, role)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}
