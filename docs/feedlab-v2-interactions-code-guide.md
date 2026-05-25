# FeedLab Go V2 互动系统代码导读

这份文档是 V2 完成后的代码层复盘。V1 已经跑通注册、登录、发帖、列表、详情和软删除；V2 在这个基础上补齐内容社区最常见的互动能力：

- 帖子点赞
- 评论系统
- 帖子收藏
- 用户关注
- 评论点赞
- 用户公开主页

阅读目标不是背代码，而是能在面试里讲清楚三件事：

```text
这个功能为什么这样建表
请求进来后 Controller、Service、Repository 分别做什么
哪些地方需要事务、幂等、权限和可见性校验
```

## V2 总体调用链

所有 V2 接口仍然遵循同一条分层链路：

```text
router.go
  -> controller
  -> service
  -> repository
  -> model / MySQL
  -> vo
  -> response
```

每层职责要分清：

| 层 | 职责 | 不应该做什么 |
|---|---|---|
| Router | 注册 URL、HTTP 方法、中间件、Controller | 不写业务规则 |
| Controller | 解析 path/query/body/JWT，返回统一响应 | 不直接写数据库 |
| Service | 业务规则、权限、事务、幂等语义 | 不关心 HTTP 细节 |
| Repository | GORM 查询、插入、删除、计数更新 | 不决定接口响应格式 |
| Model | 映射数据库表字段 | 不组装前端响应 |
| VO | 定义响应给前端的数据形状 | 不承载数据库写入逻辑 |

## V2 表设计总览

### `post_likes`

文件：[`backend/internal/model/post_like.go`](../backend/internal/model/post_like.go)

作用：记录“哪个用户点赞了哪个帖子”。

关键字段：

| 字段 | 含义 |
|---|---|
| `id` | 点赞关系主键 |
| `post_id` | 被点赞的帖子 |
| `user_id` | 点赞用户 |
| `created_at` | 点赞时间 |

关键索引：

```go
uniqueIndex:idx_post_likes_post_user
```

`post_id + user_id` 唯一，表示同一个用户对同一篇帖子最多只能有一条点赞关系。这是点赞幂等的数据库兜底。

### `comments`

文件：[`backend/internal/model/comment.go`](../backend/internal/model/comment.go)

作用：记录一级评论和二级回复。

关键字段：

| 字段 | 含义 |
|---|---|
| `post_id` | 评论所属帖子 |
| `user_id` | 评论作者 |
| `parent_id` | `0` 表示一级评论，大于 `0` 表示二级回复 |
| `reply_to_user_id` | 被回复用户，由后端自动设置 |
| `content` | 评论正文 |
| `like_count` | 评论点赞数 |
| `status` | 当前默认 `published` |
| `deleted_at` | GORM 软删除字段 |

为什么只做两层：

```text
一级评论 + 二级回复已经足够展示评论闭环。
如果过早支持无限楼中楼，查询、删除、计数都会复杂很多。
```

### `post_collects`

文件：[`backend/internal/model/post_collect.go`](../backend/internal/model/post_collect.go)

作用：记录用户收藏帖子。

它和 `post_likes` 很像，也是关系表，也使用 `post_id + user_id` 唯一索引。区别在业务语义：

```text
点赞偏轻互动，收藏偏保存内容。
两者都要幂等，但维护的计数字段不同：like_count / collect_count。
```

### `user_follows`

文件：[`backend/internal/model/user_follow.go`](../backend/internal/model/user_follow.go)

作用：记录用户之间的有方向关系。

关键字段：

| 字段 | 含义 |
|---|---|
| `follower_id` | 发起关注的人 |
| `followee_id` | 被关注的人 |
| `created_at` | 关注时间 |

关注关系是有方向的：

```text
A 关注 B，不等于 B 关注 A
```

所以唯一索引用 `follower_id + followee_id`。同时，Service 会禁止自己关注自己。

### `comment_likes`

文件：[`backend/internal/model/comment_like.go`](../backend/internal/model/comment_like.go)

作用：记录用户点赞评论或回复。

它和帖子点赞很像，只是目标从 `posts` 变成了 `comments`。唯一索引是 `comment_id + user_id`。

### `users` 和 `posts` 中的计数字段

文件：

- [`backend/internal/model/user.go`](../backend/internal/model/user.go)
- [`backend/internal/model/post.go`](../backend/internal/model/post.go)

V2 使用了一些冗余计数字段：

