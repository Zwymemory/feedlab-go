# FeedLab Go V1 代码层逐段详解

这份文档专门补上一件事：不再只讲“流程”，而是带你读具体代码。你可以一边打开 GoLand，一边按本文顺序跳到对应文件，把每个结构体、函数、关键语句看懂。

建议先记住一条主线：

```text
路由找到 Controller
Controller 解析 HTTP 参数
Service 执行业务规则
Repository 操作数据库
Model 映射数据库表
VO 组装返回给前端的数据
response 统一包装 JSON
```

## 读代码前先理解几个 Go 写法

### `package`

每个 `.go` 文件第一行都是 `package xxx`。

例如：

```go
package controller
```

这表示这个文件属于 `controller` 包。同一个包里的文件可以互相调用未导出的函数，比如 `post_controller.go` 可以直接使用 `auth_controller.go` 里的 `writeServiceError`，因为它们都在 `controller` 包。

### `import`

`import` 表示这个文件要用哪些外部能力。

例如 `auth_controller.go` 引入：

```go
"feedlab/backend/internal/dto"
"feedlab/backend/internal/response"
"feedlab/backend/internal/service"
"github.com/gin-gonic/gin"
```

这说明 Controller 会用：

- `dto` 接收请求参数。
- `service` 调用业务逻辑。
- `response` 返回统一 JSON。
- `gin` 处理 HTTP 请求上下文。

### `type xxx struct`

`struct` 是 Go 的结构体，可以理解成一组字段。

例如：

```go
type AuthController struct {
    authService *service.AuthService
}
```

这表示 `AuthController` 需要依赖一个 `AuthService`。这里用指针 `*service.AuthService`，因为 Service 是一个对象，不需要每次复制一份。

### 构造函数

项目里有很多 `NewXxx`：

```go
func NewAuthController(authService *service.AuthService) *AuthController {
    return &AuthController{authService: authService}
}
```

这不是 Go 语言强制要求的构造函数，而是项目约定。它的作用是把依赖传进去，创建一个对象。

你可以这样理解：

```text
router.go 创建 AuthService
router.go 再把 AuthService 交给 NewAuthController
AuthController 保存这个 Service
以后请求来了，AuthController 就能调用 Service
```

### 方法接收者

例如：

```go
func (a *AuthController) Register(c *gin.Context) {
}
```

`(a *AuthController)` 表示这是 `AuthController` 的方法。方法里面可以用 `a.authService`。

如果没有这个接收者，它只是普通函数。

### `context.Context`

你会经常看到：

```go
c.Request.Context()
```

它把 HTTP 请求的上下文传到 Service 和 Repository。好处是：如果客户端断开、请求超时，数据库操作也有机会被取消。

### `error` 一路向上返回

Go 项目很常见的写法：

```go
result, err := someFunc()
if err != nil {
    return nil, err
}
```

FeedLab 的错误流动是：

```text
Repository 返回数据库错误
Service 转换成业务错误
Controller 转换成 HTTP 状态码和统一响应码
```

这比在每一层都随便返回字符串更清楚。

## `cmd/api/main.go`：程序怎么启动

文件：[`backend/cmd/api/main.go`](../backend/cmd/api/main.go)

这个文件是整个 API 的入口。你执行：

```bash
go run ./cmd/api
```

最终就是从这里的 `main()` 开始。

### 读取配置

```go
cfg, err := config.Load("")
if err != nil {
    slog.Error("load config failed", "error", err)
    os.Exit(1)
}
```

解释：

- `config.Load("")` 表示读取默认配置文件。
- 默认文件是 `config.yaml`。
- 如果读取失败，程序直接退出。

为什么启动失败要退出：

```text
没有配置就不知道端口、数据库、Redis、JWT 密钥，服务继续运行没有意义。
```

### 初始化日志

```go
log := logger.New(cfg.Log)
ctx := context.Background()
```

解释：

- `logger.New(cfg.Log)` 根据配置创建日志器。
- `context.Background()` 是一个根 Context，启动时连接 Redis 会用到。

### 连接 MySQL

```go
mysqlDB, err := db.NewMySQL(cfg.MySQL)
if err != nil {
    log.Error("connect mysql failed", "error", err)
    os.Exit(1)
}
```

解释：

- `db.NewMySQL` 内部会用 GORM 连接 MySQL。
- 如果账号、密码、端口、数据库名不对，这里会失败。

为什么 MySQL 连不上要退出：

```text
注册、登录、帖子都依赖 MySQL。数据库不可用时 API 即使启动，也无法完成核心业务。
```

### 自动迁移表结构

```go
if err := db.AutoMigrate(mysqlDB); err != nil {
    log.Error("auto migrate mysql failed", "error", err)
    os.Exit(1)
}
```

解释：

- `AutoMigrate` 会根据 `model.User`、`model.Post` 创建或更新表。
- V1 用它是为了开发方便。

### 连接 Redis

```go
redisClient, err := db.NewRedis(ctx, cfg.Redis)
if err != nil {
    log.Error("connect redis failed", "error", err)
    os.Exit(1)
}
defer redisClient.Close()
```

解释：

- Redis 当前只用于连接检查和 `/healthz`。
- `defer redisClient.Close()` 表示 `main()` 退出前关闭 Redis 连接。

### 组装路由

```go
engine := router.New(router.Dependencies{
    Config: cfg,
    Logger: log,
    MySQL:  mysqlDB,
    Redis:  redisClient,
})
```

