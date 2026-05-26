# FeedLab Go

FeedLab 是一个面向 Go 后端实习展示的内容社区系统。当前按小模块迭代，V1 基础业务闭环和 V2 互动系统均已完成，V3 正在引入 Redis 缓存和 Feed 优化：

- 模块 1：项目初始化、配置读取、MySQL/Redis 连接、统一响应和健康检查。
- 模块 2：用户注册、用户登录、JWT 鉴权和当前用户信息。
- 模块 3：发布帖子、帖子列表、帖子详情和帖子软删除。
- 模块 4：Swagger/OpenAPI 接口文档。
- V2 模块 1：帖子点赞、取消点赞、点赞状态和用户点赞列表。
- V2 模块 2：发布评论、回复评论、评论列表、回复列表和评论软删除。
- V2 模块 3：帖子收藏、取消收藏、收藏状态和用户收藏列表。
- V2 模块 4：用户关注、取消关注、关注状态、粉丝列表和关注列表。
- V2 模块 5：评论点赞、取消点赞和评论点赞状态。
- V2 模块 6：用户公开主页和用户公开帖子列表。
- V2 收尾：互动系统代码导读、面试题复盘和完整验收流程。
- V3 模块 1：Redis 帖子详情缓存。
- V3 模块 2：Redis 用户公开资料缓存。
- V3 模块 3：Redis 热门帖子排行榜。

## 为什么这样设计

- 使用 `backend/` 放 Go API，后续可以在根目录继续增加前端、部署脚本和更多服务，结构更接近真实项目。
- 使用 Controller-Service-Repository 分层：Controller 只处理 HTTP 参数和响应，Service 处理业务规则，Repository 只负责 GORM 数据访问。
- 使用 `config.yaml` 管理端口、数据库、Redis、JWT 等环境差异，避免把本地配置写死在业务代码里。
- 使用统一响应 `{ code, message, data }`，让前端、Postman 和后续接口都遵循同一套返回格式。
- 密码只保存 bcrypt 哈希，不保存明文；登录成功后签发 JWT，后续需要登录的接口统一经过 JWT 中间件。
- Redis 当前已用于帖子详情缓存；V2 互动模块仍使用 MySQL 事务维护关系和计数，后续 V3 会继续扩展用户缓存、排行榜和 Feed 优化。
- 当前暂不接 RabbitMQ，因此没有队列、生产者、消费者和消息格式；点赞、评论、评论点赞、收藏、关注等通知异步化留到 V4。

## 当前项目结构

```text
.
├── backend/
│   ├── cmd/api/main.go
│   ├── config.yaml
│   ├── internal/
│   │   ├── config/       配置读取
│   │   ├── controller/   HTTP 入参和响应
│   │   ├── db/           MySQL、Redis、AutoMigrate
│   │   ├── dto/          请求结构
│   │   ├── middleware/   JWT 鉴权
│   │   ├── model/        GORM 模型
│   │   ├── repository/   数据访问
│   │   ├── response/     统一响应
│   │   ├── router/       路由装配
│   │   ├── service/      业务逻辑
│   │   ├── swagger/      OpenAPI 文档和 Swagger 页面
│   │   └── vo/           响应结构
│   ├── pkg/
│   │   ├── jwt/          JWT 签发和解析
│   │   └── password/     bcrypt 哈希和校验
│   └── go.mod
├── frontend/             React + TypeScript 前端演示项目
├── interview-quiz/       React + Three.js 面试题练习项目
├── docker-compose.yml
└── postman/
```

## V1 架构源码导读

如果你想按源码理解 Controller、Service、Repository、DTO、VO、Model 之间的关系，可以阅读：

[FeedLab Go V1 架构源码导读](./docs/feedlab-v1-architecture-guide.md)

这份文档会按请求调用链讲解注册、登录、JWT 鉴权、发帖、列表、详情、软删除，并逐个解释当前 V1 的每个 `.go` 文件。

如果你想进一步看具体代码块为什么这么写，可以阅读：

[FeedLab Go V1 代码层逐段详解](./docs/feedlab-v1-code-walkthrough.md)

这份文档会拆 `main.go`、`router.go`、Controller、Service、Repository、Model、DTO、VO、中间件、JWT、bcrypt 等具体代码。

## V2 互动系统源码导读

V2 完成后，如果你想理解点赞、收藏、关注、评论、评论点赞和公开主页之间的代码关系，可以阅读：

[FeedLab Go V2 互动系统代码导读](./docs/feedlab-v2-interactions-code-guide.md)

这份文档会按请求链路讲解 V2 的表设计、唯一索引、幂等、事务、软删除可见性、公开 VO 和每个核心 `.go` 文件的职责。

## 本地启动

1. 启动 MySQL 和 Redis：

```bash
docker compose up -d mysql redis
```

2. 启动 API：

```bash
cd /Users/zwy/Documents/Build_My_Vps-Go/backend
go run ./cmd/api
```

3. 访问健康检查：

```bash
curl http://localhost:8080/healthz
```