| 字段 | 维护模块 |
|---|---|
| `posts.like_count` | 帖子点赞 |
| `posts.collect_count` | 帖子收藏 |
| `posts.comment_count` | 评论系统 |
| `comments.like_count` | 评论点赞 |
| `users.follower_count` | 用户关注 |
| `users.following_count` | 用户关注 |
| `users.post_count` | 发帖/删帖 |

为什么要冗余计数：

```text
列表和详情页经常展示计数。
如果每次都 COUNT 关系表，会增加查询成本。
所以写入互动关系时顺便维护计数，读取时直接返回字段。
```

代价是写入时必须小心一致性，因此 V2 在涉及关系表和计数字段的写操作里使用事务。

## 路由装配：`router.go`

文件：[`backend/internal/router/router.go`](../backend/internal/router/router.go)

V2 的依赖都在这里组装：

```text
Repository -> Service -> Controller -> Route
```

比如评论点赞：

```go
commentLikeRepository := repository.NewCommentLikeRepository(deps.MySQL)
commentLikeService := service.NewCommentLikeService(commentLikeRepository, commentRepository)
commentLikeController := controller.NewCommentLikeController(commentLikeService)
```

然后注册路由：

```go
comments.POST("/:id/like", authMiddleware.RequireAuth(), commentLikeController.LikeComment)
comments.DELETE("/:id/like", authMiddleware.RequireAuth(), commentLikeController.UnlikeComment)
comments.GET("/:id/liked", authMiddleware.RequireAuth(), commentLikeController.IsCommentLiked)
```

你要注意两类路由：

| 类型 | 示例 | 是否需要 JWT |
|---|---|---|
| 写互动 | 点赞、收藏、关注、发评论、删除评论 | 需要 |
| 公开读取 | 帖子列表、评论列表、用户公开主页、粉丝列表 | 不需要 |

面试表达：

```text
我把鉴权放在路由层统一接入 JWT 中间件，Controller 不需要重复解析 Token。
公开读取接口不加中间件，写操作必须经过 RequireAuth。
```

## 帖子点赞模块

相关文件：

- [`backend/internal/controller/like_controller.go`](../backend/internal/controller/like_controller.go)
- [`backend/internal/service/like_service.go`](../backend/internal/service/like_service.go)
- [`backend/internal/repository/post_like_repository.go`](../backend/internal/repository/post_like_repository.go)
- [`backend/internal/repository/post_repository.go`](../backend/internal/repository/post_repository.go)
- [`backend/internal/vo/post.go`](../backend/internal/vo/post.go)

### 请求链路

```text
POST /api/v1/posts/:id/like
  -> JWT 中间件解析 user_id
  -> LikeController.LikePost 解析 post_id
  -> LikeService.LikePost 校验帖子存在且 published
  -> 开启事务
  -> PostLikeRepository.Like 插入点赞关系
  -> 如果 RowsAffected > 0，PostRepository.IncrementLikeCount(+1)
  -> 查询最新 like_count
  -> 返回 { post_id, liked: true, like_count }
```

### 幂等如何实现

Repository 使用：

```go
Clauses(clause.OnConflict{DoNothing: true})
```

含义：

```text
如果 post_id + user_id 已经存在，数据库不报错，也不插入新行。
RowsAffected = 0 时，Service 就不会重复增加 like_count。
```

取消点赞也类似：

```text
Delete 返回 RowsAffected。
只有真正删除了关系，才把 like_count -1。
```

### 为什么需要事务

点赞成功时有两个写入：

```text
写 post_likes
更新 posts.like_count
```

如果不放在一个事务里，可能出现关系表写成功但计数失败。用户看到的点赞数就不可信。

## 评论系统

相关文件：

- [`backend/internal/controller/comment_controller.go`](../backend/internal/controller/comment_controller.go)
- [`backend/internal/service/comment_service.go`](../backend/internal/service/comment_service.go)
- [`backend/internal/repository/comment_repository.go`](../backend/internal/repository/comment_repository.go)
- [`backend/internal/vo/comment.go`](../backend/internal/vo/comment.go)

### 发布一级评论

```text
POST /api/v1/posts/:id/comments
parent_id = 0
```

Service 做的事：

```text
校验帖子存在且 published
检查 content
创建 comments 记录
posts.comment_count +1
```

因为同时写 `comments` 和 `posts.comment_count`，所以需要事务。

### 发布二级回复

```text
POST /api/v1/posts/:id/comments
parent_id > 0
```

Service 额外校验：

```text
父评论存在
父评论属于同一篇帖子
父评论必须是一级评论
```

为什么限制只能两层：

```text
如果 parent 的 parent_id 仍然大于 0，说明它已经是回复。
此时继续回复会变成三级嵌套，V2 不支持。
```