这是一个非常关键的点。

`main.go` 不直接创建 Controller、Service、Repository，而是把基础依赖交给 `router.New`。后者负责组装业务对象。

可以理解成：

```text
main.go 负责准备原材料
router.go 负责把原材料组装成完整 API
```

### 启动 HTTP 服务

```go
go func() {
    if err := engine.Run(cfg.Server.Addr); err != nil {
        log.Error("api server stopped", "error", err)
    }
}()
```

解释：

- `engine.Run` 会阻塞当前线程。
- 这里用 `go func()` 开一个 goroutine，让主线程还能继续监听退出信号。

### 监听退出信号

```go
stop := make(chan os.Signal, 1)
signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
<-stop
```

解释：

- `SIGINT` 通常来自 Ctrl+C。
- `SIGTERM` 通常来自系统或容器停止。
- `<-stop` 会阻塞，直到收到退出信号。

## `internal/router/router.go`：依赖注入和路由注册

文件：[`backend/internal/router/router.go`](../backend/internal/router/router.go)

这个文件是项目里最能体现“分层如何接起来”的地方。

### Dependencies 是什么

```go
type Dependencies struct {
    Config *config.Config
    Logger *slog.Logger
    MySQL  *gorm.DB
    Redis  *redis.Client
}
```

它把 `main.go` 准备好的基础设施打包起来。

这里的四个字段分别是：

- `Config`：配置。
- `Logger`：日志器。
- `MySQL`：GORM 数据库连接。
- `Redis`：Redis 客户端。

### 创建 Gin Engine

```go
gin.SetMode(deps.Config.Server.Mode)
engine := gin.New()
engine.Use(gin.Recovery())
engine.Use(requestLogger(deps.Logger))
```

解释：

- `gin.SetMode` 设置 `debug`、`release` 等模式。
- `gin.New()` 创建一个空 Gin 引擎。
- `gin.Recovery()` 用来恢复 panic，避免某个请求导致整个服务崩溃。
- `requestLogger` 是自定义请求日志中间件。

### 组装健康检查

```go
healthService := service.NewHealthService(deps.MySQL, deps.Redis)
healthController := controller.NewHealthController(healthService)
```

这两行说明：

```text
HealthController 依赖 HealthService
HealthService 依赖 MySQL 和 Redis
```

健康检查要检查数据库和缓存，所以 Service 层直接拿到底层连接。

### 创建 JWT 管理器

```go
tokenManager, err := feedjwt.NewManager(
    deps.Config.JWT.Secret,
    deps.Config.JWT.Issuer,
    time.Duration(deps.Config.JWT.ExpiresHours)*time.Hour,
)
```

解释：

- `Secret` 用于签名。
- `Issuer` 是签发者，用于校验 Token 是不是自己系统签的。
- `ExpiresHours` 控制 Token 有效期。

为什么 JWT Manager 放在 `pkg/jwt`：

```text
JWT 签发和解析不是某个 Controller 独有的逻辑，登录和中间件都会用，所以抽成通用包。
```

### 组装 Repository、Service、Controller

```go
userRepository := repository.NewUserRepository(deps.MySQL)
postRepository := repository.NewPostRepository(deps.MySQL)
authService := service.NewAuthService(userRepository, tokenManager)
userService := service.NewUserService(userRepository)
postService := service.NewPostService(postRepository, userRepository)
authController := controller.NewAuthController(authService)
userController := controller.NewUserController(userService)
postController := controller.NewPostController(postService)
authMiddleware := middleware.NewAuthMiddleware(tokenManager)
```

逐行解释：

- `UserRepository` 和 `PostRepository` 都依赖 MySQL。
- `AuthService` 需要查用户，也需要生成 Token，所以依赖 `userRepository` 和 `tokenManager`。
- `UserService` 只查用户，所以依赖 `userRepository`。
- `PostService` 要操作帖子，也要更新用户发帖数，所以依赖 `postRepository` 和 `userRepository`。
- Controller 只依赖自己的 Service。
- AuthMiddleware 只需要解析 Token，所以依赖 `tokenManager`。

这就是依赖注入。

它的好处是：每个对象都只拿自己需要的东西，不使用全局变量。

### 注册路由

```go
engine.GET("/healthz", healthController.Health)
swagger.RegisterRoutes(engine)
```

这两个是 API 版本外的公共路由。

```go
api := engine.Group("/api/v1")
auth := api.Group("/auth")
auth.POST("/register", authController.Register)
auth.POST("/login", authController.Login)
```

注册和登录不需要 Token，所以没有挂 JWT 中间件。

```go
users := api.Group("/users")
users.Use(authMiddleware.RequireAuth())
users.GET("/me", userController.Me)
```

这里整个 `/users` 组都要求登录。

```go
posts := api.Group("/posts")
posts.GET("", postController.List)
posts.GET("/:id", postController.Detail)
posts.POST("", authMiddleware.RequireAuth(), postController.Create)
posts.DELETE("/:id", authMiddleware.RequireAuth(), postController.Delete)
```

帖子列表和详情公开，所以不需要登录。

发布和删除帖子需要知道当前用户是谁，所以必须经过 JWT 中间件。

## `internal/controller/auth_controller.go`：注册登录 Controller

文件：[`backend/internal/controller/auth_controller.go`](../backend/internal/controller/auth_controller.go)

