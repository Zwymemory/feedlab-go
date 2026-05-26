package service

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"feedlab/backend/internal/cache"
	"feedlab/backend/internal/dto"
	"feedlab/backend/internal/model"
	"feedlab/backend/internal/repository"
	"feedlab/backend/internal/vo"

	"gorm.io/gorm"
)

type PostService struct {
	posts              *repository.PostRepository
	users              *repository.UserRepository
	postCache          *cache.PostCache
	userCache          *cache.UserCache
	hotPosts           *cache.HotPostCache
	postViews          *cache.PostViewCache
	viewFlushThreshold int64
}

func NewPostService(posts *repository.PostRepository, users *repository.UserRepository, postCache *cache.PostCache, userCache *cache.UserCache, hotPosts *cache.HotPostCache, postViews *cache.PostViewCache, viewFlushThreshold int64) *PostService {
	if viewFlushThreshold <= 0 {
		viewFlushThreshold = 100
	}
	return &PostService{posts: posts, users: users, postCache: postCache, userCache: userCache, hotPosts: hotPosts, postViews: postViews, viewFlushThreshold: viewFlushThreshold}
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

func (s *PostService) Feed(ctx context.Context, query dto.ListFeedPostsQuery) (*vo.FeedPostList, error) {
	limit := query.Limit
	if limit <= 0 {
		limit = 10
	}

	cursorTime, cursorID, err := decodeFeedCursor(query.Cursor)
	if err != nil {
		return nil, ErrBadRequest
	}

	posts, err := s.posts.ListFeedPublished(ctx, cursorTime, cursorID, limit+1)
	if err != nil {
		return nil, err
	}

	hasMore := len(posts) > limit
	if hasMore {
		posts = posts[:limit]
	}

	nextCursor := ""
	if hasMore && len(posts) > 0 {
		nextCursor = encodeFeedCursor(posts[len(posts)-1])
	}

	return &vo.FeedPostList{
		Items:      vo.NewPosts(posts),
		NextCursor: nextCursor,
		HasMore:    hasMore,
		Limit:      limit,
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
		result := *cached
		s.applyViewCount(ctx, &result)
		return &result, nil
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
	s.applyViewCount(ctx, &result)
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
	_ = s.postViews.Delete(ctx, id)
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

func (s *PostService) applyViewCount(ctx context.Context, post *vo.Post) {
	if post == nil || s.postViews == nil {
		return
	}

	delta, err := s.postViews.Increment(ctx, post.ID)
	if err != nil {
		return
	}
	post.ViewCount += delta

	if delta < s.viewFlushThreshold {
		return
	}
	flushed, err := s.postViews.Take(ctx, post.ID)
	if err != nil || flushed <= 0 {
		return
	}
	if err := s.posts.IncrementViewCount(ctx, post.ID, flushed); err != nil {
		return
	}
	_ = s.postCache.Delete(ctx, post.ID)
}

func encodeFeedCursor(post model.Post) string {
	raw := fmt.Sprintf("%d:%d", post.CreatedAt.UnixNano(), post.ID)
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

func decodeFeedCursor(cursor string) (*time.Time, uint64, error) {
	if strings.TrimSpace(cursor) == "" {
		return nil, 0, nil
	}

	body, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return nil, 0, err
	}

	parts := strings.SplitN(string(body), ":", 2)
	if len(parts) != 2 {
		return nil, 0, ErrBadRequest
	}

	createdAtNano, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil || createdAtNano <= 0 {
		return nil, 0, ErrBadRequest
	}
	postID, err := strconv.ParseUint(parts[1], 10, 64)
	if err != nil || postID == 0 {
		return nil, 0, ErrBadRequest
	}

	createdAt := time.Unix(0, createdAtNano)
	return &createdAt, postID, nil
}
