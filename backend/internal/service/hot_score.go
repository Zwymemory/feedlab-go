package service

import (
	"context"

	"feedlab/backend/internal/cache"
	"feedlab/backend/internal/model"
	"feedlab/backend/internal/repository"
)

func refreshHotPostScore(ctx context.Context, posts *repository.PostRepository, hotPosts *cache.HotPostCache, postID uint64) {
	post, err := posts.FindPublishedByID(ctx, postID)
	if err != nil {
		_ = hotPosts.Remove(ctx, postID)
		return
	}
	score := calculateHotScore(*post)
	_ = posts.UpdateHotScore(ctx, post.ID, score)
	_ = hotPosts.SetScore(ctx, post.ID, score)
}

func calculateHotScore(post model.Post) float64 {
	return float64(post.LikeCount*3 + post.CollectCount*5 + post.CommentCount*4)
}
