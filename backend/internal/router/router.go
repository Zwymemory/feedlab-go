package router

import (
	"log/slog"
	"time"

	"feedlab/backend/internal/config"
	"feedlab/backend/internal/controller"
	"feedlab/backend/internal/middleware"
	"feedlab/backend/internal/repository"
	"feedlab/backend/internal/service"
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
	authService := service.NewAuthService(userRepository, tokenManager)
	userService := service.NewUserService(userRepository)
	postService := service.NewPostService(postRepository, userRepository)
	authController := controller.NewAuthController(authService)
	userController := controller.NewUserController(userService)
	postController := controller.NewPostController(postService)
	authMiddleware := middleware.NewAuthMiddleware(tokenManager)

	engine.GET("/healthz", healthController.Health)

	api := engine.Group("/api/v1")
	auth := api.Group("/auth")
	auth.POST("/register", authController.Register)
	auth.POST("/login", authController.Login)

	users := api.Group("/users")
	users.Use(authMiddleware.RequireAuth())
	users.GET("/me", userController.Me)

	posts := api.Group("/posts")
	posts.GET("", postController.List)
	posts.GET("/:id", postController.Detail)
	posts.POST("", authMiddleware.RequireAuth(), postController.Create)
	posts.DELETE("/:id", authMiddleware.RequireAuth(), postController.Delete)

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