Controller 的代码要按“收参数、调业务、写响应”三步看。

### AuthController 结构体

```go
type AuthController struct {
    authService *service.AuthService
}
```

这说明 AuthController 不自己处理注册登录业务，而是把业务交给 AuthService。

### Register 方法

```go
var req dto.RegisterRequest
if err := c.ShouldBindJSON(&req); err != nil {
    response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid request body", nil)
    return
}
```

这段做两件事：

1. 从 HTTP Body 里读取 JSON。
2. 按 `dto.RegisterRequest` 的 `binding` tag 做校验。

如果请求体是：

```json
{
  "username": "ab",
  "email": "not-email",
  "password": "123"
}
```

就会失败，因为：

- username 最少 3 位。
- email 必须是邮箱。
- password 最少 6 位。

然后：

```go
user, err := a.authService.Register(c.Request.Context(), req)
if err != nil {
    writeServiceError(c, err)
    return
}
```

这表示 Controller 不判断邮箱是否重复，也不加密密码。这些都交给 Service。

最后：

```go
response.Created(c, user)
```

返回 HTTP 201 和统一 JSON。

### Login 方法

```go
var req dto.LoginRequest
if err := c.ShouldBindJSON(&req); err != nil {
    response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid request body", nil)
    return
}
```

登录也先解析 JSON。

```go
result, err := a.authService.Login(c.Request.Context(), req)
```

真正的密码校验和 JWT 生成发生在 `AuthService.Login`。

```go
response.Success(c, result)
```

登录成功返回 HTTP 200。

### writeServiceError

```go
switch {
case errors.Is(err, service.ErrBadRequest):
    response.Error(c, http.StatusBadRequest, response.CodeBadRequest, err.Error(), nil)
case errors.Is(err, service.ErrUnauthorized):
    response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid email or password", nil)
...
}
```

这个函数把 Service 错误翻译成 HTTP 响应。

为什么不在 Service 里直接返回 HTTP 状态码：

```text
Service 不应该知道 HTTP。以后这个业务可能被 CLI、定时任务、消息消费者调用，它们没有 HTTP 状态码。
```

## `internal/controller/post_controller.go`：帖子 Controller

文件：[`backend/internal/controller/post_controller.go`](../backend/internal/controller/post_controller.go)

### Create 方法

```go
userID, ok := middleware.CurrentUserID(c)
if !ok {
    response.Error(c, http.StatusUnauthorized, response.CodeInvalidToken, "invalid token", nil)
    return
}
```

发布帖子必须知道作者是谁。这个 `userID` 来自 JWT 中间件。

注意：Controller 没有自己解析 Token，只是从上下文取结果。

```go
var req dto.CreatePostRequest
if err := c.ShouldBindJSON(&req); err != nil {
    response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid request body", nil)
    return
}
```

这里解析发帖请求体，并执行 DTO 上的校验：

- `title` 必填，最长 120。
- `content` 必填。
- `content_type` 只能是 `article`、`image`、`video`。
- `status` 只能是 `draft`、`published`。

```go
post, err := p.postService.Create(c.Request.Context(), userID, req)
```

Controller 把当前用户 ID 和请求 DTO 交给 Service。是否开启事务、是否增加 `post_count` 都由 Service 决定。

### List 方法

```go
var query dto.ListPostsQuery
if err := c.ShouldBindQuery(&query); err != nil {
    response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid query", nil)
    return
}
```

这里从 URL query 解析：

```text
?page=1&page_size=10
```

和 JSON 不同，query 参数用 `ShouldBindQuery`，对应 DTO 里的 `form` tag。

### Detail 方法

```go
id, ok := parseIDParam(c, "id")
if !ok {
    response.Error(c, http.StatusBadRequest, response.CodeBadRequest, "invalid id", nil)
    return
}
```

`/api/v1/posts/:id` 里的 `id` 是字符串。Controller 要先把它转成数字。

为什么这一步放 Controller：

```text
路径参数是 HTTP 概念，属于 Controller 负责的范围。
```

### Delete 方法

```go
id, ok := parseIDParam(c, "id")
```

先解析帖子 ID。

```go
userID, ok := middleware.CurrentUserID(c)
```

再取当前用户 ID。

```go
role, _ := middleware.CurrentRole(c)
```

取角色。删除帖子时，作者可以删，admin 也可以删。

```go
if err := p.postService.Delete(c.Request.Context(), id, userID, role); err != nil {
    writeServiceError(c, err)
    return
}
```

真正的权限判断在 Service。

这很重要：Controller 只把“当前用户是谁、角色是什么、要删哪个帖子”传进去，不自己判断业务规则。

### parseIDParam

```go
func parseIDParam(c *gin.Context, name string) (uint64, bool) {
    id, err := strconv.ParseUint(c.Param(name), 10, 64)
    return id, err == nil && id > 0
}
```

解释：

- `c.Param(name)` 取 URL path 参数。
- `strconv.ParseUint(..., 10, 64)` 按十进制转成无符号整数。
- `id > 0` 是为了拒绝 0。

## `internal/dto`：请求结构和校验规则

文件：

- [`backend/internal/dto/auth.go`](../backend/internal/dto/auth.go)
- [`backend/internal/dto/post.go`](../backend/internal/dto/post.go)

### 注册请求