成功示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "api": "ok",
    "mysql": "ok",
    "redis": "ok"
  }
}
```

## 模块 1：健康检查

### GET /healthz

用途：检查 API、MySQL、Redis 是否可用。

测试：

```bash
curl http://localhost:8080/healthz
```

预期：

- `code = 0` 表示三者都可用。
- 如果 MySQL 或 Redis 未启动，接口返回 `code = 50000`，`data` 中会标明失败项。

## 模块 2：用户认证

### 为什么这样设计

- `users` 表是账号体系基础，后续帖子、点赞、评论、关注都需要通过 `user_id` 关联用户。
- 注册时先检查用户名和邮箱是否存在，再保存 bcrypt 哈希，避免明文密码进入数据库。
- 登录使用邮箱和密码，成功后返回 `Bearer` Token；后续需要登录的接口只依赖 JWT 中间件，不在每个 Controller 里重复解析。
- `/api/v1/users/me` 是最小鉴权闭环：它证明 Token 能被签发、解析，并能从数据库查回当前用户。
- 本模块只写 `users` 单表，没有涉及多个表更新，因此不需要事务；后续发布帖子会同时写 `posts` 并更新 `users.post_count`，那时必须使用事务。

### POST /api/v1/auth/register

用途：注册用户。

测试：

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "alice",
    "email": "alice@example.com",
    "password": "secret123",
    "nickname": "Alice"
  }'
```

预期：返回 `201`，`code = 0`，`data` 中包含用户信息，但不包含 `password_hash`。

重复注册同一个用户名或邮箱时，返回 `409`，`code = 40900`。

### POST /api/v1/auth/login

用途：用户登录并获取 JWT。

测试：

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "alice@example.com",
    "password": "secret123"
  }'
```

预期：返回 `200`，`code = 0`，`data.access_token` 是后续鉴权接口使用的 Token。

密码错误时，返回 `401`，`code = 40001`。

### GET /api/v1/users/me

用途：获取当前登录用户信息，必须携带 JWT。

测试：

```bash
TOKEN="上一步登录返回的 access_token"

curl http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer ${TOKEN}"
```

预期：返回 `200`，`code = 0`，`data.id` 是当前登录用户 ID。

不带 Token、Token 格式错误或签名错误时，返回 `401`，`code = 40001`。

## 模块 3：帖子操作

### 为什么这样设计

- `posts` 表只承载帖子核心字段，作者信息通过 `user_id` 关联 `users`，详情和列表响应用 VO 组合作者基础信息。
- 发布帖子和维护 `users.post_count` 是两个表的更新，必须放进同一个事务，避免帖子创建成功但用户发帖数没更新。
- 删除帖子使用 GORM 软删除，只写入 `deleted_at`，不物理删除数据，方便后续审计、恢复或后台管理。
- 删除帖子同样使用事务，同时软删除 `posts` 并维护 `users.post_count`。
- 列表和详情 V1 只展示 `published` 状态的帖子；`draft` 预留给后续编辑/草稿功能。
- 点赞、评论、收藏等可重复触发操作还未进入 V1 当前模块；后续实现时会用唯一索引和幂等逻辑处理。

### POST /api/v1/posts

用途：当前登录用户发布帖子，必须携带 JWT。

测试：

```bash
TOKEN="登录返回的 access_token"

curl -X POST http://localhost:8080/api/v1/posts \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "FeedLab 第一篇帖子",
    "content": "这是 V1 帖子模块创建的内容。",
    "cover_url": "",
    "content_type": "article",
    "status": "published"
  }'
```

预期：返回 `201`，`code = 0`，并返回帖子详情和作者信息。

不带 Token 时，返回 `401`，`code = 40001`。

### GET /api/v1/posts

用途：分页查看公开帖子列表。

测试：

```bash
curl 'http://localhost:8080/api/v1/posts?page=1&page_size=10'
```

预期：返回 `200`，`data.items` 是帖子列表，`data.total` 是公开帖子总数。

### GET /api/v1/posts/:id

用途：查看公开帖子详情。

测试：

```bash
curl http://localhost:8080/api/v1/posts/1
```

预期：返回 `200` 和帖子详情；帖子不存在、已软删除或不是 `published` 状态时返回 `404`，`code = 40400`。

### DELETE /api/v1/posts/:id

用途：软删除帖子，只有作者或 `admin` 可以删除。

测试：

```bash
TOKEN="作者登录返回的 access_token"

curl -X DELETE http://localhost:8080/api/v1/posts/1 \
  -H "Authorization: Bearer ${TOKEN}"
