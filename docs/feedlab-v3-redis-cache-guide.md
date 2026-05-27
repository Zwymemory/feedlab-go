# FeedLab Go V3 Redis 与缓存系统代码导读

这份文档是 V3 完成后的收尾复盘。V1 跑通注册、登录、发帖和帖子展示；V2 补齐点赞、评论、收藏、关注等互动能力；V3 的目标不是继续堆业务功能，而是把系统从“能用”推进到“更像真实后端项目”：

```text
高频读接口要缓存
高频写计数要降频
排行榜要用合适的数据结构
无效请求要防穿透
敏感入口要限流
缓存要可观测、可验证、可解释
```

面试时可以把 V3 总结成一句话：

```text
FeedLab V3 围绕 Redis 做性能和稳定性增强：用 Cache Aside 缓存高频读，用 ZSet 做热门榜，用 INCR 做浏览量和登录限流，用空值缓存防穿透，并提供缓存观测接口辅助排障。
```

## V3 总体架构

V3 仍然遵守 Controller-Service-Repository 分层。

```text
HTTP 请求
  -> Router 注册路由和中间件
  -> Controller 解析 path/query/body/JWT
  -> Service 编排业务规则、Redis、MySQL
  -> Repository 只负责 GORM / MySQL
  -> Cache 封装 Redis Key 和读写命令
  -> VO 组装响应
  -> response 统一返回
```

V3 最重要的边界是：

| 层 | 在 V3 里做什么 | 不做什么 |
|---|---|---|
| Controller | 解析请求参数，返回统一响应 | 不直接操作 Redis/MySQL |
| Service | 决定缓存读写顺序、失效时机、降级策略 | 不拼 HTTP 响应 |
| Repository | 查询或更新 MySQL | 不知道 Redis Key |
| Cache | 封装 Redis Key、TTL、GET/SET/INCR/ZSET/SCAN | 不决定业务权限 |
| VO | 定义返回字段 | 不承载数据库模型细节 |

## Redis 配置

文件：

- [`backend/config.yaml`](../backend/config.yaml)
- [`backend/internal/config/config.go`](../backend/internal/config/config.go)

V3 新增和使用的 Redis 配置：

| 配置 | 默认值 | 用途 |
|---|---:|---|
| `redis.post_detail_ttl_seconds` | 300 | 帖子详情缓存 TTL |
| `redis.user_profile_ttl_seconds` | 600 | 用户公开资料缓存 TTL |
| `redis.post_view_ttl_seconds` | 86400 | 浏览量增量 Key TTL |
| `redis.post_view_flush_threshold` | 100 | 浏览量增量达到多少后批量写回 MySQL |
| `redis.comment_list_ttl_seconds` | 120 | 评论列表和回复列表缓存 TTL |
| `redis.null_cache_ttl_seconds` | 60 | 空值缓存 TTL |
| `rate_limit.login_window_seconds` | 60 | 登录限流固定窗口 |
| `rate_limit.login_max_attempts` | 10 | 登录限流窗口内最大尝试次数 |

为什么都写进配置：

```text
这些值在本地、测试、VPS、小流量和大流量环境下可能不同。
写进 config.yaml 后，调参不需要改业务代码。
```

## Redis Key 总览

| Key | 数据结构 | Value | TTL | 主要使用位置 |
|---|---|---|---|---|
| `post:detail:{post_id}` | String | 帖子详情 `vo.Post` JSON | 300 秒 | 帖子详情缓存 |
| `post:detail:null:{post_id}` | String | `"1"` 哨兵值 | 60 秒 | 帖子详情空值缓存 |
| `user:profile:{user_id}` | String | 用户公开资料 `vo.PublicUser` JSON | 600 秒 | 用户公开主页缓存 |
| `user:profile:null:{user_id}` | String | `"1"` 哨兵值 | 60 秒 | 用户公开资料空值缓存 |
| `rank:hot_posts` | ZSet | member=`post_id`，score=`hot_score` | 不设置 TTL | 热门帖子排行榜 |
| `post:view_count:{post_id}` | String Counter | 待落库浏览量增量 | 86400 秒 | 浏览量计数 |
| `post:comments:{post_id}:page:{page}:size:{page_size}` | String | 一级评论 `vo.CommentList` JSON | 120 秒 | 评论列表缓存 |
| `comment:replies:{comment_id}:page:{page}:size:{page_size}` | String | 二级回复 `vo.CommentList` JSON | 120 秒 | 回复列表缓存 |
| `rate_limit:login:{ip}` | String Counter | 固定窗口内登录尝试次数 | 60 秒 | 登录限流 |

