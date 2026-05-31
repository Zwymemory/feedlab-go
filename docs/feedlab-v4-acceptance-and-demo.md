# FeedLab V4 验收与演示脚本

这份文档用于证明 V4 RabbitMQ 异步通知链路真的生效，也可以作为录屏或面试演示时的讲解提纲。

## 验收目标

V4 要证明的不是“多了几个接口”，而是这条异步链路完整可用：

```text
用户互动接口
  -> Service 完成 MySQL 事务
  -> 发布 NotificationEvent 到 RabbitMQ
  -> notification.queue
  -> NotificationConsumer 消费
  -> notifications 表落库
  -> 当前用户通过通知 API 查询和标记已读
```

验收时至少要看到：

- `/healthz` 返回 `rabbitmq: ok`。
- `notification.queue` 在 RabbitMQ 管理台存在，且 durable 为 true。
- 点赞、评论、关注后，接收者的通知列表出现对应通知。
- 未读数会增加，标记已读后未读数变为 0。
- 重复消息不会产生重复通知，原因是 `notifications.message_id` 唯一索引。

## 启动依赖

```bash
docker compose up -d mysql redis rabbitmq
```

RabbitMQ 管理台：

```text
http://localhost:15672
账号：feedlab
密码：feedlab_pass
```

启动 API：

```bash
cd /Users/zwy/Documents/Build_My_Vps-Go/backend
go run ./cmd/api
```

如果 8080 已被占用，可以临时复制一份配置，把 `server.addr` 改成 `:18080` 后启动：

```bash
cp config.yaml /tmp/feedlab-v4-check.yaml
perl -0pi -e 's/addr: ":8080"/addr: ":18080"/' /tmp/feedlab-v4-check.yaml
FEEDLAB_CONFIG=/tmp/feedlab-v4-check.yaml go run ./cmd/api
```

## 第一步：健康检查

```bash
curl http://127.0.0.1:8080/healthz
```

预期：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "api": "ok",
    "mysql": "ok",
    "redis": "ok",
    "rabbitmq": "ok"
  }
}
```

这一项证明 API 已成功连接 RabbitMQ。V4 以后，如果 `rabbitmq.enabled = true`，RabbitMQ 不可用时 API 会启动失败，因为异步通知是 V4 的核心依赖。

## 第二步：RabbitMQ 管理台检查

打开：

```text
http://localhost:15672/#/queues
```

检查 `notification.queue`：

| 项目 | 预期 |
|---|---|
| Name | `notification.queue` |
| Durable | true |
| Consumers | 大于等于 1 |
| Ready | 通常为 0 |
| Unacked | 通常为 0 |

`Ready = 0` 不是失败。它通常说明消息已经被 consumer 很快消费并写入 MySQL。

也可以用命令检查：

```bash
curl -u feedlab:feedlab_pass \
  http://127.0.0.1:15672/api/queues/%2F/notification.queue
```

关注字段：

- `durable: true`
- `messages`
- `consumers`

## 第三步：Postman 验收流程

打开 `postman/FeedLab-Go-V1.postman_collection.json`。

建议执行：

1. 注册作者用户，登录并保存作者 `access_token`。
2. 注册互动用户，登录并保存互动用户 `access_token`。
3. 作者发布一篇 `published` 帖子，保存 `post_id`。
4. 互动用户点赞作者帖子。
5. 互动用户评论作者帖子。
6. 互动用户关注作者。
7. 作者调用 `GET /api/v1/notifications`。
8. 作者调用 `GET /api/v1/notifications/unread-count`。
9. 作者调用 `PATCH /api/v1/notifications/:id/read`。
10. 作者调用 `PATCH /api/v1/notifications/read-all`。
11. 再次查询未读数。

预期通知类型至少包含：

```text
post_like
comment
follow
```

如果使用已有用户和帖子，重复点赞或重复关注可能不会再次产生通知，这是正确的幂等行为。想重复演示，建议新建用户和帖子。

## 第四步：curl 一键验收脚本

下面脚本会创建两个新用户、发帖、点赞、评论、关注，并查询通知。

如果 API 运行在 8080：

```bash
BASE="http://127.0.0.1:8080"
```

如果 API 运行在 18080：

```bash
BASE="http://127.0.0.1:18080"
```

核心流程：

```bash
TS="$(date +%s)"
AUTHOR_EMAIL="v4_author_${TS}@example.com"
ACTOR_EMAIL="v4_actor_${TS}@example.com"