```

预期：返回 `200`，`data.deleted = true`。删除后再次访问详情返回 `404`。

非作者删除时，返回 `403`，`code = 40002`。

## 模块 4：Swagger/OpenAPI 文档

### 为什么这样设计

- V1 使用内置 OpenAPI JSON + CDN Swagger UI，不依赖 `swag` CLI 或额外 Go 运行时包，部署到 1C2G VPS 更轻。
- `/swagger/doc.json` 提供标准 OpenAPI 3.0 文档，后续可以导入 Postman、Apifox 或 Swagger UI。
- `/swagger/index.html` 提供可交互 Swagger UI，支持 `Try it out` 直接测试接口。
- Swagger 文档不是替代 README，而是 API 契约；README 解释项目设计，Swagger 解释接口怎么调用。

### GET /swagger/index.html

用途：浏览 FeedLab V1 API 文档页面，并直接测试接口。

测试：

```bash
curl http://localhost:8080/swagger/index.html
```

浏览器访问：

```text
http://localhost:8080/swagger/index.html
```

Swagger UI 测试流程：

1. 展开 `POST /api/v1/auth/register`，点击 `Try it out`，使用示例请求体注册用户。
2. 展开 `POST /api/v1/auth/login`，点击 `Try it out` 登录。
3. 复制登录响应里的 `data.access_token`。
4. 点击页面右上角 `Authorize`，在 `BearerAuth` 中粘贴 token。Swagger UI 会自动添加 `Bearer` 前缀，不需要手动输入 `Bearer `。
5. 展开 `POST /api/v1/posts`，点击 `Try it out` 发布帖子。
6. 展开 `GET /api/v1/posts`，设置 `page` 和 `page_size` 后查询帖子列表。

### GET /swagger/doc.json

用途：获取 OpenAPI 3.0 JSON 文档。

测试：

```bash
curl http://localhost:8080/swagger/doc.json
```

预期：返回 `openapi = 3.0.3`，并包含 `/healthz`、`/api/v1/auth/register`、`/api/v1/auth/login`、`/api/v1/users/me`、`/api/v1/posts` 等路径。

## V2 模块 1：帖子点赞

### 为什么这样设计

- `post_likes` 表记录用户和帖子的点赞关系，使用 `post_id + user_id` 唯一索引防止重复点赞。
- 点赞和取消点赞都是可重复触发操作，所以接口做成幂等：重复点赞不重复加计数，重复取消不重复扣计数。
- 点赞成功需要同时写 `post_likes` 并维护 `posts.like_count`，因此放在同一个事务里保证一致性。
- 取消点赞物理删除点赞关系，不使用软删除；这样用户取消后再次点赞可以重新插入一条关系。
- 本模块暂不使用 Redis 点赞状态缓存，也不投递 RabbitMQ 通知；这些能力分别留到 V3 和 V4。

### POST /api/v1/posts/:id/like

用途：当前登录用户点赞一篇 published 帖子。

测试：

```bash
TOKEN="登录返回的 access_token"

curl -X POST http://localhost:8080/api/v1/posts/1/like \
  -H "Authorization: Bearer ${TOKEN}"
```

预期：返回 `200`，`data.liked = true`，`data.like_count` 增加 1。

重复调用同一个接口时仍返回成功，但 `like_count` 不会继续增加。

### DELETE /api/v1/posts/:id/like

用途：当前登录用户取消点赞。

测试：

```bash
TOKEN="登录返回的 access_token"

curl -X DELETE http://localhost:8080/api/v1/posts/1/like \
  -H "Authorization: Bearer ${TOKEN}"
```

预期：返回 `200`，`data.liked = false`，如果原来点过赞，`data.like_count` 减少 1。

重复取消点赞时仍返回成功，但 `like_count` 不会继续减少。

### GET /api/v1/posts/:id/liked

用途：查询当前登录用户是否点赞过某篇帖子。

测试：

```bash
TOKEN="登录返回的 access_token"

curl http://localhost:8080/api/v1/posts/1/liked \
  -H "Authorization: Bearer ${TOKEN}"
```

预期：返回 `200`，`data.liked` 表示当前用户是否已点赞，`data.like_count` 是帖子当前点赞数。

### GET /api/v1/users/:id/likes

用途：分页查看某个用户点赞过的 published 帖子列表。

测试：

```bash
curl 'http://localhost:8080/api/v1/users/1/likes?page=1&page_size=10'
```

预期：返回 `200`，结构和帖子列表一致，`data.items` 是该用户点赞过的公开帖子。

## V2 模块 2：评论系统

### 为什么这样设计

- `comments` 表同时承载一级评论和二级回复，用 `parent_id = 0` 表示一级评论，`parent_id > 0` 表示回复。
- 本模块只支持两层评论，不支持三级嵌套，避免 V2 过早引入复杂树形查询。
- 发布评论需要写 `comments` 并维护 `posts.comment_count`，必须放在同一个事务里。
- 删除评论使用软删除；删除一级评论时会同时软删除它的未删除回复，并按实际删除数量扣减 `posts.comment_count`。
- 评论通知暂不投递 RabbitMQ，评论列表暂不使用 Redis 缓存；这两个能力分别留到 V4 和 V3。

### POST /api/v1/posts/:id/comments

用途：当前登录用户给 published 帖子发布一级评论或二级回复。

发布一级评论测试：

```bash
TOKEN="登录返回的 access_token"

curl -X POST http://localhost:8080/api/v1/posts/1/comments \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{
    "content": "这是一条一级评论。",
    "parent_id": 0
  }'
```

发布二级回复测试：

```bash
TOKEN="登录返回的 access_token"
COMMENT_ID="一级评论 ID"

curl -X POST http://localhost:8080/api/v1/posts/1/comments \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{
    \"content\": \"这是一条回复。\",
    \"parent_id\": ${COMMENT_ID}
  }"
```

预期：返回 `201`，`code = 0`，并返回评论详情和作者信息。每成功创建一条可见评论，`posts.comment_count` 增加 1。

### GET /api/v1/posts/:id/comments

用途：分页查看某篇 published 帖子的一级评论列表。

测试：

```bash
curl 'http://localhost:8080/api/v1/posts/1/comments?page=1&page_size=10'
```

预期：返回 `200`，`data.items` 只包含 `parent_id = 0` 的一级评论，按 `created_at DESC, id DESC` 排序。

### GET /api/v1/comments/:id/replies

用途：分页查看某条一级评论下的二级回复列表。

测试：

```bash
curl 'http://localhost:8080/api/v1/comments/1/replies?page=1&page_size=10'
```

预期：返回 `200`，`data.items` 是该一级评论的回复，按 `created_at ASC, id ASC` 排序。

### DELETE /api/v1/comments/:id

用途：软删除评论。只有评论作者或 `admin` 可以删除。

测试：

```bash
TOKEN="评论作者登录返回的 access_token"