面试里讲 Redis Key 时，不要只背名字，建议按这个模板回答：

```text
这个 Key 的格式是什么？
它缓存什么 Value？
TTL 是多少？
谁写入？
谁删除或更新？
如果 Redis 失败会怎样降级？
```

## 模块 1：帖子详情缓存

核心文件：

- [`backend/internal/cache/post_cache.go`](../backend/internal/cache/post_cache.go)
- [`backend/internal/service/post_service.go`](../backend/internal/service/post_service.go)

接口：

```text
GET /api/v1/posts/:id
```

代码链路：

```text
PostController.Detail
  -> PostService.Detail
     -> PostCache.Get(post:detail:{id})
     -> miss 时 PostRepository.FindPublishedByID
     -> vo.NewPost
     -> PostCache.Set
     -> response.Success
```

为什么缓存 VO 而不是 Model：

```text
VO 是接口真正要返回的数据形状。
Model 里有数据库字段、软删除字段、内部结构，不应该直接变成缓存契约。
```

失效时机：

| 操作 | 为什么删除 `post:detail:{post_id}` |
|---|---|
| 点赞/取消点赞 | `like_count` 变化 |
| 收藏/取消收藏 | `collect_count` 变化 |
| 发布/删除评论 | `comment_count` 变化 |
| 删除帖子 | 可见性变化，不能继续命中旧详情 |

## 模块 2：用户公开资料缓存

核心文件：

- [`backend/internal/cache/user_cache.go`](../backend/internal/cache/user_cache.go)
- [`backend/internal/service/user_service.go`](../backend/internal/service/user_service.go)

接口：

```text
GET /api/v1/users/:id
```

缓存内容：

```text
vo.PublicUser
```

为什么不能缓存完整 User：

```text
公开主页不应该返回 email、role、status、password_hash 等字段。
缓存是性能优化，不能改变接口边界，也不能扩大数据暴露范围。
```

失效时机：

| 操作 | 影响字段 |
|---|---|
| 关注/取消关注 | `follower_count`、`following_count` |
| 发布帖子 | `post_count` |
| 删除帖子 | `post_count` |

## 模块 3：热门帖子排行榜

核心文件：

- [`backend/internal/cache/hot_post_cache.go`](../backend/internal/cache/hot_post_cache.go)
- [`backend/internal/service/hot_score.go`](../backend/internal/service/hot_score.go)
- [`backend/internal/service/post_service.go`](../backend/internal/service/post_service.go)

接口：

```text
GET /api/v1/posts/hot?limit=10
```

为什么用 ZSet：

```text
热门榜是“成员 + 分数 + Top N”问题。
Redis ZSet 正好提供 member、score 和按分数倒序取前 N 的能力。
```

当前热度分：

```text
hot_score = like_count * 3 + collect_count * 5 + comment_count * 4
```

这个公式的意义：

| 行为 | 权重 | 解释 |
|---|---:|---|
| 点赞 | 3 | 轻量认可 |
| 评论 | 4 | 互动更强 |
| 收藏 | 5 | 长期兴趣更强 |

局限：

```text
当前没有时间衰减和浏览量权重。
老帖子可能长期占榜，后续可以加入发布时间衰减或 view_count。
```

## 模块 4：Feed 游标分页

核心文件：

- [`backend/internal/service/post_service.go`](../backend/internal/service/post_service.go)
- [`backend/internal/repository/post_repository.go`](../backend/internal/repository/post_repository.go)

接口：

```text
GET /api/v1/feed/posts?cursor=&limit=10
```

为什么不用 page/page_size：

```text
普通分页越翻越深，offset 越大，数据库跳过的记录越多。
同时 Feed 中不断有新内容插入，用页码翻页容易重复或漏数据。
```

游标由什么组成：

```text
created_at + id
```

原因：

```text
created_at 负责时间顺序。
id 负责相同时间下的稳定兜底排序。
cursor 必须和 ORDER BY 字段保持一致。
```

这个模块不新增 Redis Key。它优化的是查询方式，而不是缓存。

## 模块 5：浏览量 Redis 计数

核心文件：

- [`backend/internal/cache/post_view_cache.go`](../backend/internal/cache/post_view_cache.go)
- [`backend/internal/service/post_service.go`](../backend/internal/service/post_service.go)
- [`backend/internal/repository/post_repository.go`](../backend/internal/repository/post_repository.go)

为什么浏览量不每次写 MySQL：