curl -sS -X POST "$BASE/api/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"v4_author_${TS}\",\"email\":\"${AUTHOR_EMAIL}\",\"password\":\"secret123\",\"nickname\":\"V4 Author\"}"

curl -sS -X POST "$BASE/api/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"v4_actor_${TS}\",\"email\":\"${ACTOR_EMAIL}\",\"password\":\"secret123\",\"nickname\":\"V4 Actor\"}"

AUTHOR_LOGIN=$(curl -sS -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${AUTHOR_EMAIL}\",\"password\":\"secret123\"}")

ACTOR_LOGIN=$(curl -sS -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${ACTOR_EMAIL}\",\"password\":\"secret123\"}")

AUTHOR_TOKEN=$(printf '%s' "$AUTHOR_LOGIN" | jq -r '.data.access_token')
AUTHOR_ID=$(printf '%s' "$AUTHOR_LOGIN" | jq -r '.data.user.id')
ACTOR_TOKEN=$(printf '%s' "$ACTOR_LOGIN" | jq -r '.data.access_token')

POST_RES=$(curl -sS -X POST "$BASE/api/v1/posts" \
  -H "Authorization: Bearer ${AUTHOR_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"V4 RabbitMQ 验收 ${TS}\",\"content\":\"这篇帖子用于验证异步通知链路。\",\"status\":\"published\"}")

POST_ID=$(printf '%s' "$POST_RES" | jq -r '.data.id')

curl -sS -X POST "$BASE/api/v1/posts/${POST_ID}/like" \
  -H "Authorization: Bearer ${ACTOR_TOKEN}"

curl -sS -X POST "$BASE/api/v1/posts/${POST_ID}/comments" \
  -H "Authorization: Bearer ${ACTOR_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"content":"V4 通知验收评论","parent_id":0}'

curl -sS -X POST "$BASE/api/v1/users/${AUTHOR_ID}/follow" \
  -H "Authorization: Bearer ${ACTOR_TOKEN}"

sleep 1

curl -sS "$BASE/api/v1/notifications?page=1&page_size=10" \
  -H "Authorization: Bearer ${AUTHOR_TOKEN}" | jq '.data.items[].type'

curl -sS "$BASE/api/v1/notifications/unread-count" \
  -H "Authorization: Bearer ${AUTHOR_TOKEN}" | jq '.data'
```

预期输出包含：

```text
"follow"
"comment"
"post_like"
```

未读数预期为 `3`。

## 本次本地验收记录

本次验收使用备用端口 `18080`，结果如下：

```json
{
  "author_id": "7",
  "actor_id": "8",
  "post_id": "8",
  "comment_id": "9",
  "notification_types": [
    "follow",
    "comment",
    "post_like"
  ],
  "unread_before": 3,
  "mark_one": {
    "read": true
  },
  "mark_all": {
    "read": true
  },
  "unread_after": 0,
  "queue": {
    "name": "notification.queue",
    "durable": true,
    "messages": 0,
    "consumers": 2
  }
}
```

`consumers = 2` 是因为本机当时有两个 API 进程连接了同一个队列。正式演示时通常只有一个 consumer。

## 面试讲解模板

可以这样讲：

> V4 我引入 RabbitMQ 做异步站内通知。以点赞为例，点赞接口先在 Service 层完成 MySQL 事务，写入点赞关系并维护 like_count。事务成功后，Service 发布一个 NotificationEvent 到 RabbitMQ 的 notification.queue。API 启动时会同时启动一个 notification consumer，它消费消息并写入 notifications 表。因为 RabbitMQ 可能重复投递，所以我给通知事件设计了 message_id，并在 notifications 表上加唯一索引，Repository 插入时使用 OnConflict DoNothing，保证消费端幂等。这样主业务接口不会被通知落库拖慢，同时通知系统也具备基础可靠性。

如果面试官追问“为什么不直接在点赞事务里写通知”，可以回答：

> 直接写也能做，但通知属于副作用。后续如果通知扩展成 WebSocket、邮件、App Push，放在主事务里会让点赞接口越来越慢，也会让通知失败影响点赞成功。当前版本用 MQ 解耦主流程和副作用，MySQL 仍然保存最终通知数据。

如果面试官追问“RabbitMQ 怎么保证消息不丢”，可以回答：

> 当前 V4 做了基础可靠性：durable queue、persistent message、manual ack、消费端幂等。生产级还可以继续做 outbox 表、死信队列、重试次数、监控告警。这个项目里我先实现了适合实习展示的核心链路。