curl -X DELETE http://localhost:8080/api/v1/comments/1 \
  -H "Authorization: Bearer ${TOKEN}"
```

预期：返回 `200`，例如：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "deleted": true,
    "deleted_count": 1
  }
}
```

如果删除一级评论，`deleted_count` 会包含这条一级评论和它下面所有未删除回复；`posts.comment_count` 会按 `deleted_count` 扣减。

## V2 模块 3：帖子收藏

### 为什么这样设计

- `post_collects` 表记录用户和帖子的收藏关系，使用 `post_id + user_id` 唯一索引防止重复收藏。
- 收藏和取消收藏都是可重复触发操作，所以接口做成幂等：重复收藏不重复加计数，重复取消不重复扣计数。
- 收藏成功需要同时写 `post_collects` 并维护 `posts.collect_count`，因此放在同一个事务里保证一致性。
- 取消收藏物理删除收藏关系，不使用软删除；这样用户取消后再次收藏可以重新插入一条关系。
- 收藏列表当前只返回 published 帖子，避免已删除、草稿或隐藏内容通过收藏列表泄露。
- 本模块暂不使用 Redis 收藏状态缓存，也不投递 RabbitMQ 通知；这些能力分别留到 V3 和 V4。

### POST /api/v1/posts/:id/collect

用途：当前登录用户收藏一篇 published 帖子。

测试：

```bash
TOKEN="登录返回的 access_token"

curl -X POST http://localhost:8080/api/v1/posts/1/collect \
  -H "Authorization: Bearer ${TOKEN}"
```

预期：返回 `200`，`data.collected = true`，`data.collect_count` 增加 1。

重复调用同一个接口时仍返回成功，但 `collect_count` 不会继续增加。

### DELETE /api/v1/posts/:id/collect

用途：当前登录用户取消收藏。

测试：

```bash
TOKEN="登录返回的 access_token"

curl -X DELETE http://localhost:8080/api/v1/posts/1/collect \
  -H "Authorization: Bearer ${TOKEN}"
```

预期：返回 `200`，`data.collected = false`，如果原来收藏过，`data.collect_count` 减少 1。

重复取消收藏时仍返回成功，但 `collect_count` 不会继续减少。

### GET /api/v1/posts/:id/collected

用途：查询当前登录用户是否收藏过某篇帖子。

测试：

```bash
TOKEN="登录返回的 access_token"

curl http://localhost:8080/api/v1/posts/1/collected \
  -H "Authorization: Bearer ${TOKEN}"
```

预期：返回 `200`，`data.collected` 表示当前用户是否已收藏，`data.collect_count` 是帖子当前收藏数。

### GET /api/v1/users/:id/collects

用途：分页查看某个用户收藏过的 published 帖子列表。

测试：

```bash
curl 'http://localhost:8080/api/v1/users/1/collects?page=1&page_size=10'
```

预期：返回 `200`，结构和帖子列表一致，`data.items` 是该用户收藏过的公开帖子。

## V2 模块 4：用户关注

### 为什么这样设计

- `user_follows` 表记录用户和用户之间的关注关系，使用 `follower_id + followee_id` 唯一索引防止重复关注。
- 关注和取消关注都是可重复触发操作，所以接口做成幂等：重复关注不重复加计数，重复取消不重复扣计数。
- 关注成功需要同时写 `user_follows`，并维护关注者的 `following_count` 和被关注者的 `follower_count`，因此必须放在同一个事务里。
- 禁止自己关注自己，因为这种关系没有业务意义，也会让粉丝数和关注数变得混乱。
- 粉丝列表和关注列表是公开接口，但返回公开用户 VO，不暴露 email、role 等内部字段。
- 本模块暂不使用 Redis 关注状态缓存，也不投递 RabbitMQ 通知；这些能力分别留到 V3 和 V4。

### POST /api/v1/users/:id/follow

用途：当前登录用户关注另一个用户。

测试：

```bash
TOKEN="登录返回的 access_token"

curl -X POST http://localhost:8080/api/v1/users/2/follow \
  -H "Authorization: Bearer ${TOKEN}"
```

预期：返回 `200`，`data.followed = true`，目标用户的 `data.follower_count` 增加 1。

重复调用同一个接口时仍返回成功，但粉丝数和关注数不会重复增加。

如果 `:id` 是当前登录用户自己的 ID，返回 `400`，`code = 40000`。

### DELETE /api/v1/users/:id/follow

用途：当前登录用户取消关注另一个用户。

测试：

```bash
TOKEN="登录返回的 access_token"

curl -X DELETE http://localhost:8080/api/v1/users/2/follow \
  -H "Authorization: Bearer ${TOKEN}"
```

预期：返回 `200`，`data.followed = false`，如果原来关注过，目标用户的 `data.follower_count` 减少 1。

重复取消关注时仍返回成功，但粉丝数和关注数不会继续减少。

### GET /api/v1/users/:id/followed

用途：查询当前登录用户是否关注了某个用户。

测试：

```bash
TOKEN="登录返回的 access_token"

curl http://localhost:8080/api/v1/users/2/followed \
  -H "Authorization: Bearer ${TOKEN}"
```

预期：返回 `200`，`data.followed` 表示当前用户是否关注目标用户，`data.follower_count` 是目标用户当前粉丝数。

### GET /api/v1/users/:id/followers

用途：分页查看某个用户的粉丝列表，公开接口。

测试：

```bash
curl 'http://localhost:8080/api/v1/users/2/followers?page=1&page_size=10'
```