```go
type RegisterRequest struct {
    Username string `json:"username" binding:"required,min=3,max=50"`
    Email    string `json:"email" binding:"required,email,max=100"`
    Password string `json:"password" binding:"required,min=6,max=72"`
    Nickname string `json:"nickname" binding:"omitempty,max=50"`
}
```

左边是 Go 字段名，右边 tag 有两部分：

```go
json:"username"
```

表示 JSON 字段叫 `username`。

```go
binding:"required,min=3,max=50"
```

表示 Gin 参数校验规则。

为什么 DTO 和 Model 分开：

```text
注册请求里有 password，但数据库 Model 里保存的是 password_hash。
请求结构和数据库结构不是同一个东西。
```

### 帖子列表 Query

```go
type ListPostsQuery struct {
    Page     int `form:"page" binding:"omitempty,min=1"`
    PageSize int `form:"page_size" binding:"omitempty,min=1,max=50"`
}
```

这里用 `form`，因为参数来自 URL query。

```text
GET /api/v1/posts?page=1&page_size=10
```

`max=50` 是为了保护接口，不让用户一次拉太多数据。

## `internal/service/auth_service.go`：注册登录业务

文件：[`backend/internal/service/auth_service.go`](../backend/internal/service/auth_service.go)

### AuthService 结构体

```go
type AuthService struct {
    users  *repository.UserRepository
    tokens *feedjwt.Manager
}
```

AuthService 需要两个能力：

- 查用户、创建用户：`UserRepository`
- 生成 JWT：`jwt.Manager`

### Register：清洗输入

```go
username := strings.TrimSpace(req.Username)
email := strings.ToLower(strings.TrimSpace(req.Email))
nickname := strings.TrimSpace(req.Nickname)
if nickname == "" {
    nickname = username
}
```

解释：

- `TrimSpace` 去掉前后空格。
- email 统一转小写，避免 `A@x.com` 和 `a@x.com` 被当成两个邮箱。
- nickname 为空时默认用 username。

### Register：检查唯一性

```go
exists, err := s.users.ExistsByUsername(ctx, username)
if err != nil {
    return nil, err
}
if exists {
    return nil, ErrConflict
}
```

Service 负责业务判断：用户名不能重复。

Repository 只负责告诉 Service “存在或不存在”。

邮箱同理：

```go
exists, err = s.users.ExistsByEmail(ctx, email)
```

### Register：密码哈希

```go
hash, err := password.Hash(req.Password)
if err != nil {
    return nil, err
}
```

这里不会保存明文密码。

`password.Hash` 内部使用 bcrypt。bcrypt 的结果不能反解，只能校验“某个明文和这个哈希是否匹配”。

### Register：创建 Model

```go
user := model.User{
    Username:     username,
    Email:        email,
    PasswordHash: hash,
    Nickname:     nickname,
    Role:         "user",
    Status:       "active",
}
```

这里把请求 DTO 转成数据库 Model。

注意：

- DTO 里的 `Password` 变成 Model 里的 `PasswordHash`。
- Role 和 Status 是后端控制，不让用户从请求里传。

### Register：写入数据库

```go
if err := s.users.Create(ctx, &user); err != nil {
    return nil, err
}
```

Service 不写 GORM 代码，而是调用 Repository。

### Register：转 VO

```go
result := vo.NewUser(user)
return &result, nil
```

为什么不直接返回 `model.User`：

```text
model.User 里有 PasswordHash，不应该暴露给前端。
```

### Login：查用户

```go
user, err := s.users.FindByEmail(ctx, email)
if errors.Is(err, repository.ErrNotFound) {
    return nil, ErrUnauthorized
}
```

如果邮箱不存在，返回 `ErrUnauthorized`，而不是告诉前端“邮箱不存在”。

这样更安全，避免攻击者枚举哪些邮箱注册过。

### Login：校验密码

```go
if !password.Compare(user.PasswordHash, req.Password) {
    return nil, ErrUnauthorized
}
```

这里是 bcrypt 比较。

不是解密，因为 bcrypt 不可逆。

### Login：检查用户状态

```go
if user.Status != "active" {
    return nil, ErrForbidden
}
```

后续如果用户被封禁，可以把 status 改成 `blocked`，登录就会失败。

### Login：签发 Token

```go
token, expiresAt, err := s.tokens.Generate(user.ID, user.Role)
```

Token 里放：

- 用户 ID。
- 用户角色。
- 签发时间。
- 过期时间。
- issuer。

### Login：返回登录结果

```go
return &vo.LoginResult{
    AccessToken: token,
    TokenType:   "Bearer",
    ExpiresIn:   int64(time.Until(expiresAt).Seconds()),
    User:        vo.NewUser(*user),
}, nil
```

这就是前端或 Swagger UI 看到的登录响应。

## `internal/service/post_service.go`：帖子业务和事务

文件：[`backend/internal/service/post_service.go`](../backend/internal/service/post_service.go)

这个文件是 V1 最重要的业务文件之一。

### PostService 结构体

```go
type PostService struct {
    posts *repository.PostRepository
    users *repository.UserRepository
}
```

帖子业务为什么还需要 `UserRepository`？

因为发布和删除帖子时要维护 `users.post_count`。

### Create：清洗和默认值

```go
title := strings.TrimSpace(req.Title)
content := strings.TrimSpace(req.Content)
if title == "" || content == "" {
    return nil, ErrBadRequest
}
```

