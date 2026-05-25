package router

import (
	"log/slog"
	"time"

	"feedlab/backend/internal/config"
	"feedlab/backend/internal/controller"
	"feedlab/backend/internal/middleware"
	"feedlab/backend/internal/repository"
	"feedlab/backend/internal/service"
	"feedlab/backend/internal/swagger"
	feedjwt "feedlab/backend/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type Dependencies struct {
	Config *config.Config
	Logger *slog.Logger
	MySQL  *gorm.DB
	Redis  *redis.Client
}

func New(deps Dependencies) *gin.Engine {
	gin.SetMode(deps.Config.Server.Mode)
	engine := gin.New()
	engine.Use(gin.Recovery())
	engine.Use(requestLogger(deps.Logger))

	healthService := service.NewHealthService(deps.MySQL, deps.Redis)
	healthController := controller.NewHealthController(healthService)

	tokenManager, err := feedjwt.NewManager(
		deps.Config.JWT.Secret,
		deps.Config.JWT.Issuer,
		time.Duration(deps.Config.JWT.ExpiresHours)*time.Hour,
	)
	if err != nil {
		panic(err)
	}

	userRepository := repository.NewUserRepository(deps.MySQL)
	postRepository := repository.NewPostRepository(deps.MySQL)
	postLikeRepository := repository.NewPostLikeRepository(deps.MySQL)
	postCollectRepository := repository.NewPostCollectRepository(deps.MySQL)
	userFollowRepository := repository.NewUserFollowRepository(deps.MySQL)
	commentRepository := repository.NewCommentRepository(deps.MySQL)
	authService := service.NewAuthService(userRepository, tokenManager)
	userService := service.NewUserService(userRepository)
	postService := service.NewPostService(postRepository, userRepository)
	likeService := service.NewLikeService(postLikeRepository, postRepository, userRepository)
	collectService := service.NewCollectService(postCollectRepository, postRepository, userRepository)
	followService := service.NewFollowService(userFollowRepository, userRepository)
	commentService := service.NewCommentService(commentRepository, postRepository)
	authController := controller.NewAuthController(authService)
	userController := controller.NewUserController(userService)
	postController := controller.NewPostController(postService)
	likeController := controller.NewLikeController(likeService)
	collectController := controller.NewCollectController(collectService)
	followController := controller.NewFollowController(followService)
	commentController := controller.NewCommentController(commentService)
	authMiddleware := middleware.NewAuthMiddleware(tokenManager)

	engine.GET("/healthz", healthController.Health)
	swagger.RegisterRoutes(engine)

	api := engine.Group("/api/v1")
	auth := api.Group("/auth")
	auth.POST("/register", authController.Register)
	auth.POST("/login", authController.Login)

	users := api.Group("/users")
	users.Use(authMiddleware.RequireAuth())
	users.GET("/me", userController.Me)

	api.GET("/users/:id/likes", likeController.ListUserLikes)
	api.GET("/users/:id/collects", collectController.ListUserCollects)
	api.GET("/users/:id/followers", followController.ListFollowers)
	api.GET("/users/:id/following", followController.ListFollowing)
	api.POST("/users/:id/follow", authMiddleware.RequireAuth(), followController.Follow)
	api.DELETE("/users/:id/follow", authMiddleware.RequireAuth(), followController.Unfollow)
	api.GET("/users/:id/followed", authMiddleware.RequireAuth(), followController.IsFollowed)

	posts := api.Group("/posts")
	posts.GET("", postController.List)
	posts.GET("/:id", postController.Detail)
	posts.POST("", authMiddleware.RequireAuth(), postController.Create)
	posts.DELETE("/:id", authMiddleware.RequireAuth(), postController.Delete)
	posts.POST("/:id/like", authMiddleware.RequireAuth(), likeController.LikePost)
	posts.DELETE("/:id/like", authMiddleware.RequireAuth(), likeController.UnlikePost)
	posts.GET("/:id/liked", authMiddleware.RequireAuth(), likeController.IsPostLiked)
	posts.POST("/:id/collect", authMiddleware.RequireAuth(), collectController.CollectPost)
	posts.DELETE("/:id/collect", authMiddleware.RequireAuth(), collectController.UncollectPost)
	posts.GET("/:id/collected", authMiddleware.RequireAuth(), collectController.IsPostCollected)
	posts.POST("/:id/comments", authMiddleware.RequireAuth(), commentController.Create)
	posts.GET("/:id/comments", commentController.ListPostComments)

	comments := api.Group("/comments")
	comments.GET("/:id/replies", commentController.ListReplies)
	comments.DELETE("/:id", authMiddleware.RequireAuth(), commentController.Delete)

	return engine
}

func requestLogger(log *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		log.Info("http request",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"latency_ms", time.Since(start).Milliseconds(),
			"ip", c.ClientIP(),
		)
	}
}
