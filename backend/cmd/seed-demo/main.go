package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"feedlab/backend/internal/cache"
	"feedlab/backend/internal/config"
	"feedlab/backend/internal/db"
	"feedlab/backend/internal/event"
	"feedlab/backend/internal/model"
	"feedlab/backend/pkg/password"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	gormlogger "gorm.io/gorm/logger"
)

const demoPassword = "secret123"

type demoUser struct {
	Username string
	Email    string
	Nickname string
	Bio      string
}

type demoPost struct {
	Title   string
	Content string
	Score   float64
}

func main() {
	ctx := context.Background()

	cfg, err := config.Load("")
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	mysql, err := db.NewMySQL(cfg.MySQL)
	if err != nil {
		log.Fatalf("connect mysql: %v", err)
	}
	mysql = mysql.Session(&gorm.Session{Logger: gormlogger.Default.LogMode(gormlogger.Silent)})
	if err := db.AutoMigrate(mysql); err != nil {
		log.Fatalf("auto migrate: %v", err)
	}

	redisClient, err := db.NewRedis(ctx, cfg.Redis)
	if err != nil {
		log.Fatalf("connect redis: %v", err)
	}
	defer redisClient.Close()

	if err := seed(ctx, mysql, cache.NewHotPostCache(redisClient)); err != nil {
		log.Fatalf("seed demo data: %v", err)
	}

	fmt.Fprintln(os.Stdout, "FeedLab demo data is ready.")
	fmt.Fprintln(os.Stdout, "Demo accounts:")
	fmt.Fprintln(os.Stdout, "  alice@example.com / secret123")
	fmt.Fprintln(os.Stdout, "  mer@example.com / secret123")
	fmt.Fprintln(os.Stdout, "  v4demo@example.com / secret123")
}

func seed(ctx context.Context, mysql *gorm.DB, hotPosts *cache.HotPostCache) error {
	hash, err := password.Hash(demoPassword)
	if err != nil {
		return err
	}

	users, err := seedUsers(ctx, mysql, hash)
	if err != nil {
		return err
	}

	alice := users["alice"]
	mer := users["mer"]
	v4demo := users["v4demo"]

	posts, err := seedPosts(ctx, mysql, alice.ID)
	if err != nil {
		return err
	}
	if err := seedHotRank(ctx, hotPosts, posts); err != nil {
		return err
	}

	if err := mysql.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := seedFollows(tx, mer.ID, v4demo.ID, alice.ID); err != nil {
			return err
		}
		if err := seedPostInteractions(tx, posts, mer.ID, v4demo.ID); err != nil {
			return err
		}
		if err := seedComments(tx, posts, mer.ID, v4demo.ID); err != nil {
			return err
		}
		if err := seedNotifications(tx, posts, alice.ID, mer.ID, v4demo.ID); err != nil {
			return err
		}
		return refreshCounts(tx, []uint64{alice.ID, mer.ID, v4demo.ID}, posts)
	}); err != nil {
		return err
	}

	return nil
}

func seedUsers(ctx context.Context, mysql *gorm.DB, hash string) (map[string]model.User, error) {
	definitions := map[string]demoUser{
		"alice": {
			Username: "alice",
			Email:    "alice@example.com",
			Nickname: "Alice",
			Bio:      "FeedLab demo author. Owns the showcase feed and receives async notifications.",
		},
		"mer": {
			Username: "mer",
			Email:    "mer@example.com",
			Nickname: "Mer_src",
			Bio:      "FeedLab demo interaction account for likes, comments and follows.",
		},
		"v4demo": {
			Username: "v4demo",
			Email:    "v4demo@example.com",
			Nickname: "V4 Demo",
			Bio:      "Notification demo pilot for RabbitMQ showcase flows.",
		},
	}

	users := make(map[string]model.User, len(definitions))
	for key, definition := range definitions {
		user, err := upsertUser(ctx, mysql, definition, hash)
		if err != nil {
			return nil, err
		}
		users[key] = user
	}
	return users, nil
}

func upsertUser(ctx context.Context, mysql *gorm.DB, definition demoUser, hash string) (model.User, error) {
	var user model.User
	err := mysql.WithContext(ctx).Where("email = ?", definition.Email).First(&user).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return user, err
	}

	updates := model.User{
		Username:     definition.Username,
		Email:        definition.Email,
		PasswordHash: hash,
		Nickname:     definition.Nickname,
		Bio:          definition.Bio,
		Role:         "user",
		Status:       "active",
	}

	if errors.Is(err, gorm.ErrRecordNotFound) {
		if err := mysql.WithContext(ctx).Create(&updates).Error; err != nil {
			return user, err
		}
		return updates, nil
	}

	if err := mysql.WithContext(ctx).Model(&user).Updates(map[string]any{
		"username":      definition.Username,
		"password_hash": hash,
		"nickname":      definition.Nickname,
		"bio":           definition.Bio,
		"role":          "user",
		"status":        "active",
	}).Error; err != nil {
		return user, err
	}
	if err := mysql.WithContext(ctx).Where("id = ?", user.ID).First(&user).Error; err != nil {
		return user, err
	}
	return user, nil
}