DTO 已经做了基础校验，但 Service 再清理一次空格，防止 `"   "` 这种内容通过。

```go
contentType := strings.TrimSpace(req.ContentType)
if contentType == "" {
    contentType = "article"
}
status := strings.TrimSpace(req.Status)
if status == "" {
    status = "published"
}
```

业务默认值在 Service 里处理。

为什么默认值不放 Controller：

```text
默认值是业务规则，不是 HTTP 规则。
```

### Create：构造 Post Model

```go
post := model.Post{
    UserID:      userID,
    Title:       title,
    Content:     content,
    CoverURL:    strings.TrimSpace(req.CoverURL),
    ContentType: contentType,
    Status:      status,
}
```

这里把 DTO 转成数据库 Model。

`userID` 不是请求体传来的，而是 JWT 中间件解析出来的。这样用户不能冒充别人发帖。

### Create：事务

```go
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
```

这段要仔细看。

`s.posts.Transaction` 开启一个数据库事务。里面所有数据库操作要么一起成功，要么一起失败。

为什么创建 `txPosts` 和 `txUsers`：

```go
txPosts := s.posts.WithTx(tx)
txUsers := s.users.WithTx(tx)
```

因为事务对象是 `tx *gorm.DB`。如果继续使用原来的 Repository，它们里面保存的是普通 `db`，不是事务 `tx`。

所以要用同一个 `tx` 创建事务版 Repository，确保：

```text
创建帖子
更新用户 post_count
```

在同一个事务里。

如果创建帖子成功，但更新用户发帖数失败，事务会回滚，帖子也不会留下。

### Create：为什么创建后再查一次

```go
created, err := s.posts.FindByID(ctx, post.ID)
```

创建时 `post` 只有帖子字段，没有预加载作者信息。响应 VO 需要 `author`，所以创建后再查一次，并 `Preload("User")`。

### List：分页默认值

```go
page := query.Page
if page <= 0 {
    page = 1
}
pageSize := query.PageSize
if pageSize <= 0 {
    pageSize = 10
}
```

这表示用户不传分页参数时默认：

```text
page=1&page_size=10
```

### Detail：把 Repository 错误转成 Service 错误

```go
post, err := s.posts.FindPublishedByID(ctx, id)
if errors.Is(err, repository.ErrNotFound) {
    return nil, ErrNotFound
}
```

Repository 层的 `ErrNotFound` 转成 Service 层的 `ErrNotFound`。

这样 Controller 不需要知道 Repository 的错误。

### Delete：权限判断

```go
post, err := s.posts.FindByID(ctx, id)
```

先查帖子，因为要知道作者是谁。

```go
if post.UserID != currentUserID && currentRole != "admin" {
    return ErrForbidden
}
```

这句是权限核心：

- 当前用户是作者，可以删除。
- 当前用户不是作者，但角色是 admin，也可以删除。
- 其他情况禁止。

### Delete：删除事务

```go
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
```

删除帖子和减少用户发帖数也是两个表操作，所以需要事务。

为什么只在 `published` 时扣减：

```text
只有 published 帖子在创建时增加过 post_count，draft 没加过，所以删除 draft 不应该扣。
```

## `internal/repository`：GORM 数据访问

Repository 是唯一应该直接使用 GORM 的业务层文件。

### UserRepository

文件：[`backend/internal/repository/user_repository.go`](../backend/internal/repository/user_repository.go)

#### 保存 GORM DB

```go
type UserRepository struct {
    db *gorm.DB
}
```

Repository 保存一个数据库连接对象。

#### Create

```go
func (r *UserRepository) Create(ctx context.Context, user *model.User) error {
    return r.db.WithContext(ctx).Create(user).Error
}
```

解释：

- `WithContext(ctx)` 把请求上下文传给数据库操作。
- `Create(user)` 插入一行。
- `.Error` 取出 GORM 错误。

#### FindByEmail

```go
err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
```

这里的 `?` 是参数占位符，GORM 会安全绑定参数，避免自己拼 SQL 字符串。

```go
if errors.Is(err, gorm.ErrRecordNotFound) {
    return nil, ErrNotFound
}
```

把 GORM 的“没找到”转成项目自己的 `ErrNotFound`。

#### ExistsByUsername

```go
err := r.db.WithContext(ctx).Model(&model.User{}).Where("username = ?", username).Count(&count).Error
return count > 0, err
```

这里不是查整行用户，只统计数量。

因为注册只关心“是否存在”，不用加载所有字段。

#### IncrementPostCount

```go
UpdateColumn("post_count", gorm.Expr("CASE WHEN post_count + ? < 0 THEN 0 ELSE post_count + ? END", delta, delta))
```

这是一段 SQL 表达式，作用是：

```text
如果 post_count + delta 小于 0，就设为 0
否则设为 post_count + delta
```

这样可以避免重复删除或异常数据导致发帖数变成负数。

### PostRepository

文件：[`backend/internal/repository/post_repository.go`](../backend/internal/repository/post_repository.go)

#### Transaction

```go
func (r *PostRepository) Transaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
    return r.db.WithContext(ctx).Transaction(fn)
}
```

GORM 的 `Transaction` 会：

- 开始事务。
- 执行传入的函数。
- 如果函数返回 error，回滚。
- 如果函数返回 nil，提交。

#### FindByID

```go
err := r.db.WithContext(ctx).Preload("User").First(&post, id).Error
```

`First(&post, id)` 相当于按主键查询。