`reply_to_user_id` 不让前端传，而是后端根据父评论自动设置。这样可以避免前端伪造“回复给谁”。

### 删除评论

删除回复：

```text
只软删除自己
posts.comment_count -1
```

删除一级评论：

```text
软删除一级评论
软删除它下面所有未删除回复
posts.comment_count 按实际删除数量扣减
```

权限：

```text
只有评论作者或 admin 可以删除
```

面试表达：

```text
一级评论删除会影响多个 comments 行和 posts.comment_count，所以必须用事务。
实际扣减数量来自 Repository 的 RowsAffected，避免重复删除导致计数继续减少。
```

## 帖子收藏模块

相关文件：

- [`backend/internal/controller/collect_controller.go`](../backend/internal/controller/collect_controller.go)
- [`backend/internal/service/collect_service.go`](../backend/internal/service/collect_service.go)
- [`backend/internal/repository/post_collect_repository.go`](../backend/internal/repository/post_collect_repository.go)

收藏和点赞的模式非常接近：

```text
关系表：post_collects
唯一索引：post_id + user_id
计数字段：posts.collect_count
幂等：重复收藏不重复加，重复取消不继续减
```

不同点是收藏提供了：

```text
GET /api/v1/users/:id/collects
```

这个接口公开返回某个用户收藏过的 `published` 帖子。Repository 通过 JOIN `post_collects` 和 `posts` 查询。

## 用户关注模块

相关文件：

- [`backend/internal/controller/follow_controller.go`](../backend/internal/controller/follow_controller.go)
- [`backend/internal/service/follow_service.go`](../backend/internal/service/follow_service.go)
- [`backend/internal/repository/user_follow_repository.go`](../backend/internal/repository/user_follow_repository.go)
- [`backend/internal/repository/user_repository.go`](../backend/internal/repository/user_repository.go)

关注模块最重要的是“有方向关系”和“双用户计数”。

### 关注链路

```text
POST /api/v1/users/:id/follow
  -> JWT 得到 currentUserID
  -> path 得到 targetUserID
  -> 禁止 currentUserID == targetUserID
  -> 校验两个用户都存在
  -> 开启事务
  -> 插入 user_follows(follower_id, followee_id)
  -> 如果是新关系，currentUser.following_count +1
  -> targetUser.follower_count +1
```

为什么要更新两个用户：

```text
A 关注 B
A 的 following_count 增加
B 的 follower_count 增加
```

这两个更新必须一起成功，所以需要事务。

### 公开列表

```text
GET /api/v1/users/:id/followers
GET /api/v1/users/:id/following
```

它们返回 `PublicUser`，不会返回 email、role、password_hash。

## 评论点赞模块

相关文件：

- [`backend/internal/controller/comment_like_controller.go`](../backend/internal/controller/comment_like_controller.go)
- [`backend/internal/service/comment_like_service.go`](../backend/internal/service/comment_like_service.go)
- [`backend/internal/repository/comment_like_repository.go`](../backend/internal/repository/comment_like_repository.go)
- [`backend/internal/repository/comment_repository.go`](../backend/internal/repository/comment_repository.go)

评论点赞是“帖子点赞”的复用版：

```text
目标表从 posts 换成 comments
关系表从 post_likes 换成 comment_likes
计数字段从 posts.like_count 换成 comments.like_count
```

Service 先调用 `ensurePublishedComment`：

```text
评论存在
评论没有被软删除
评论 status = published
```

软删除后的评论不可见，也不应该继续产生互动，所以点赞、取消点赞、查询点赞状态都会返回 404。

## 用户公开主页模块

相关文件：

- [`backend/internal/controller/user_controller.go`](../backend/internal/controller/user_controller.go)
- [`backend/internal/service/user_service.go`](../backend/internal/service/user_service.go)
- [`backend/internal/service/post_service.go`](../backend/internal/service/post_service.go)
- [`backend/internal/repository/post_repository.go`](../backend/internal/repository/post_repository.go)
- [`backend/internal/vo/user.go`](../backend/internal/vo/user.go)

### 公开用户资料

```text
GET /api/v1/users/:id
```

返回 `PublicUser`：

```text
id
username
nickname
avatar_url
bio
follower_count
following_count
post_count
created_at
```

不返回：

```text
email
role
status
password_hash
```

这就是 VO 的意义：同一个 `model.User`，在“自己看自己”和“别人看公开主页”两个场景里，响应字段不同。

### 用户公开帖子列表

