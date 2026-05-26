package service

import (
	"context"
	"errors"
	"strings"

	"feedlab/backend/internal/cache"
	"feedlab/backend/internal/dto"
	"feedlab/backend/internal/model"
	"feedlab/backend/internal/repository"
	"feedlab/backend/internal/vo"

	"gorm.io/gorm"
)

type CommentService struct {
	comments  *repository.CommentRepository
	posts     *repository.PostRepository
	postCache *cache.PostCache
}

func NewCommentService(comments *repository.CommentRepository, posts *repository.PostRepository, postCache *cache.PostCache) *CommentService {
	return &CommentService{comments: comments, posts: posts, postCache: postCache}
}

func (s *CommentService) Create(ctx context.Context, postID uint64, userID uint64, req dto.CreateCommentRequest) (*vo.Comment, error) {
	content := strings.TrimSpace(req.Content)
	if content == "" {
		return nil, ErrBadRequest
	}

	if _, err := s.posts.FindPublishedByID(ctx, postID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	comment := model.Comment{
		PostID:   postID,
		UserID:   userID,
		ParentID: req.ParentID,
		Content:  content,
		Status:   "published",
	}
	if req.ParentID > 0 {
		parent, err := s.comments.FindByID(ctx, req.ParentID)
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		if err != nil {
			return nil, err
		}
		if parent.PostID != postID || parent.ParentID != 0 || parent.Status != "published" {
			return nil, ErrBadRequest
		}
		comment.ReplyToUserID = parent.UserID
	}

	err := s.comments.Transaction(ctx, func(tx *gorm.DB) error {
		txComments := s.comments.WithTx(tx)
		txPosts := s.posts.WithTx(tx)
		if err := txComments.Create(ctx, &comment); err != nil {
			return err
		}
		return txPosts.IncrementCommentCount(ctx, postID, 1)
	})
	if err != nil {
		return nil, err
	}
	_ = s.postCache.Delete(ctx, postID)

	created, err := s.comments.FindByID(ctx, comment.ID)
	if err != nil {
		return nil, err
	}
	result := vo.NewComment(*created)
	return &result, nil
}

func (s *CommentService) ListPostComments(ctx context.Context, postID uint64, query dto.ListCommentsQuery) (*vo.CommentList, error) {
	if _, err := s.posts.FindPublishedByID(ctx, postID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	page, pageSize := commentPagination(query)
	comments, total, err := s.comments.ListPostComments(ctx, postID, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &vo.CommentList{
		Items:    vo.NewComments(comments),
		Page:     page,
		PageSize: pageSize,
		Total:    total,
	}, nil
}

func (s *CommentService) ListReplies(ctx context.Context, parentID uint64, query dto.ListCommentsQuery) (*vo.CommentList, error) {
	parent, err := s.comments.FindByID(ctx, parentID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if parent.ParentID != 0 || parent.Status != "published" {
		return nil, ErrBadRequest
	}
	if _, err := s.posts.FindPublishedByID(ctx, parent.PostID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	page, pageSize := commentPagination(query)
	comments, total, err := s.comments.ListReplies(ctx, parentID, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &vo.CommentList{
		Items:    vo.NewComments(comments),
		Page:     page,
		PageSize: pageSize,
		Total:    total,
	}, nil
}

func (s *CommentService) Delete(ctx context.Context, commentID uint64, currentUserID uint64, currentRole string) (*vo.DeleteCommentResult, error) {
	comment, err := s.comments.FindByID(ctx, commentID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if comment.UserID != currentUserID && currentRole != "admin" {
		return nil, ErrForbidden
	}

	var deletedCount int64
	err = s.comments.Transaction(ctx, func(tx *gorm.DB) error {
		txComments := s.comments.WithTx(tx)
		txPosts := s.posts.WithTx(tx)
		count, err := txComments.SoftDeleteCascade(ctx, commentID)
		if err != nil {
			return err
		}
		deletedCount = count
		return txPosts.IncrementCommentCount(ctx, comment.PostID, -count)
	})
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	_ = s.postCache.Delete(ctx, comment.PostID)
	return &vo.DeleteCommentResult{Deleted: true, DeletedCount: deletedCount}, nil
}

func commentPagination(query dto.ListCommentsQuery) (int, int) {
	page := query.Page
	if page <= 0 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize <= 0 {
		pageSize = 10
	}
	return page, pageSize
}