`Preload("User")` 会额外查询作者信息，并填充到 `post.User`。

为什么需要它：

```text
vo.NewPost 需要 post.User.ID、post.User.Username、post.User.Nickname。
如果不 Preload，author 字段会是空值。
```

#### FindPublishedByID

```go
Where("status = ?", "published").First(&post, id)
```

公开详情只允许查看已发布帖子。

草稿即使存在，也不应该被公开详情接口返回。

#### ListPublished

```go
query := r.db.WithContext(ctx).Model(&model.Post{}).Where("status = ?", "published")
```

先构造一个基础查询：只查 published。

```go
if err := query.Count(&total).Error; err != nil {
    return nil, 0, err
}
```

先查总数，用于分页响应里的 `total`。

```go
offset := (page - 1) * pageSize
```

分页偏移量：

```text
page=1 offset=0
page=2 offset=10
page=3 offset=20
```

```go
Order("created_at DESC").
Order("id DESC").
Limit(pageSize).
Offset(offset).
Find(&posts)
```

解释：

- 先按创建时间倒序。
- 创建时间相同时再按 ID 倒序，保证排序稳定。
- `Limit` 限制条数。
- `Offset` 跳过前面的数据。

#### SoftDelete

```go
result := r.db.WithContext(ctx).Delete(&model.Post{}, id)
```

因为 `model.Post` 里有：

```go
DeletedAt gorm.DeletedAt
```

所以 GORM 这里不是物理删除，而是更新 `deleted_at`。

```go
if result.RowsAffected == 0 {
    return ErrNotFound
}
```

如果没有任何行被影响，说明帖子不存在或已被普通查询过滤掉。

## `internal/model`：数据库表映射

### User Model

文件：[`backend/internal/model/user.go`](../backend/internal/model/user.go)

```go
ID uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
```

`gorm` tag 告诉 GORM 这是主键并自增。

```go
Username string `gorm:"size:50;not null;uniqueIndex:idx_users_username" json:"username"`
```

含义：

- 数据库字段长度 50。
- 不能为空。
- 建唯一索引。
- JSON 字段名是 `username`。

```go
PasswordHash string `gorm:"size:255;not null" json:"-"`
```

`json:"-"` 表示这个字段不会被 JSON 序列化。

这是密码哈希不返回给前端的最后一道保险。但项目还是用 VO 再隔离一层。

```go
DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
```

GORM 软删除字段。

普通查询默认只查：

```sql
deleted_at IS NULL
```

### Post Model

文件：[`backend/internal/model/post.go`](../backend/internal/model/post.go)

```go
UserID uint64 `gorm:"not null;index" json:"user_id"`
```

帖子必须有作者，所以 `not null`。经常按作者查帖子，所以加索引。

```go
Status string `gorm:"size:20;not null;default:'published';index" json:"status"`
```

公开列表和详情会按 `status = published` 查，所以给 status 加索引。

```go
User User `gorm:"foreignKey:UserID" json:"-"`
```

这不是数据库里的普通字段，而是 GORM 关联关系。

它告诉 GORM：

```text
Post.UserID 对应 User.ID
```

配合 `Preload("User")` 就能加载作者。

## `internal/vo`：响应结构

### 为什么需要 VO

Model 是数据库结构，不应该原样返回给前端。

VO 是 View Object，专门表示“接口返回给外部的数据”。

### User VO

文件：[`backend/internal/vo/user.go`](../backend/internal/vo/user.go)

`vo.User` 没有 `PasswordHash`。

```go
func NewUser(user model.User) User {
    return User{
        ID:       user.ID,
        Username: user.Username,
        ...
    }
}
```

这个函数负责从数据库 Model 转成响应 VO。

### LoginResult

```go
type LoginResult struct {
    AccessToken string `json:"access_token"`
    TokenType   string `json:"token_type"`
    ExpiresIn   int64  `json:"expires_in"`
    User        User   `json:"user"`
}
```

登录接口返回的不只是用户，还要返回 Token 信息。

### Post VO

文件：[`backend/internal/vo/post.go`](../backend/internal/vo/post.go)

```go
type Author struct {
    ID        uint64 `json:"id"`
    Username  string `json:"username"`
    Nickname  string `json:"nickname"`
    AvatarURL string `json:"avatar_url"`
}
```

帖子响应里不需要返回作者完整信息，只返回基础展示字段。

```go
Author: Author{
    ID:        post.User.ID,
    Username:  post.User.Username,
    Nickname:  post.User.Nickname,
    AvatarURL: post.User.AvatarURL,
},
```

这里依赖 Repository 的 `Preload("User")`。如果没预加载，`post.User` 就是零值。

## `internal/middleware/auth.go`：JWT 中间件

文件：[`backend/internal/middleware/auth.go`](../backend/internal/middleware/auth.go)

### context key

```go
const (
    contextUserID = "user_id"
    contextRole   = "role"
)
```

这是写入 Gin 上下文的 key。

### RequireAuth

```go
header := c.GetHeader("Authorization")
if header == "" {
    response.Error(...)
    c.Abort()
    return
}
```

如果没有 Authorization Header，直接终止请求。

```go
parts := strings.Fields(header)
if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
    response.Error(...)
    c.Abort()
    return
}
```

要求格式是：

```text
Authorization: Bearer <token>
```

`strings.Fields` 可以按空格切分，并自动处理多余空格。