预期：返回 `200`，`data.items` 是关注该用户的人；用户信息不包含 `email` 和 `role`。

### GET /api/v1/users/:id/following

用途：分页查看某个用户关注了哪些人，公开接口。

测试：

```bash
curl 'http://localhost:8080/api/v1/users/1/following?page=1&page_size=10'
```

预期：返回 `200`，`data.items` 是该用户关注的人；用户信息不包含 `email` 和 `role`。

## V2 模块 5：评论点赞

### 为什么这样设计

- `comment_likes` 表记录用户和评论之间的点赞关系，使用 `comment_id + user_id` 唯一索引防止重复点赞。
- 评论点赞和取消点赞也是可重复触发操作，所以接口做成幂等：重复点赞不重复加计数，重复取消不重复扣计数。
- 评论点赞成功需要同时写 `comment_likes` 并维护 `comments.like_count`，因此放在同一个事务里保证一致性。
- 取消评论点赞物理删除关系记录，不使用软删除；这样用户取消后再次点赞可以重新插入一条关系。
- 被软删除的评论不可再点赞、取消点赞或查询点赞状态，会返回 `40400`。
- 本模块暂不使用 Redis 评论点赞状态缓存，也不投递 RabbitMQ 通知；这些能力分别留到 V3 和 V4。

### POST /api/v1/comments/:id/like

用途：当前登录用户点赞一条 published 评论或回复。

测试：

```bash
TOKEN="登录返回的 access_token"

curl -X POST http://localhost:8080/api/v1/comments/1/like \
  -H "Authorization: Bearer ${TOKEN}"
```

预期：返回 `200`，`data.liked = true`，`data.like_count` 增加 1。

重复调用同一个接口时仍返回成功，但 `like_count` 不会继续增加。

### DELETE /api/v1/comments/:id/like

用途：当前登录用户取消评论点赞。

测试：

```bash
TOKEN="登录返回的 access_token"

curl -X DELETE http://localhost:8080/api/v1/comments/1/like \
  -H "Authorization: Bearer ${TOKEN}"
```

预期：返回 `200`，`data.liked = false`，如果原来点过赞，`data.like_count` 减少 1。

重复取消点赞时仍返回成功，但 `like_count` 不会继续减少。

### GET /api/v1/comments/:id/liked

用途：查询当前登录用户是否点赞过某条评论。

测试：

```bash
TOKEN="登录返回的 access_token"

curl http://localhost:8080/api/v1/comments/1/liked \
  -H "Authorization: Bearer ${TOKEN}"
```

预期：返回 `200`，`data.liked` 表示当前用户是否已点赞，`data.like_count` 是评论当前点赞数。

## V2 模块 6：用户公开主页

### 为什么这样设计

- `GET /api/v1/users/:id` 返回公开用户资料，复用 `PublicUser` VO，只暴露主页展示需要的字段。
- 公开主页不返回 `email`、`role`、`status`、`password_hash` 等登录凭证、权限或内部状态字段，避免把账号体系细节泄露给访客。
- `GET /api/v1/users/:id/posts` 只返回该用户已发布的 `published` 帖子，不返回草稿和已软删除帖子。
- 本模块是只读查询，不更新多张表，因此不需要事务；事务只用于点赞、收藏、关注、发帖、删帖这类写操作。
- 本模块不新增数据库表，也不新增 Redis Key 或 RabbitMQ 队列；后续前端个人主页可以直接组合这些公开接口。

### GET /api/v1/users/:id

用途：查看某个用户的公开主页资料。

测试：

```bash
curl http://localhost:8080/api/v1/users/1
```

预期：返回 `200`，`data` 中包含 `id`、`username`、`nickname`、`avatar_url`、`bio`、`follower_count`、`following_count`、`post_count`、`created_at`。

注意：公开资料不会返回 `email`、`role`、`status`、`password_hash`。

用户不存在时返回 `404`，`code = 40400`。

### GET /api/v1/users/:id/posts

用途：分页查看某个用户发布过的公开帖子。

测试：

```bash
curl 'http://localhost:8080/api/v1/users/1/posts?page=1&page_size=10'
```

预期：返回 `200`，`data.items` 只包含该用户的 `published` 帖子，按 `created_at DESC, id DESC` 排序。

用户不存在时返回 `404`，`code = 40400`。非法分页参数返回 `400`，`code = 40000`。

## V3 模块 1：Redis 帖子详情缓存

### 为什么这样设计

- 帖子详情是内容社区里的高频读接口，同一篇热门帖子可能被很多用户反复访问，适合先用 Redis 做读缓存。
- V3 使用 Cache Aside 模式：`GET /api/v1/posts/:id` 先读 Redis，命中直接返回；未命中再查 MySQL，并把结果写入 Redis。
- 缓存保存的是帖子详情 VO，而不是 GORM Model，避免把数据库内部结构、软删除字段或敏感字段带进缓存。
- 帖子详情里包含 `like_count`、`collect_count`、`comment_count`，所以点赞、取消点赞、收藏、取消收藏、评论创建、评论删除和帖子删除后都要删除详情缓存。
- 缓存删除失败不阻断主流程；MySQL 仍然是最终数据源，Redis 只是性能优化层。

### Redis Key

| Key | 用途 | 过期策略 |
|---|---|---|
| `post:detail:{post_id}` | 缓存 published 帖子的详情响应 VO | 默认 TTL 300 秒，可通过 `redis.post_detail_ttl_seconds` 配置 |

缓存失效时机：

