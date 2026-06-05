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

	"github.com/redis/go-redis/v9"
)

const demoPassword = "secret123"

type demoUser struct {
	Username string
	Email    string
	Nickname string
	Bio      string
}

type demoPost struct {
	AuthorKey string
	Title     string
	Content   string
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

	if err := seed(ctx, mysql, redisClient, cache.NewHotPostCache(redisClient)); err != nil {
		log.Fatalf("seed demo data: %v", err)
	}

	fmt.Fprintln(os.Stdout, "FeedLab demo data is ready.")
	fmt.Fprintln(os.Stdout, "Demo accounts:")
	fmt.Fprintln(os.Stdout, "  alice@example.com / secret123")
	fmt.Fprintln(os.Stdout, "  mer@example.com / secret123")
	fmt.Fprintln(os.Stdout, "  v4demo@example.com / secret123")
}

func seed(ctx context.Context, mysql *gorm.DB, redisClient *redis.Client, hotPosts *cache.HotPostCache) error {
	if os.Getenv("FEEDLAB_SEED_RESET") == "1" {
		if err := resetShowcaseData(ctx, mysql, redisClient); err != nil {
			return err
		}
	}

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

	posts, err := seedPosts(ctx, mysql, users)
	if err != nil {
		return err
	}

	if err := mysql.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := seedFollows(tx, mer.ID, v4demo.ID, alice.ID); err != nil {
			return err
		}
		if err := seedPostInteractions(tx, posts, mer.ID, v4demo.ID); err != nil {
			return err
		}
		if err := seedComments(tx, posts, alice.ID, mer.ID, v4demo.ID); err != nil {
			return err
		}
		if err := seedNotifications(tx, posts, alice.ID, mer.ID, v4demo.ID); err != nil {
			return err
		}
		return refreshCounts(tx, []uint64{alice.ID, mer.ID, v4demo.ID}, posts)
	}); err != nil {
		return err
	}

	posts, err = reloadPosts(ctx, mysql, posts)
	if err != nil {
		return err
	}
	if err := seedHotRank(ctx, hotPosts, posts); err != nil {
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
			Bio:      "热爱动画、技术和内容社区的 FeedLab 展示账号。",
		},
		"mer": {
			Username: "mer",
			Email:    "mer@example.com",
			Nickname: "Mer_src",
			Bio:      "Go 后端学习中，喜欢把项目拆成可以讲清楚的小模块。",
		},
		"v4demo": {
			Username: "v4demo",
			Email:    "v4demo@example.com",
			Nickname: "V4 Demo",
			Bio:      "负责制造点赞、评论、关注等互动通知的演示账号。",
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

func resetShowcaseData(ctx context.Context, mysql *gorm.DB, redisClient *redis.Client) error {
	if err := mysql.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, stmt := range []string{
			"DELETE FROM notifications",
			"DELETE FROM comment_likes",
			"DELETE FROM comments",
			"DELETE FROM post_likes",
			"DELETE FROM post_collects",
			"DELETE FROM post_media",
			"DELETE FROM posts",
			"DELETE FROM user_follows",
		} {
			if err := tx.Exec(stmt).Error; err != nil {
				return err
			}
		}
		return tx.Model(&model.User{}).Where("id > 0").Updates(map[string]any{
			"post_count":      0,
			"follower_count":  0,
			"following_count": 0,
		}).Error
	}); err != nil {
		return err
	}
	return clearRedisPatterns(ctx, redisClient, []string{
		cache.RankHotPostsKey,
		cache.PostDetailKeyPrefix + ":*",
		cache.PostDetailNullKeyPrefix + ":*",
		cache.UserProfileKeyPrefix + ":*",
		cache.UserProfileNullKeyPrefix + ":*",
		cache.PostCommentsKeyPrefix + ":*",
		cache.CommentRepliesKeyPrefix + ":*",
		cache.PostViewCountKeyPrefix + ":*",
	})
}

