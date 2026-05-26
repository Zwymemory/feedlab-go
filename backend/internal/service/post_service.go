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

type PostService struct {
	posts     *repository.PostRepository
	users     *repository.UserRepository
	postCache *cache.PostCache
	userCache *cache.UserCache
	hotPosts  *cache.HotPostCache
}

func NewPostService(posts *repository.PostRepository, users *repository.UserRepository, postCache *cache.PostCache, userCache *cache.UserCache, hotPosts *cache.HotPostCache) *PostService {
	return &PostService{posts: posts, users: users, postCache: postCache, userCache: userCache, hotPosts: hotPosts}
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
	if post.Status == "published" {
		_ = s.userCache.DeletePublicProfile(ctx, userID)
	}

	created, err := s.posts.FindByID(ctx, post.ID)
	if err != nil {
		return nil, err
	}
	result := vo.NewPost(*created)
	if created.Status == "published" {
		_ = s.refreshHotPost(ctx, *created)
		result.HotScore = created.HotScore
	}
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

func (s *PostService) Hot(ctx context.Context, query dto.ListHotPostsQuery) (*vo.PostList, error) {
	limit := query.Limit
	if limit <= 0 {
		limit = 10
	}

	posts, err := s.listHotFromRedis(ctx, limit)
	if err != nil {
		return nil, err
	}
	if len(posts) == 0 {
		posts, err = s.posts.ListHotPublished(ctx, limit)
		if err != nil {
			return nil, err
		}
		for i := range posts {
			_ = s.refreshHotPost(ctx, posts[i])
		}
	}

	return &vo.PostList{
		Items:    vo.NewPosts(posts),
		Page:     1,
		PageSize: limit,
		Total:    int64(len(posts)),
	}, nil
}

func (s *PostService) ListByUser(ctx context.Context, userID uint64, query dto.ListPostsQuery) (*vo.PostList, error) {
	if _, err := s.users.FindByID(ctx, userID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	page := query.Page
	if page <= 0 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize <= 0 {
		pageSize = 10
	}

	posts, total, err := s.posts.ListPublishedByUser(ctx, userID, page, pageSize)
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
	if cached, ok, err := s.postCache.Get(ctx, id); err == nil && ok {
		return cached, nil
	}

	post, err := s.posts.FindPublishedByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	result := vo.NewPost(*post)
	_ = s.postCache.Set(ctx, result)
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

	err = s.posts.Transaction(ctx, func(tx *gorm.DB) error {
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
	if err != nil {
		return err
	}
	_ = s.postCache.Delete(ctx, id)
	_ = s.hotPosts.Remove(ctx, id)
	if post.Status == "published" {
		_ = s.userCache.DeletePublicProfile(ctx, post.UserID)
	}
	return nil
}

func (s *PostService) RefreshHotScore(ctx context.Context, postID uint64) {
	refreshHotPostScore(ctx, s.posts, s.hotPosts, postID)
}

func (s *PostService) listHotFromRedis(ctx context.Context, limit int) ([]model.Post, error) {
	ranks, err := s.hotPosts.Top(ctx, limit)
	if err != nil || len(ranks) == 0 {
		return nil, err
	}

	ids := make([]uint64, 0, len(ranks))
	scoreByID := make(map[uint64]float64, len(ranks))
	for _, rank := range ranks {
		ids = append(ids, rank.PostID)
		scoreByID[rank.PostID] = rank.Score
	}

	found, err := s.posts.FindPublishedByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	postByID := make(map[uint64]model.Post, len(found))
	for _, post := range found {
		post.HotScore = scoreByID[post.ID]
		postByID[post.ID] = post
	}

	posts := make([]model.Post, 0, len(ids))
	for _, id := range ids {
		if post, ok := postByID[id]; ok {
			posts = append(posts, post)
			continue
		}
		_ = s.hotPosts.Remove(ctx, id)
	}
	return posts, nil
}

func (s *PostService) refreshHotPost(ctx context.Context, post model.Post) error {
	score := calculateHotScore(post)
	if err := s.posts.UpdateHotScore(ctx, post.ID, score); err != nil {
		return err
	}
	post.HotScore = score
	return s.hotPosts.SetScore(ctx, post.ID, score)
}