- `DELETE /api/v1/posts/:id` 删除帖子后删除该 Key，避免软删除帖子继续被缓存命中。
- `POST/DELETE /api/v1/posts/:id/like` 删除该 Key，保证详情里的点赞数最终刷新。
- `POST/DELETE /api/v1/posts/:id/collect` 删除该 Key，保证详情里的收藏数最终刷新。
- `POST /api/v1/posts/:id/comments` 和 `DELETE /api/v1/comments/:id` 删除对应帖子详情 Key，保证评论数最终刷新。

### GET /api/v1/posts/:id 缓存测试

用途：验证帖子详情第一次从 MySQL 回源，第二次从 Redis 命中。

测试：

```bash
POST_ID="已有 published 帖子 ID"

redis-cli DEL "post:detail:${POST_ID}"

curl "http://localhost:8080/api/v1/posts/${POST_ID}"
redis-cli TTL "post:detail:${POST_ID}"
redis-cli GET "post:detail:${POST_ID}"

curl "http://localhost:8080/api/v1/posts/${POST_ID}"
```

预期：

- 第一次详情请求返回 `code = 0`，并写入 `post:detail:{post_id}`。
- `TTL` 返回大于 `0` 的秒数，默认接近 `300`。
- 第二次详情请求返回同样结构，理论上命中 Redis。

缓存失效测试：

```bash
TOKEN="登录返回的 access_token"
POST_ID="已有 published 帖子 ID"

curl "http://localhost:8080/api/v1/posts/${POST_ID}"
redis-cli EXISTS "post:detail:${POST_ID}"

curl -X POST "http://localhost:8080/api/v1/posts/${POST_ID}/like" \
  -H "Authorization: Bearer ${TOKEN}"

redis-cli EXISTS "post:detail:${POST_ID}"
```

预期：点赞成功后 `EXISTS` 返回 `0`，表示旧帖子详情缓存已失效；再次查询详情会重新写入缓存。

## V3 模块 2：Redis 用户公开资料缓存

### 为什么这样设计

- 用户公开主页 `GET /api/v1/users/:id` 是个人主页、帖子作者入口、粉丝列表跳转都会用到的高频读接口，适合用 Redis 缓存公开资料。
- 缓存只保存 `PublicUser` VO，不保存 `email`、`role`、`status` 等登录或内部字段，继续遵守公开接口的字段边界。
- 用户公开资料包含 `follower_count`、`following_count`、`post_count`，所以关注、取消关注、发布帖子和删除帖子后要删除相关用户缓存。
- 当前用户信息 `/api/v1/users/me` 不走这个缓存，因为它是登录态接口，会返回 email、role 等当前用户私有字段。

### Redis Key

| Key | 用途 | 过期策略 |
|---|---|---|
| `user:profile:{user_id}` | 缓存用户公开资料 `PublicUser` VO | 默认 TTL 600 秒，可通过 `redis.user_profile_ttl_seconds` 配置 |

缓存失效时机：

- `POST /api/v1/users/:id/follow` 和 `DELETE /api/v1/users/:id/follow` 删除当前用户和目标用户的公开资料缓存。
- `POST /api/v1/posts` 发布 published 帖子后删除作者公开资料缓存，保证 `post_count` 最终刷新。
- `DELETE /api/v1/posts/:id` 删除 published 帖子后删除作者公开资料缓存，保证 `post_count` 最终刷新。

### GET /api/v1/users/:id 缓存测试

用途：验证用户公开资料第一次从 MySQL 回源，第二次从 Redis 命中。

测试：

```bash
USER_ID="已有用户 ID"

redis-cli DEL "user:profile:${USER_ID}"

curl "http://localhost:8080/api/v1/users/${USER_ID}"
redis-cli TTL "user:profile:${USER_ID}"
redis-cli GET "user:profile:${USER_ID}"

curl "http://localhost:8080/api/v1/users/${USER_ID}"
```

预期：

- 第一次公开主页请求返回 `code = 0`，并写入 `user:profile:{user_id}`。
- `TTL` 返回大于 `0` 的秒数，默认接近 `600`。
- 缓存内容只包含公开字段，不包含 `email`、`role`、`status`。

缓存失效测试：

```bash
TOKEN="登录返回的 access_token"
TARGET_USER_ID="被关注用户 ID"

curl "http://localhost:8080/api/v1/users/${TARGET_USER_ID}"
redis-cli EXISTS "user:profile:${TARGET_USER_ID}"

curl -X POST "http://localhost:8080/api/v1/users/${TARGET_USER_ID}/follow" \
  -H "Authorization: Bearer ${TOKEN}"

redis-cli EXISTS "user:profile:${TARGET_USER_ID}"
```

预期：关注成功后 `EXISTS` 返回 `0`，表示目标用户旧公开资料缓存已失效；再次查询公开主页会重新写入缓存。

## V3 模块 3：Redis 热门帖子排行榜

### 为什么这样设计

- 热门帖子需要按分数排序，Redis ZSet 天然适合“成员 + 分数 + 按分数取 Top N”的场景。
- V3 使用 `rank:hot_posts` 存储帖子 ID 和热度分，`GET /api/v1/posts/hot?limit=10` 从 ZSet 取 Top N，再回 MySQL 查询帖子详情，避免在 Redis 中塞完整帖子。
- 热度分当前使用简单公式：`like_count * 3 + collect_count * 5 + comment_count * 4`。收藏权重更高，因为收藏通常比点赞更能表示长期兴趣。
- 点赞、收藏、评论创建和评论删除成功后会刷新对应帖子的热度分；删除帖子后会从排行榜移除。
- 当 ZSet 为空时，接口会用 MySQL 按 `hot_score` 和计数字段兜底返回 published 帖子，并回填 ZSet，方便冷启动测试。

