# FeedLab Frontend

这是 FeedLab 的 V5 展示型前端，目标是把 Go 后端项目包装成一个更适合录屏、面试和作品集展示的内容社区界面。

## 当前能力

- `Vite + React + TypeScript`。
- `React Router` 多路由页面：
  - `/`：项目总览与 V1-V4 技术亮点。
  - `/feed`：最新 Feed、热门 Feed、游标 Feed、发帖和帖子互动。
  - `/notifications`：V4 RabbitMQ 异步通知收件箱。
  - `/profile`、`/profile/:id`：用户公开主页、关注操作和公开帖子。
  - `/lab`：服务健康状态、Token、演示路线。
- `GSAP` 动效：
  - 科幻动态背景。
  - 路由切换进入动画。
  - 页面元素 stagger 浮现。
  - 星轨和扫描线氛围动画。
- 统一 API Client：
  - 认证、当前用户、帖子、热门榜、游标 Feed。
  - 本地图片/视频上传、媒体预览、图文/视频/复合型帖子发布。
  - 点赞、收藏、评论、关注。
  - 通知列表、未读数、单条已读、全部已读。
- 演示账号入口：左侧工作台可一键登录已有演示账号。

## 为什么这样设计

- V1-V4 已经证明后端能力，V5 重点是展示体验，所以不继续堆后端功能，而是把已有能力组织成作品级页面。
- 多路由比单页长表单更适合演示：面试官可以清晰看到“总览、Feed、通知、用户、系统”几个独立场景。
- GSAP 用在氛围和进入动效上，不影响核心交互；业务状态仍由 React 管理。
- Feed 页面把 V3 的最新、热门、游标分页能力放在一个地方，方便讲 Redis ZSet 和 cursor 分页。
- 媒体发布采用“先上传文件、再发布帖子”的两步设计，前端可以先展示预览，后端只在 MySQL 中保存 URL 和元数据。
- 通知中心把 V4 RabbitMQ 的结果直接展示出来，方便讲“互动行为 -> MQ -> Worker -> notifications 表 -> API 查询”。

## 启动方式

先启动后端依赖和 API：

```bash
cd /Users/zwy/Documents/Build_My_Vps-Go
docker compose up -d mysql redis rabbitmq

cd /Users/zwy/Documents/Build_My_Vps-Go/backend
go run ./cmd/seed-demo
go run ./cmd/api
```

再启动前端：

```bash
cd /Users/zwy/Documents/Build_My_Vps-Go/frontend
npm install
npm run dev
```

浏览器打开：

```text
http://localhost:5174
```

如果 5174 被占用，可以指定端口：

```bash
npm run dev -- --port 5176
```

## 演示流程

1. 打开 `/`，介绍项目总览和 V1-V4 技术路线。
2. 确认已经执行 `go run ./cmd/seed-demo`，然后点击左侧演示账号登录，确认用户信息和服务状态更新。
3. 进入 `/feed`，切换“最新 / 热门 / 游标”，说明 V3 Feed 和 Redis 热门榜。
4. 发布一篇帖子，点击帖子卡片，执行点赞、收藏、评论。
5. 在发布器里选择图片或视频，确认出现媒体预览后发布，Feed 卡片和详情面板都能看到媒体画廊。
6. 切换另一个账号，对第一位用户的帖子做互动。
7. 回到第一位用户，进入 `/notifications`，查看 V4 异步通知。
8. 标记单条已读和全部已读，确认未读数变化。
9. 进入 `/profile/:id`，展示公开用户主页和关注关系。
10. 进入 `/lab`，展示 API、MySQL、Redis、RabbitMQ 健康状态。

## 验证命令

```bash
cd /Users/zwy/Documents/Build_My_Vps-Go/frontend
npm run build
```
