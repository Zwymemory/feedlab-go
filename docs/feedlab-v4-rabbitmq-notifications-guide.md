# FeedLab V4 RabbitMQ 异步通知导读

V4 的目标不是继续增加普通 CRUD，而是展示真实后端项目里常见的异步化能力：用户发生互动时，主业务接口先完成自己的事务，然后把通知消息投递到 RabbitMQ，由 Worker 消费后写入通知表。

## V4 模块边界

本版本完成两组能力：

- RabbitMQ 基础设施：`docker-compose.yml`、`config.yaml`、`db/rabbitmq.go`、MQ producer/consumer。
- 站内通知闭环：`notifications` 表、Repository、Service、Controller、Swagger、Postman 和面试题。

V4 暂不做 WebSocket 实时推送。原因是当前项目更适合作为 Go 后端实习展示，先把“异步事件 -> MQ -> Worker -> DB -> API 查询”的链路讲清楚，比过早加入长连接更稳。

## 调用链

以“用户点赞帖子”为例：

```text
POST /api/v1/posts/:id/like
  -> LikeController.LikePost
  -> LikeService.LikePost
  -> MySQL transaction:
       post_likes 插入关系
       posts.like_count + 1
  -> 删除帖子详情缓存
  -> 刷新热门榜
  -> PublishNotification(post_like event)
  -> RabbitMQ notification.queue
  -> NotificationConsumer
  -> NotificationService.CreateFromEvent
  -> NotificationRepository.Create
  -> notifications 表
```

关键点：通知投递发生在主业务事务之后。这样点赞关系和计数是核心结果，通知是异步副作用。

## 主要文件

### 配置与启动

- `backend/config.yaml`
  - 新增 `rabbitmq.enabled`、`rabbitmq.url`、`rabbitmq.notification_queue`。
- `backend/internal/config/config.go`
  - 读取 RabbitMQ 配置，并提供默认值。
- `backend/internal/db/rabbitmq.go`
  - 使用 `amqp091-go` 建立 RabbitMQ 连接。
- `backend/cmd/api/main.go`
  - 启动时连接 RabbitMQ。
  - 创建 `NotificationConsumer` 并监听 `notification.queue`。
  - 关闭服务时取消 consumer context。

### MQ 层

- `backend/internal/event/notification.go`
  - 定义 `NotificationEvent` 消息结构。
  - 定义 `NotificationPublisher` 接口。
  - 提供 `NoopNotificationPublisher`，方便 RabbitMQ 关闭时保持服务层可测试。
- `backend/internal/mq/notification_publisher.go`
  - 把通知事件 JSON 序列化后发布到 `notification.queue`。
  - 队列 durable，消息 persistent。
- `backend/internal/mq/notification_consumer.go`
  - 消费 `notification.queue`。
  - JSON 解析失败直接丢弃。
  - 落库失败时 `Nack(requeue=true)`，让消息后续重试。

### 通知业务层

- `backend/internal/model/notification.go`
  - `Notification` GORM 模型。
  - `message_id` 唯一索引用于消费端幂等。
- `backend/internal/repository/notification_repository.go`
  - `Create` 使用 `OnConflict DoNothing`，重复消息不会重复插入。
  - `ListByUser` 查询通知列表并预加载 actor 用户信息。
  - `UnreadCount` 查询未读数。
  - `MarkRead`、`MarkAllRead` 维护已读状态。
- `backend/internal/service/notification_service.go`
  - `CreateFromEvent` 把 MQ 事件转换为通知模型。
  - 跳过自己给自己的通知。
- `backend/internal/controller/notification_controller.go`
  - 暴露通知列表、未读数、单条已读、全部已读接口。

### 事件生产点

- `backend/internal/service/like_service.go`
  - 首次点赞成功后投递 `post_like`。
  - 重复点赞不投递通知，因为接口是幂等的。
- `backend/internal/service/collect_service.go`
  - 首次收藏成功后投递 `post_collect`。
- `backend/internal/service/comment_service.go`
  - 一级评论投递 `comment` 给帖子作者。
  - 二级回复投递 `reply` 给被回复评论作者。
- `backend/internal/service/comment_like_service.go`
  - 首次点赞评论后投递 `comment_like`。
- `backend/internal/service/follow_service.go`
  - 首次关注成功后投递 `follow`。
- `backend/internal/service/notification_events.go`
  - 集中构建事件，保持各业务 Service 不直接拼复杂 JSON。

## 为什么需要 message_id

RabbitMQ 的消费者可能因为网络抖动、进程重启或手动重投递而重复收到消息。如果每次收到都插入一条通知，用户会看到重复通知。

V4 的做法：

```text
message_id = 事件类型 + 主体 ID + actor ID
notifications.message_id 唯一索引
INSERT ON CONFLICT DO NOTHING
```

这就是消费端幂等。

## 为什么不把通知写入和点赞事务放一起

如果点赞事务里直接写通知，流程更简单，但缺点是：

- 通知写入失败可能导致点赞失败。
- 后续如果要发邮件、WebSocket、App Push，会让点赞接口越来越慢。
- 通知属于副作用，更适合异步处理。

所以 V4 采用“主业务事务成功后投递 MQ”的设计。

## 面试表达模板

可以这样回答：

> V4 我把互动通知从主业务里拆成了异步链路。点赞、评论、关注等接口先完成自己的 MySQL 事务和缓存失效，然后投递一个 `NotificationEvent` 到 RabbitMQ 的 `notification.queue`。Worker 消费消息后写入 `notifications` 表。为了处理 MQ 至少一次投递可能带来的重复消费，我给通知表加了 `message_id` 唯一索引，并在插入时使用冲突忽略，这样同一条消息重复消费也不会产生重复通知。

## 手动验证

启动依赖：

```bash
docker compose up -d mysql redis rabbitmq
```

启动服务：

```bash
cd backend
go run ./cmd/api
```

检查：

```bash
curl http://localhost:8080/healthz
```

预期：

```json
{
  "api": "ok",
  "mysql": "ok",
  "redis": "ok",
  "rabbitmq": "ok"
}
```

然后用 Postman 执行 `Module 23 - V4 RabbitMQ Notifications`。