### Redis Key

| Key | 用途 | 过期策略 |
|---|---|---|
| `rank:hot_posts` | 热门帖子排行榜 ZSet，member 是 `post_id`，score 是热度分 | 不设置 TTL，由互动写操作持续刷新；删除帖子时移除成员 |

### GET /api/v1/posts/hot

用途：查看热门 published 帖子列表。

测试：

```bash
curl 'http://localhost:8080/api/v1/posts/hot?limit=10'
redis-cli ZREVRANGE rank:hot_posts 0 9 WITHSCORES
```

预期：

- 返回 `200`，`data.items` 是热门帖子列表。
- `data.items[*].hot_score` 是当前热度分。
- Redis 中 `rank:hot_posts` 能看到帖子 ID 和对应分数。

热度刷新测试：

```bash
TOKEN="登录返回的 access_token"
POST_ID="已有 published 帖子 ID"

curl -X POST "http://localhost:8080/api/v1/posts/${POST_ID}/like" \
  -H "Authorization: Bearer ${TOKEN}"

redis-cli ZSCORE rank:hot_posts "${POST_ID}"
curl 'http://localhost:8080/api/v1/posts/hot?limit=10'
```

预期：点赞成功后 `ZSCORE` 返回分数，热门列表中该帖子 `hot_score` 会随互动数变化。

## 数据库表说明

### users

`users` 表由 GORM AutoMigrate 创建。

| 字段 | 含义 |
|---|---|
| id | 用户主键，自增 ID |
| username | 用户名，唯一，用于展示和后续主页地址 |
| email | 邮箱，唯一，当前登录凭证 |
| password_hash | bcrypt 哈希后的密码，不返回给前端 |
| nickname | 昵称，默认等于 username |
| avatar_url | 头像地址，V1 先预留为空字符串 |
| bio | 个人简介，V1 先预留为空字符串 |
| role | 用户角色，当前默认 `user`，后续可扩展 `admin` |
| status | 用户状态，当前默认 `active` |
| follower_count | 粉丝数，关注模块实现时维护 |
| following_count | 关注数，关注模块实现时维护 |
| post_count | 发帖数，帖子模块实现时维护 |
| created_at | 创建时间 |
| updated_at | 更新时间 |
| deleted_at | 软删除时间，GORM 用它过滤已删除用户 |

### posts

`posts` 表由 GORM AutoMigrate 创建。

| 字段 | 含义 |
|---|---|
| id | 帖子主键，自增 ID |
| user_id | 作者用户 ID，关联 `users.id` |
| title | 帖子标题，最长 120 字符 |
| content | 帖子正文，V1 使用文本内容 |
| cover_url | 封面图地址，V1 可为空 |
| content_type | 内容类型，当前支持 `article`、`image`、`video`，V1 默认 `article` |
| status | 帖子状态，当前支持 `draft`、`published`，公开列表只展示 `published` |
| view_count | 浏览数，后续 Feed/异步浏览量模块维护 |
| like_count | 点赞数，点赞模块维护 |
| comment_count | 评论数，评论模块维护 |
| collect_count | 收藏数，收藏模块维护 |
| hot_score | 热度分，后续热门 Feed 和 Redis ZSet 使用 |
| created_at | 创建时间，列表按它倒序 |
| updated_at | 更新时间 |
| deleted_at | 软删除时间，GORM 用它过滤已删除帖子 |

### post_likes

`post_likes` 表由 GORM AutoMigrate 创建，用于记录用户对帖子的点赞关系。

| 字段 | 含义 |
|---|---|
| id | 点赞关系主键，自增 ID |
| post_id | 被点赞的帖子 ID，和 `user_id` 组成唯一索引 |
| user_id | 点赞用户 ID，和 `post_id` 组成唯一索引 |
| created_at | 点赞时间，用户点赞列表按它倒序 |

唯一索引：`post_id + user_id`。它是幂等点赞的数据库兜底，防止并发请求插入重复点赞记录。

### post_collects

`post_collects` 表由 GORM AutoMigrate 创建，用于记录用户对帖子的收藏关系。

| 字段 | 含义 |
|---|---|
| id | 收藏关系主键，自增 ID |
| post_id | 被收藏的帖子 ID，和 `user_id` 组成唯一索引 |
| user_id | 收藏用户 ID，和 `post_id` 组成唯一索引 |
| created_at | 收藏时间，用户收藏列表按它倒序 |

唯一索引：`post_id + user_id`。它是幂等收藏的数据库兜底，防止重复收藏和并发重复插入。

### user_follows

`user_follows` 表由 GORM AutoMigrate 创建，用于记录用户之间的关注关系。

| 字段 | 含义 |
|---|---|
| id | 关注关系主键，自增 ID |
| follower_id | 发起关注的用户 ID，和 `followee_id` 组成唯一索引 |
| followee_id | 被关注的用户 ID，和 `follower_id` 组成唯一索引 |
| created_at | 关注时间，粉丝/关注列表按它倒序 |

唯一索引：`follower_id + followee_id`。它是幂等关注的数据库兜底，防止同一个用户重复关注同一个目标用户。

### comments

`comments` 表由 GORM AutoMigrate 创建，用于记录帖子的一级评论和二级回复。