func seedPosts(ctx context.Context, mysql *gorm.DB, aliceID uint64) ([]model.Post, error) {
	definitions := []demoPost{
		{
			Title:   "FeedLab V5 展示页上线",
			Content: "这是 Alice 发布的展示帖：前端已经接入 React Router、GSAP 动效、Feed 流和通知中心。",
			Score:   1000,
		},
		{
			Title:   "Redis 热门榜与游标 Feed 演示",
			Content: "这条内容用于展示 V3 的 Redis ZSet 热门榜、cursor 分页和浏览量计数。",
			Score:   940,
		},
		{
			Title:   "RabbitMQ 异步通知链路",
			Content: "点赞、评论、关注会生成站内通知，V4 用 RabbitMQ 解耦主流程和通知落库。",
			Score:   900,
		},
		{
			Title:   "Controller-Service-Repository 分层复盘",
			Content: "FeedLab 后端遵循 CSR 分层：Controller 处理 HTTP，Service 编排业务，Repository 封装 GORM。",
			Score:   820,
		},
	}

	posts := make([]model.Post, 0, len(definitions))
	now := time.Now()
	for index, definition := range definitions {
		var post model.Post
		err := mysql.WithContext(ctx).
			Where("user_id = ? AND title = ?", aliceID, definition.Title).
			First(&post).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}

		values := map[string]any{
			"user_id":      aliceID,
			"title":        definition.Title,
			"content":      definition.Content,
			"content_type": "article",
			"status":       "published",
			"hot_score":    definition.Score,
			"created_at":   now.Add(-time.Duration(index) * time.Hour),
			"updated_at":   now.Add(-time.Duration(index) * time.Hour),
		}

		if errors.Is(err, gorm.ErrRecordNotFound) {
			post = model.Post{
				UserID:      aliceID,
				Title:       definition.Title,
				Content:     definition.Content,
				ContentType: "article",
				Status:      "published",
				HotScore:    definition.Score,
				CreatedAt:   now.Add(-time.Duration(index) * time.Hour),
				UpdatedAt:   now.Add(-time.Duration(index) * time.Hour),
			}
			if err := mysql.WithContext(ctx).Create(&post).Error; err != nil {
				return nil, err
			}
		} else if err := mysql.WithContext(ctx).Model(&post).Updates(values).Error; err != nil {
			return nil, err
		}

		if err := mysql.WithContext(ctx).Where("id = ?", post.ID).First(&post).Error; err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}
	return posts, nil
}

func seedHotRank(ctx context.Context, hotPosts *cache.HotPostCache, posts []model.Post) error {
	for _, post := range posts {
		if err := hotPosts.SetScore(ctx, post.ID, post.HotScore); err != nil {
			return err
		}
	}
	return nil
}

func seedFollows(tx *gorm.DB, merID uint64, v4demoID uint64, aliceID uint64) error {
	follows := []model.UserFollow{
		{FollowerID: merID, FolloweeID: aliceID},
		{FollowerID: v4demoID, FolloweeID: aliceID},
		{FollowerID: aliceID, FolloweeID: merID},
	}
	for _, follow := range follows {
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&follow).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedPostInteractions(tx *gorm.DB, posts []model.Post, merID uint64, v4demoID uint64) error {
	for index, post := range posts {
		likes := []model.PostLike{{PostID: post.ID, UserID: merID}}
		if index < 3 {
			likes = append(likes, model.PostLike{PostID: post.ID, UserID: v4demoID})
		}
		for _, like := range likes {
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&like).Error; err != nil {
				return err
			}
		}

		if index < 3 {
			collect := model.PostCollect{PostID: post.ID, UserID: merID}
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&collect).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

func seedComments(tx *gorm.DB, posts []model.Post, merID uint64, v4demoID uint64) error {
	if len(posts) == 0 {
		return nil
	}

	for index, post := range posts {
		root, err := upsertComment(tx, post.ID, merID, 0, 0, fmt.Sprintf("Mer_src 评论：这条演示内容很好地展示了模块 %d。", index+1))
		if err != nil {
			return err
		}
		if _, err := upsertComment(tx, post.ID, v4demoID, root.ID, merID, "V4 Demo 回复：这条回复用于展示二级评论。"); err != nil {
			return err
		}
		like := model.CommentLike{CommentID: root.ID, UserID: v4demoID}
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&like).Error; err != nil {
			return err
		}
	}
	return nil
}

func upsertComment(tx *gorm.DB, postID uint64, userID uint64, parentID uint64, replyToUserID uint64, content string) (model.Comment, error) {
	var comment model.Comment
	err := tx.Where("post_id = ? AND user_id = ? AND parent_id = ? AND content = ?", postID, userID, parentID, content).
		First(&comment).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return comment, err
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		comment = model.Comment{
			PostID:        postID,
			UserID:        userID,
			ParentID:      parentID,
			ReplyToUserID: replyToUserID,
			Content:       content,
			Status:        "published",
		}
		if err := tx.Create(&comment).Error; err != nil {
			return comment, err
		}
		return comment, nil
	}
	if err := tx.Model(&comment).Updates(map[string]any{
		"reply_to_user_id": replyToUserID,
		"status":           "published",
	}).Error; err != nil {
		return comment, err
	}
	return comment, nil
}