func clearRedisPatterns(ctx context.Context, redisClient *redis.Client, patterns []string) error {
	if redisClient == nil {
		return nil
	}
	for _, pattern := range patterns {
		if pattern == cache.RankHotPostsKey {
			if err := redisClient.Del(ctx, pattern).Err(); err != nil {
				return err
			}
			continue
		}
		var cursor uint64
		for {
			keys, nextCursor, err := redisClient.Scan(ctx, cursor, pattern, 100).Result()
			if err != nil {
				return err
			}
			if len(keys) > 0 {
				if err := redisClient.Del(ctx, keys...).Err(); err != nil {
					return err
				}
			}
			if nextCursor == 0 {
				break
			}
			cursor = nextCursor
		}
	}
	return nil
}

func seedPosts(ctx context.Context, mysql *gorm.DB, users map[string]model.User) ([]model.Post, error) {
	definitions := []demoPost{
		{
			AuthorKey: "alice",
			Title:     "春夏番追更清单：这部新番为什么适合周末补？",
			Content:   "最近想把追番体验做成一个轻松的讨论串：剧情节奏稳定、角色关系清楚、作画细节也在线。比起单纯打分，我更喜欢看大家怎么描述自己被哪一幕打动。",
		},
		{
			AuthorKey: "mer",
			Title:     "B 站学习区刷到的 Go 后端路线，我按项目拆成了五步",
			Content:   "从注册登录、帖子发布，到点赞评论、Redis 缓存、RabbitMQ 通知，最重要的不是堆技术名词，而是能讲清楚每个模块解决了什么问题。",
		},
		{
			AuthorKey: "alice",
			Title:     "周末开发日志：给 FeedLab 补了图片和视频帖子",
			Content:   "这次把本地上传、媒体元数据表、Feed 卡片预览和详情页播放器串起来了。以后如果迁移到 OSS/S3，数据库仍然只需要保存 URL 和文件信息。",
		},
		{
			AuthorKey: "v4demo",
			Title:     "动画分镜里的节奏感，和前端动效其实有点像",
			Content:   "一个镜头什么时候切、一个按钮什么时候动，本质上都在照顾用户的注意力。FeedLab 的 GSAP 动效也是这个思路：点到为止，不抢内容本身的戏。",
		},
		{
			AuthorKey: "alice",
			Title:     "从缓存命中想到追番：Redis 热门榜是怎么工作的",
			Content:   "热门 Feed 不需要每次都让 MySQL 重新排序。FeedLab 用 Redis ZSet 保存帖子热度分，读取时直接按分数取前几名；互动变化后再刷新对应帖子的分数。",
		},
	}

	posts := make([]model.Post, 0, len(definitions))
	now := time.Now()
	for index, definition := range definitions {
		author, ok := users[definition.AuthorKey]
		if !ok {
			return nil, fmt.Errorf("missing demo author: %s", definition.AuthorKey)
		}
		var post model.Post
		err := mysql.WithContext(ctx).
			Where("user_id = ? AND title = ?", author.ID, definition.Title).
			First(&post).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}

		values := map[string]any{
			"user_id":      author.ID,
			"title":        definition.Title,
			"content":      definition.Content,
			"content_type": "article",
			"status":       "published",
			"created_at":   now.Add(-time.Duration(index) * time.Hour),
			"updated_at":   now.Add(-time.Duration(index) * time.Hour),
		}

		if errors.Is(err, gorm.ErrRecordNotFound) {
			post = model.Post{
				UserID:      author.ID,
				Title:       definition.Title,
				Content:     definition.Content,
				ContentType: "article",
				Status:      "published",
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
		{FollowerID: aliceID, FolloweeID: v4demoID},
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
		likes := []uint64{merID}
		if index == 0 || index == 1 || index == 2 {
			likes = append(likes, v4demoID)
		}
		for _, userID := range likes {
			like := model.PostLike{PostID: post.ID, UserID: userID}
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&like).Error; err != nil {
				return err
			}
		}

		if index == 0 || index == 2 || index == 4 {
			collect := model.PostCollect{PostID: post.ID, UserID: merID}
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&collect).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

func seedComments(tx *gorm.DB, posts []model.Post, aliceID uint64, merID uint64, v4demoID uint64) error {
	if len(posts) == 0 {
		return nil
	}

	commentPlans := [][]string{
		{
			"Mer_src 评论：这种讨论串很适合做社区首页，内容轻松，也能自然展示评论和回复功能。",
			"V4 Demo 回复：而且标题不夸张，给 HR 看也不会显得像测试数据。",
		},
		{
			"Alice 评论：这条路线对实习准备很实用，关键是能把每个模块背后的取舍讲清楚。",
			"V4 Demo 回复：比如幂等、事务、缓存一致性，都是面试官很可能继续追问的点。",
		},
		{
			"Mer_src 评论：媒体帖子这个模块很加分，说明项目不只是 CRUD，还考虑了文件上传和展示体验。",
			"V4 Demo 回复：后续迁移对象存储时，只要替换上传服务，帖子结构不用大改。",
		},
		{
			"Alice 评论：动效如果服务内容本身，就会很舒服；如果为了炫技而炫技，反而容易抢注意力。",
			"Mer_src 回复：同意，展示项目时最重要的是让别人快速理解你做了什么。",
		},
		{
			"V4 Demo 评论：这个类比挺好懂，Redis 像把热门内容先放在手边，减少每次都去数据库翻找。",
			"Mer_src 回复：而且热度分公式可以现场解释：点赞、收藏、评论分别贡献不同权重。",
		},
	}

	for index, post := range posts {
		if index >= len(commentPlans) {
			break
		}
		rootAuthorID := merID
		replyAuthorID := v4demoID
		if index == 1 || index == 3 {
			rootAuthorID = aliceID
			replyAuthorID = merID
		}
		if index == 1 {
			replyAuthorID = v4demoID
		}
		if index == 4 {
			rootAuthorID = v4demoID
			replyAuthorID = merID
		}

		root, err := upsertComment(tx, post.ID, rootAuthorID, 0, 0, commentPlans[index][0])
		if err != nil {
			return err
		}
		if _, err := upsertComment(tx, post.ID, replyAuthorID, root.ID, rootAuthorID, commentPlans[index][1]); err != nil {
			return err
		}
		likeUserID := v4demoID
		if rootAuthorID == v4demoID {
			likeUserID = merID
		}
		like := model.CommentLike{CommentID: root.ID, UserID: likeUserID}
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
		postNotification(event.NotificationTypePostLike, "seed:post_like", posts[0], posts[0].UserID, merID),
		postNotification(event.NotificationTypePostCollect, "seed:post_collect", posts[2], posts[2].UserID, merID),
		postNotification(event.NotificationTypePostLike, "seed:post_like", posts[3], posts[3].UserID, aliceID),
		followNotification("seed:follow:alice:mer", aliceID, merID),
		followNotification("seed:follow:alice:v4demo", aliceID, v4demoID),
	}

	var comment model.Comment
	if err := tx.Where("post_id = ? AND parent_id = 0", posts[0].ID).First(&comment).Error; err == nil {
		events = append(events, commentNotification(event.NotificationTypeComment, "seed:comment", comment, posts[0].UserID, comment.UserID))
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
		Content:     "关注了你，后续可以在用户主页看到粉丝和关注列表。",
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
			"hot_score":     float64(likeCount*3 + collectCount*5 + commentCount*4),
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

func reloadPosts(ctx context.Context, mysql *gorm.DB, posts []model.Post) ([]model.Post, error) {
	ids := make([]uint64, 0, len(posts))
	for _, post := range posts {
		ids = append(ids, post.ID)
	}
	reloaded := make([]model.Post, 0, len(posts))
	for _, id := range ids {
		var post model.Post
		if err := mysql.WithContext(ctx).Where("id = ?", id).First(&post).Error; err != nil {
			return nil, err
		}
		reloaded = append(reloaded, post)
	}
	return reloaded, nil
}