| 字段 | 含义 |
|---|---|
| id | 评论主键，自增 ID |
| post_id | 评论所属帖子 ID，关联 `posts.id` |
| user_id | 评论作者用户 ID，关联 `users.id` |
| parent_id | 父评论 ID；`0` 表示一级评论，大于 `0` 表示二级回复 |
| reply_to_user_id | 被回复用户 ID，由后端根据父评论自动设置 |
| content | 评论正文，最长 1000 字符 |
| like_count | 评论点赞数，评论点赞模块维护 |
| status | 评论状态，当前默认 `published` |
| created_at | 创建时间 |
| updated_at | 更新时间 |
| deleted_at | 软删除时间，GORM 用它过滤已删除评论 |

评论删除策略：删除二级回复只软删除自身；删除一级评论会软删除自身和所有未删除回复。

### comment_likes

`comment_likes` 表由 GORM AutoMigrate 创建，用于记录用户对评论或回复的点赞关系。

| 字段 | 含义 |
|---|---|
| id | 评论点赞关系主键，自增 ID |
| comment_id | 被点赞的评论 ID，和 `user_id` 组成唯一索引 |
| user_id | 点赞用户 ID，和 `comment_id` 组成唯一索引 |
| created_at | 评论点赞时间 |

唯一索引：`comment_id + user_id`。它是评论点赞幂等的数据库兜底，防止重复点赞和并发重复插入。

## Redis Key 说明

当前 V3 已经开始使用业务 Redis Key。MySQL 仍是最终数据源，Redis 用于降低高频读接口的数据库压力：

- `post:detail:{post_id}`：帖子详情缓存，TTL 默认 300 秒；点赞、收藏、评论和删帖后删除该 Key。
- `user:profile:{user_id}`：用户公开资料缓存，TTL 默认 600 秒；关注、取消关注、发帖和删帖后删除相关用户 Key。
- `rank:hot_posts`：热门帖子 ZSet 排行榜，不设置 TTL；点赞、收藏、评论后刷新分数，删帖后移除成员。

## RabbitMQ 队列说明

当前不接 RabbitMQ，因此没有队列、生产者、消费者和消息格式。V2 点赞、评论、评论点赞、收藏和关注成功后暂不发送通知；V4 再设计 `notification.queue`，由点赞、评论、评论点赞、收藏、关注接口生产通知消息，Worker 消费后写入 `notifications` 表。

## 面试题练习项目

`interview-quiz/` 是 FeedLab 的配套面试题网页，使用 `Vite + React + TypeScript + Three.js`。

它会按模块更新题库：

- 模块 1：基础设施
- 模块 2：用户认证
- 模块 3：帖子模块
- 模块 4：Swagger/OpenAPI 文档
- V2 模块 1：帖子点赞模块
- V2 模块 2：评论系统
- V2 模块 3：帖子收藏模块
- V2 模块 4：用户关注模块
- V2 模块 5：评论点赞模块
- V2 模块 6：用户公开主页模块
- V2 综合复盘：事务、幂等、唯一索引、VO 边界和后续 Redis/RabbitMQ 演进
- V3 模块 1：Redis 帖子详情缓存
- V3 模块 2：Redis 用户公开资料缓存
- V3 模块 3：Redis 热门帖子排行榜

每道题都会提供答案和解析：

- 选择题：提交后显示正确答案、错误原因和底层原理。
- 简答题：先写自己的回答，再查看参考答案、关键词和面试表达模板。
- 代码理解题：关联具体后端文件，练习按调用链讲清楚代码。

启动方式：

```bash
cd /Users/zwy/Documents/Build_My_Vps-Go/interview-quiz
npm install
npm run dev
```

浏览器打开：

```text
http://localhost:5173
```

如果当前终端找不到 `npm`，请先确认 Node.js/npm 已安装并重开终端。

## 前端演示项目

`frontend/` 是 FeedLab 的前端演示项目，使用 `Vite + React + TypeScript`。

当前前端模块已完成：

- 后端健康检查。
- 用户注册。
- 用户登录。
- JWT Token 本地保存和退出登录。
- 当前用户信息展示。
- 公开帖子流。
- 登录后发布帖子。
- 帖子详情面板。
- 登录后点赞/取消点赞。
- 登录后收藏/取消收藏。
- 评论列表、发布评论和发布回复。
- 评论点赞、取消点赞和作者删除评论。
- 用户公开主页和用户公开帖子列表。
- 关注、取消关注、关注状态、粉丝列表和关注列表。
- 用户主页中的点赞帖子列表和收藏帖子列表。

启动方式：

```bash
cd /Users/zwy/Documents/Build_My_Vps-Go/frontend
npm install
npm run dev
```

浏览器打开：

```text
http://localhost:5174
```

更多说明见：

[FeedLab Frontend README](./frontend/README.md)

## 当前验证命令

```bash
cd /Users/zwy/Documents/Build_My_Vps-Go/backend
go test ./...

cd /Users/zwy/Documents/Build_My_Vps-Go/frontend
npm run build

cd /Users/zwy/Documents/Build_My_Vps-Go/interview-quiz
npm run build

cd /Users/zwy/Documents/Build_My_Vps-Go
python3 -m json.tool postman/FeedLab-Go-V1.postman_collection.json
git diff --check
```

当前测试覆盖：

- 配置读取和默认值。
- bcrypt 哈希与密码校验。
- JWT 签发、解析和篡改拒绝。
- 路由注册、鉴权路由保护和 Swagger 文档路径。