```go
claims, err := m.tokens.Parse(parts[1])
```

调用 JWT Manager 解析 token。

```go
c.Set(contextUserID, claims.UserID)
c.Set(contextRole, claims.Role)
c.Next()
```

解析成功后，把用户信息存进 Gin 上下文，然后放行到后面的 Controller。

### CurrentUserID

```go
value, exists := c.Get(contextUserID)
```

从 Gin 上下文取中间件放进去的 `user_id`。

```go
userID, ok := value.(uint64)
```

类型断言：确认它真的是 `uint64`。

## `pkg/jwt/manager.go`：JWT 的签发和解析

文件：[`backend/pkg/jwt/manager.go`](../backend/pkg/jwt/manager.go)

### Claims

```go
type Claims struct {
    UserID    uint64 `json:"user_id"`
    Role      string `json:"role"`
    Issuer    string `json:"iss"`
    Subject   string `json:"sub"`
    ExpiresAt int64  `json:"exp"`
    IssuedAt  int64  `json:"iat"`
}
```

Claims 是 Token 的 payload。

这里既有业务字段：

- `user_id`
- `role`

也有 JWT 常见字段：

- `iss`：签发者。
- `sub`：主题，这里用用户 ID 字符串。
- `exp`：过期时间。
- `iat`：签发时间。

### Generate

```go
header := map[string]string{
    "alg": "HS256",
    "typ": "JWT",
}
```

Header 声明算法和类型。

```go
headerPart := base64.RawURLEncoding.EncodeToString(headerJSON)
claimsPart := base64.RawURLEncoding.EncodeToString(claimsJSON)
unsigned := headerPart + "." + claimsPart
signature := m.sign(unsigned)
```

JWT 的三段：

```text
base64url(header).base64url(payload).signature
```

签名只对前两段签：

```text
header.payload
```

### Parse

```go
parts := strings.Split(token, ".")
if len(parts) != 3 {
    return nil, ErrInvalidToken
}
```

JWT 必须是三段。

```go
expected := m.sign(unsigned)
if !hmac.Equal([]byte(expected), []byte(parts[2])) {
    return nil, ErrInvalidToken
}
```

重新计算签名，并和 Token 第三段比较。

这里用 `hmac.Equal`，而不是普通字符串比较，是为了避免时间侧信道问题。

```go
if claims.Issuer != m.issuer {
    return nil, ErrInvalidToken
}
if claims.ExpiresAt <= time.Now().Unix() {
    return nil, ErrExpiredToken
}
if claims.UserID == 0 {
    return nil, ErrInvalidToken
}
```

解析后还要验证：

- 是不是自己系统签发的。
- 是否过期。
- 用户 ID 是否有效。

## `pkg/password/password.go`：bcrypt

文件：[`backend/pkg/password/password.go`](../backend/pkg/password/password.go)

```go
func Hash(raw string) (string, error) {
    hash, err := bcrypt.GenerateFromPassword([]byte(raw), bcrypt.DefaultCost)
    ...
}
```

注册时使用它，把明文密码变成哈希。

```go
func Compare(hash string, raw string) bool {
    return bcrypt.CompareHashAndPassword([]byte(hash), []byte(raw)) == nil
}
```

登录时使用它。

重点：bcrypt 不是加密，是哈希。

```text
加密：可以解密回来。
哈希：不能反解，只能比较。
```

## `internal/response/response.go`：统一响应

文件：[`backend/internal/response/response.go`](../backend/internal/response/response.go)

```go
type Body struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Data    any    `json:"data"`
}
```

所有接口都包成这个结构。

```go
func Success(c *gin.Context, data any) {
    c.JSON(http.StatusOK, Body{
        Code:    CodeSuccess,
        Message: "success",
        Data:    data,
    })
}
```

Controller 不直接写：

```go
c.JSON(...)
```

而是统一调用 `response.Success`、`response.Created`、`response.Error`。

这样后续要修改响应格式，只需要改一个地方。

## `internal/db`：连接数据库和迁移表

### mysql.go

文件：[`backend/internal/db/mysql.go`](../backend/internal/db/mysql.go)

```go
gormDB, err := gorm.Open(mysql.Open(cfg.DSN()), &gorm.Config{})
```

使用 GORM 打开 MySQL。

```go
sqlDB, err := gormDB.DB()
```

拿到底层 `database/sql` 的连接池对象。

```go
sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
sqlDB.SetConnMaxLifetime(time.Hour)
```

设置连接池。

```go
if err := sqlDB.Ping(); err != nil {
    return nil, fmt.Errorf("ping mysql: %w", err)
}
```

确认数据库真的可用。

### redis.go

文件：[`backend/internal/db/redis.go`](../backend/internal/db/redis.go)

```go
client := redis.NewClient(&redis.Options{
    Addr:     cfg.Addr,
    Password: cfg.Password,
    DB:       cfg.DB,
})
```

创建 Redis 客户端。

```go
if err := client.Ping(ctx).Err(); err != nil {
    return nil, fmt.Errorf("ping redis: %w", err)
}
```

启动时就检查 Redis 是否可用。

### migrate.go

文件：[`backend/internal/db/migrate.go`](../backend/internal/db/migrate.go)

```go
mysql.AutoMigrate(&model.User{}, &model.Post{})
```

GORM 根据 Model 自动创建或调整表。