```text
热门帖子详情访问频繁。
如果每次访问都 UPDATE posts SET view_count = view_count + 1，会形成热点写。
浏览量允许最终一致，所以适合先用 Redis INCR 承接增量。
```

链路：

```text
GET /api/v1/posts/:id
  -> PostService.Detail
  -> applyViewCount
  -> PostViewCache.Increment(post:view_count:{id})
  -> 响应 view_count = MySQL view_count + Redis 增量
  -> 达到阈值后 Take + IncrementViewCount 批量落库
```

取舍：

```text
浏览量适合最终一致。
余额、库存、支付这类强一致字段不能照搬这个方案。
```

## 模块 6：评论列表缓存

核心文件：

- [`backend/internal/cache/comment_cache.go`](../backend/internal/cache/comment_cache.go)
- [`backend/internal/service/comment_service.go`](../backend/internal/service/comment_service.go)
- [`backend/internal/service/comment_like_service.go`](../backend/internal/service/comment_like_service.go)

接口：

```text
GET /api/v1/posts/:id/comments?page=1&page_size=10
GET /api/v1/comments/:id/replies?page=1&page_size=10
```

为什么 Key 要带分页参数：

```text
page=1&page_size=10 和 page=2&page_size=10 返回的数据不同。
如果 Key 不带分页参数，不同页面会互相污染。
```

失效时机：

| 操作 | 删除哪个缓存 |
|---|---|
| 发布一级评论 | `post:comments:{post_id}:page:*` |
| 发布二级回复 | `comment:replies:{parent_id}:page:*` |
| 删除一级评论 | 一级评论列表 + 该评论回复列表 |
| 删除二级回复 | 对应回复列表 |
| 评论点赞/取消点赞 | 评论所在列表，因为 `like_count` 变化 |

当前使用 `SCAN + DEL` 删除相关分页 Key。这是 V3 的简单实现，后续可以演进为版本号 Key。

## 模块 7：缓存观测接口

核心文件：

- [`backend/internal/controller/cache_controller.go`](../backend/internal/controller/cache_controller.go)
- [`backend/internal/service/cache_service.go`](../backend/internal/service/cache_service.go)
- [`backend/internal/vo/cache.go`](../backend/internal/vo/cache.go)

接口：

```text
GET /api/v1/cache/posts/:id/status?page=1&page_size=10
```

为什么需要它：

```text
缓存不是写完就结束。
你需要证明 Key 是否存在、TTL 是否正确、浏览量增量是否在变、热门榜是否有分数。
```

为什么需要登录：

```text
Redis Key 属于系统内部实现细节。
诊断接口不能公开给所有人。
```

为什么不返回缓存正文：

```text
观测接口只用于排障。
返回正文可能绕过业务接口的数据边界。
```

## 模块 8：空值缓存防穿透

核心文件：

- [`backend/internal/cache/post_cache.go`](../backend/internal/cache/post_cache.go)
- [`backend/internal/cache/user_cache.go`](../backend/internal/cache/user_cache.go)
- [`backend/internal/service/post_service.go`](../backend/internal/service/post_service.go)
- [`backend/internal/service/user_service.go`](../backend/internal/service/user_service.go)

什么是缓存穿透：

```text
请求访问一个不存在的数据。
Redis 没有缓存，MySQL 也查不到。
如果大量请求持续访问这种不存在 ID，就会不断打到 MySQL。
```

当前处理：

```text
post:detail:null:{post_id}
user:profile:null:{user_id}
```

请求链路：

```text
先查正常缓存
  -> 正常缓存 miss
  -> 查空值缓存
  -> 空值缓存 hit 直接返回 404
  -> 空值缓存 miss 再查 MySQL
  -> MySQL 确认不存在后写入短 TTL 空值缓存
```

为什么 TTL 只有 60 秒：

```text
空值缓存是保护，不是永久判定。
TTL 太长可能挡住未来刚创建的数据。
```

## 模块 9：登录限流

核心文件：

- [`backend/internal/middleware/rate_limit.go`](../backend/internal/middleware/rate_limit.go)
- [`backend/internal/router/router.go`](../backend/internal/router/router.go)

接口：

```text
POST /api/v1/auth/login
```

为什么做限流：

```text
登录接口是敏感入口。
攻击者可能高频尝试邮箱和密码组合。
限流能降低暴力破解和撞库风险。
```

当前实现：

```text
rate_limit:login:{ip}
INCR
第一次设置 EXPIRE
超过阈值返回 HTTP 429 / code 42900
```

为什么做成中间件：