```text
GET /api/v1/users/:id/posts?page=1&page_size=10
```

Service 先确认用户存在，再调用 Repository 查询：

```text
user_id = ?
status = published
```

这个模块是只读，不修改数据，所以不需要事务。

## `WithTx` 模式

很多 Repository 都有：

```go
func (r *XRepository) WithTx(tx *gorm.DB) *XRepository {
    return &XRepository{db: tx}
}
```

作用：Service 开启事务后，把同一个事务连接传给多个 Repository。

例如点赞：

```text
txLikes := s.likes.WithTx(tx)
txPosts := s.posts.WithTx(tx)
```

这样 `post_likes` 插入和 `posts.like_count` 更新就在同一个事务里。

面试表达：

```text
我没有在 Repository 内部偷偷开事务，而是在 Service 里围绕一个完整业务动作开事务。
这样事务边界和业务边界一致。
```

## 计数为什么用 SQL 表达式

例如：

```go
UpdateColumn("like_count", gorm.Expr("CASE WHEN like_count + ? < 0 THEN 0 ELSE like_count + ? END", delta, delta))
```

目的有两个：

```text
1. 在数据库里原子更新，避免先查再写造成并发覆盖。
2. 防止计数被扣成负数。
```

如果用 Go 代码先查：

```text
count = select like_count
count--
update like_count = count
```

并发下两个请求可能读到同一个旧值，然后互相覆盖。SQL 表达式让更新在数据库内部完成，更稳。

## V2 常见面试问题

### 1. 为什么点赞、收藏、关注要做幂等？

因为这些操作可能被用户重复点击，也可能因为网络重试被重复发送。接口幂等后，重复请求不会破坏数据。

可以这样回答：

```text
同一个用户重复点赞同一篇帖子，业务结果仍然是“已点赞”。
所以第二次请求应该返回成功，但不能重复增加 like_count。
```

### 2. 唯一索引和代码判断哪个更重要？

两者都需要，但唯一索引是兜底。

```text
代码里先查再插，在并发下可能两个请求都查到不存在。
唯一索引能保证数据库最终不会出现重复关系。
```

### 3. 哪些 V2 操作需要事务？

需要事务的操作：

```text
点赞 / 取消点赞
收藏 / 取消收藏
关注 / 取消关注
发布评论 / 删除评论
评论点赞 / 取消评论点赞
```

共同点：

```text
它们都同时修改关系表或评论表，以及一个计数字段。
```

不需要事务的操作：

```text
查询列表
查询详情
查询是否点赞/收藏/关注
用户公开主页
```

### 4. 为什么公开接口要用 VO？

因为数据库模型是内部结构，API 响应是外部合同。公开接口只应该返回前端需要展示的字段。

例如 `PublicUser` 不返回 email 和 role，避免泄露账号信息和权限信息。

### 5. Redis 和 RabbitMQ 为什么还没接？

V2 的目标是先把 MySQL 关系和业务一致性打牢。

```text
Redis 适合缓存热点详情、状态和排行榜，放到 V3。
RabbitMQ 适合异步通知和事件处理，放到 V4。
```

这样阶段划分更清楚，也更适合面试展示：先有正确的业务闭环，再做性能和异步化。

## V2 手动验收建议

推荐顺序：

```text
1. 注册并登录，保存 access_token
2. 发布帖子
3. 点赞、重复点赞、取消点赞、重复取消
4. 收藏、重复收藏、取消收藏、重复取消
5. 注册第二个用户，关注、重复关注、取消关注、重复取消
6. 发布一级评论和二级回复
7. 评论点赞、重复点赞、取消点赞、重复取消
8. 查看用户公开主页和用户公开帖子列表
9. 删除评论和帖子，确认软删除后公开查询返回 404 或不再出现在列表里
```

Postman 集合已经按这个顺序组织：

```text
postman/FeedLab-Go-V1.postman_collection.json
```

## 你应该形成的项目讲法

一段完整的面试表达可以是：

```text
FeedLab V2 主要补齐社区互动能力。我把点赞、收藏、关注、评论点赞都设计成关系表加唯一索引，保证重复请求和并发请求下不会产生重复关系。涉及关系表和计数字段的写操作都放在 Service 层事务里完成，比如点赞时同时写 post_likes 并维护 posts.like_count。Controller 只负责 HTTP 参数和统一响应，Repository 只负责 GORM 查询。公开接口使用 VO 控制返回字段，比如 PublicUser 不暴露 email 和 role。V2 先用 MySQL 保证业务正确性，Redis 缓存和 RabbitMQ 通知放到后续版本演进。
```
