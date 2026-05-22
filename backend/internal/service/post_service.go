package service

import (
	"context"
	"errors"
	"strings"

	"feedlab/backend/internal/dto"
	"feedlab/backend/internal/model"
	"feedlab/backend/internal/repository"
	"feedlab/backend/internal/vo"

	"gorm.io/gorm"
)

type PostService struct {
	posts *repository.PostRepository
	users *repository.UserRepository
}

func NewPostService(posts *repository.PostRepository, users *repository.UserRepository) *PostService {
	return &PostService{posts: posts, users: users}
}

func (s *PostService) Create(ctx context.Context, userID uint64, req dto.CreatePostRequest) (*vo.Post, error) {
	title := strings.TrimSpace(req.Title)
	content := strings.TrimSpace(req.Content)
	if title == "" || content == "" {
		return nil, ErrBadRequest
	}

	contentType := strings.TrimSpace(req.ContentType)
	if contentType == "" {
		contentType = "article"
	}
	status := strings.TrimSpace(req.Status)
	if status == "" {
		status = "published"
	}

	post := model.Post{
		UserID:      userID,
		Title:       title,
		Content:     content,
		CoverURL:    strings.TrimSpace(req.CoverURL),
		ContentType: contentType,
		Status:      status,
	}

	err := s.posts.Transaction(ctx, func(tx *gorm.DB) error {
		txPosts := s.posts.WithTx(tx)
		txUsers := s.users.WithTx(tx)

		if err := txPosts.Create(ctx, &post); err != nil {
			return err
		}
		if post.Status == "published" {
			return txUsers.IncrementPostCount(ctx, userID, 1)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	created, err := s.posts.FindByID(ctx, post.ID)
	if err != nil {
		return nil, err
	}
	result := vo.NewPost(*created)
	return &result, nil
}

func (s *PostService) List(ctx context.Context, query dto.ListPostsQuery) (*vo.PostList, error) {
	page := query.Page
	if page <= 0 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize <= 0 {
		pageSize = 10
	}

	posts, total, err := s.posts.ListPublished(ctx, page, pageSize)
	if err != nil {
		return nil, err
	}

	return &vo.PostList{
		Items:    vo.NewPosts(posts),
		Page:     page,
		PageSize: pageSize,
		Total:    total,
	}, nil
}

func (s *PostService) Detail(ctx context.Context, id uint64) (*vo.Post, error) {
	post, err := s.posts.FindPublishedByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	result := vo.NewPost(*post)
	return &result, nil
}

func (s *PostService) Delete(ctx context.Context, id uint64, currentUserID uint64, currentRole string) error {
	post, err := s.posts.FindByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if post.UserID != currentUserID && currentRole != "admin" {
		return ErrForbidden
	}

	return s.posts.Transaction(ctx, func(tx *gorm.DB) error {
		txPosts := s.posts.WithTx(tx)
		txUsers := s.users.WithTx(tx)

		if err := txPosts.SoftDelete(ctx, id); err != nil {
			return err
		}
		if post.Status == "published" {
			return txUsers.IncrementPostCount(ctx, post.UserID, -1)
		}
		return nil
	})
}