```text
限流是横切逻辑。
它应该在 Controller 前拦截，而不是写进登录业务代码里。
```

Redis 故障时当前选择降级放行：

```text
V3 更偏向保证本地展示和主流程可用。
生产环境可以根据安全要求改成 Redis 失败时拒绝登录。
```

## Cache Aside 模式总结

V3 多数缓存遵循 Cache Aside：

```text
读请求：
  先查 Redis
  命中直接返回
  未命中查 MySQL
  MySQL 有数据则写 Redis
  MySQL 无数据则按需要写空值缓存

写请求：
  先写 MySQL
  成功后删除相关 Redis Key
  下次读请求再回源并重建缓存
```

为什么写后删除，而不是写后更新：

```text
删除更简单，不容易漏字段。
下一次读自然重建缓存。
对 V3 当前规模来说，删除缓存比维护所有缓存对象同步更新更稳妥。
```

## V3 面试讲法

### 30 秒版本

```text
FeedLab V3 主要是 Redis 能力建设。我给帖子详情、用户公开资料和评论列表做了 Cache Aside 缓存；用 ZSet 做热门帖子排行榜；用 Redis INCR 做浏览量增量计数和登录限流；用空值缓存解决不存在 ID 的缓存穿透；最后加了缓存观测接口，方便查看 Key 是否存在、TTL 和计数状态。MySQL 仍然是最终数据源，Redis 只是性能和稳定性增强层。
```

### 1 分钟版本

```text
V3 我没有继续堆业务功能，而是补后端项目常见的缓存和稳定性能力。高频读接口比如帖子详情、用户公开主页和评论列表，用 Cache Aside 模式先查 Redis，未命中再回源 MySQL，写操作成功后删除相关缓存。热门榜用 Redis ZSet，因为它天然支持 member + score + Top N。浏览量属于允许最终一致的高频计数，所以用 Redis INCR 先承接增量，达到阈值再批量写回 MySQL。对于不存在的帖子或用户，我加了短 TTL 空值缓存，减少恶意不存在 ID 对 MySQL 的穿透。登录接口用 Redis 固定窗口限流，降低暴力破解风险。最后我还做了缓存观测接口，能看 Key 是否存在、TTL、浏览量待落库增量和热门榜分数，方便本地演示和排障。
```

### 面试官追问：Redis 和 MySQL 谁是最终数据源？

回答：

```text
MySQL 是最终数据源。Redis 只做缓存、排行榜索引、临时计数和限流计数。写操作先保证 MySQL 成功，再删除或更新 Redis。Redis 失败时多数读缓存能力会降级，不应该改变核心业务语义。
```

### 面试官追问：如何保证缓存一致性？

回答：

```text
V3 使用写后删除缓存。比如点赞、收藏、评论会改变帖子详情里的计数字段，所以这些写操作成功后删除 post:detail:{post_id}。下一次读详情会从 MySQL 回源并重建缓存。这个策略是最终一致的，适合内容社区计数字段和公开资料。
```

### 面试官追问：为什么没有做分布式锁或布隆过滤器？

回答：

```text
V3 的目标是实习展示项目里的实用缓存能力。当前规模下，短 TTL、空值缓存、写后失效和观测接口已经能说明缓存设计思路。分布式锁和布隆过滤器可以做，但如果业务场景不强，容易变成堆技术点。后续如果遇到缓存重建并发很高或海量恶意 ID，再考虑引入。
```

## V3 仍然可以改进什么

| 方向 | 当前 V3 | 后续演进 |
|---|---|---|
| 热门榜 | 简单权重公式 | 加时间衰减、浏览量、定时重算 |
| 评论列表缓存 | SCAN 删除分页 Key | 版本号 Key 或更细粒度失效 |
| 浏览量计数 | 请求触发阈值落库 | 定时任务或异步 Worker 批量落库 |
| 登录限流 | IP 维度固定窗口 | IP + email、滑动窗口、验证码 |
| 缓存观测 | 帖子相关 Key | 扩展用户、评论、限流 Key 观测 |
| 空值缓存 | 短 TTL 哨兵值 | 高风险接口结合布隆过滤器 |

## V3 验收命令

```bash
cd /Users/zwy/Documents/Build_My_Vps-Go/backend
go test ./...
```

```bash
cd /Users/zwy/Documents/Build_My_Vps-Go/interview-quiz
npm run build
```

```bash
node -e "JSON.parse(require('fs').readFileSync('postman/FeedLab-Go-V1.postman_collection.json','utf8')); console.log('postman json ok')"
```

```bash
git diff --check
```