func seedNotifications(tx *gorm.DB, posts []model.Post, aliceID uint64, merID uint64, v4demoID uint64) error {
	if len(posts) == 0 {
		return nil
	}

	events := []event.NotificationEvent{
		postNotification(event.NotificationTypePostLike, "seed:post_like", posts[0], aliceID, merID),
		postNotification(event.NotificationTypePostCollect, "seed:post_collect", posts[1], aliceID, merID),
		followNotification("seed:follow:alice:mer", aliceID, merID),
		followNotification("seed:follow:alice:v4demo", aliceID, v4demoID),
	}

	var comment model.Comment
	if err := tx.Where("post_id = ? AND user_id = ? AND parent_id = 0", posts[0].ID, merID).First(&comment).Error; err == nil {
		events = append(events, commentNotification(event.NotificationTypeComment, "seed:comment", comment, aliceID, merID))
	}

	for _, evt := range events {
		notification := model.Notification{
			UserID:      evt.RecipientID,
			ActorID:     evt.ActorID,
			Type:        evt.Type,
			SubjectType: evt.SubjectType,
			SubjectID:   evt.SubjectID,
			PostID:      evt.PostID,
			CommentID:   evt.CommentID,
			Content:     evt.Content,
			IsRead:      false,
			MessageID:   evt.MessageID,
		}
		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "message_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"user_id", "actor_id", "type", "subject_type", "subject_id", "post_id", "comment_id", "content", "is_read", "updated_at"}),
		}).Create(&notification).Error; err != nil {
			return err
		}
	}
	return nil
}

func postNotification(kind string, prefix string, post model.Post, recipientID uint64, actorID uint64) event.NotificationEvent {
	return event.NotificationEvent{
		MessageID:   fmt.Sprintf("%s:%d:%d", prefix, post.ID, actorID),
		Type:        kind,
		RecipientID: recipientID,
		ActorID:     actorID,
		SubjectType: "post",
		SubjectID:   post.ID,
		PostID:      post.ID,
		Content:     post.Title,
	}
}

func followNotification(messageID string, recipientID uint64, actorID uint64) event.NotificationEvent {
	return event.NotificationEvent{
		MessageID:   messageID,
		Type:        event.NotificationTypeFollow,
		RecipientID: recipientID,
		ActorID:     actorID,
		SubjectType: "user",
		SubjectID:   actorID,
		Content:     "started following you",
	}
}

func commentNotification(kind string, prefix string, comment model.Comment, recipientID uint64, actorID uint64) event.NotificationEvent {
	return event.NotificationEvent{
		MessageID:   fmt.Sprintf("%s:%d:%d", prefix, comment.ID, actorID),
		Type:        kind,
		RecipientID: recipientID,
		ActorID:     actorID,
		SubjectType: "comment",
		SubjectID:   comment.ID,
		PostID:      comment.PostID,
		CommentID:   comment.ID,
		Content:     comment.Content,
	}
}

func refreshCounts(tx *gorm.DB, userIDs []uint64, posts []model.Post) error {
	for _, post := range posts {
		var likeCount int64
		if err := tx.Model(&model.PostLike{}).Where("post_id = ?", post.ID).Count(&likeCount).Error; err != nil {
			return err
		}
		var collectCount int64
		if err := tx.Model(&model.PostCollect{}).Where("post_id = ?", post.ID).Count(&collectCount).Error; err != nil {
			return err
		}
		var commentCount int64
		if err := tx.Model(&model.Comment{}).Where("post_id = ?", post.ID).Count(&commentCount).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.Post{}).Where("id = ?", post.ID).Updates(map[string]any{
			"like_count":    likeCount,
			"collect_count": collectCount,
			"comment_count": commentCount,
		}).Error; err != nil {
			return err
		}
	}

	for _, userID := range userIDs {
		var postCount int64
		if err := tx.Model(&model.Post{}).Where("user_id = ? AND status = ?", userID, "published").Count(&postCount).Error; err != nil {
			return err
		}
		var followerCount int64
		if err := tx.Model(&model.UserFollow{}).Where("followee_id = ?", userID).Count(&followerCount).Error; err != nil {
			return err
		}
		var followingCount int64
		if err := tx.Model(&model.UserFollow{}).Where("follower_id = ?", userID).Count(&followingCount).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.User{}).Where("id = ?", userID).Updates(map[string]any{
			"post_count":      postCount,
			"follower_count":  followerCount,
			"following_count": followingCount,
		}).Error; err != nil {
			return err
		}
	}
	return nil
}