V1 这样做适合学习和快速开发。更严格的生产项目会用版本化 migration。

## `internal/swagger/swagger.go`：接口文档代码

文件：[`backend/internal/swagger/swagger.go`](../backend/internal/swagger/swagger.go)

这个文件有两部分：

1. 注册 Swagger 路由。
2. 手写 OpenAPI JSON 和 Swagger UI HTML。

### 注册路由

```go
engine.GET("/swagger", redirectToIndex)
engine.GET("/swagger/", index)
engine.GET("/swagger/index.html", index)
engine.GET("/swagger/doc.json", doc)
```

`/swagger/index.html` 返回页面。

`/swagger/doc.json` 返回 OpenAPI JSON。

### securitySchemes

```go
"BearerAuth": gin.H{
    "type":         "http",
    "scheme":       "bearer",
    "bearerFormat": "JWT",
}
```

这告诉 Swagger UI：这个 API 使用 Bearer JWT 鉴权。

所以页面右上角会出现 `Authorize`。

### requestBody example

注册、登录、发帖接口都有 example。Swagger UI 就能自动填充请求体，方便你点 `Try it out`。

## 测试文件怎么看

### `pkg/password/password_test.go`

验证三件事：

- 哈希不会等于明文。
- 正确密码可以匹配。
- 错误密码不能匹配。

这是安全模块最小但有效的测试。

### `pkg/jwt/manager_test.go`

验证：

- 生成的 Token 能解析。
- 解析后 claims 正确。
- 篡改 Token 会失败。

重点是第二个测试，它证明签名校验真的生效。

### `internal/config/config_test.go`

验证配置文件能读取，并且默认值能补齐。

这类测试能防止“改配置结构导致服务启动失败”。

### `internal/swagger/swagger_test.go`

验证：

- OpenAPI JSON 路由可访问。
- 文档包含核心接口。
- Swagger UI 页面会加载 `/swagger/doc.json`。

## 从一个请求看代码级别的运行过程

以“发布帖子”为例。

### 第 1 步：路由匹配

`router.go` 中：

```go
posts.POST("", authMiddleware.RequireAuth(), postController.Create)
```

Gin 收到：

```text
POST /api/v1/posts
```

先执行 `RequireAuth()`，再执行 `postController.Create`。

### 第 2 步：JWT 中间件解析用户

`auth.go` 中：

```go
claims, err := m.tokens.Parse(parts[1])
c.Set(contextUserID, claims.UserID)
c.Set(contextRole, claims.Role)
```

解析成功后，当前用户 ID 被放进 Gin 上下文。

### 第 3 步：Controller 取 userID 和请求体

`post_controller.go` 中：

```go
userID, ok := middleware.CurrentUserID(c)
var req dto.CreatePostRequest
c.ShouldBindJSON(&req)
```

Controller 拿到：

- 谁在发帖。
- 发帖内容是什么。

### 第 4 步：Service 执行业务

`post_service.go` 中：

```go
post := model.Post{...}
err := s.posts.Transaction(ctx, func(tx *gorm.DB) error {
    txPosts := s.posts.WithTx(tx)
    txUsers := s.users.WithTx(tx)
    txPosts.Create(ctx, &post)
    txUsers.IncrementPostCount(ctx, userID, 1)
})
```

这里真正完成业务规则：

- 创建帖子。
- 更新用户发帖数。
- 两者放在同一个事务。

### 第 5 步：Repository 写数据库

`post_repository.go` 中：

```go
return r.db.WithContext(ctx).Create(post).Error
```

这是实际 INSERT。

`user_repository.go` 中：

```go
UpdateColumn("post_count", gorm.Expr(...))
```

这是实际 UPDATE。

### 第 6 步：VO 组装响应

```go
created, err := s.posts.FindByID(ctx, post.ID)
result := vo.NewPost(*created)
```

查回帖子和作者，转成响应结构。

### 第 7 步：统一响应

`post_controller.go` 中：

```go
response.Created(c, post)
```

最终返回：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "title": "...",
    "author": {}
  }
}
```

## 你读代码时可以这样问自己

每看到一个函数，先回答五个问题：

1. 这个函数属于哪一层？
2. 它的输入从哪里来？
3. 它有没有直接碰 HTTP？
4. 它有没有直接碰数据库？
5. 它返回给上一层的是什么？

例如 `PostService.Delete`：

- 属于 Service 层。
- 输入来自 Controller：帖子 ID、当前用户 ID、当前角色。
- 不直接碰 HTTP。
- 不直接写 GORM，而是调用 Repository。
- 返回业务错误或 nil。

这就是项目代码层次。

## 目前代码里可以继续优化的点

这些不是 V1 必须改的问题，但你可以作为面试时的“我知道后续怎么演进”来说：

1. `writeServiceError` 现在放在 `auth_controller.go`，虽然同包可用，但后续可以单独拆到 `errors.go`。
2. JWT 当前是手写 HS256，学习价值高；生产项目也可以考虑成熟 JWT 库，减少自实现安全风险。
3. `AutoMigrate` 适合 V1，生产环境可以换成版本化 migration。
4. 帖子删除当前第二次删除返回 404，后续如果强调幂等，可以改成重复删除也返回成功。
5. `PostService.Create` 创建后再查询一次方便组装作者信息，后续也可以从已知用户信息直接组装，减少一次查询。

这些点你不用急着改，但要知道为什么当前这样写、未来怎么改。
