# FeedLab Frontend

这是 FeedLab 的前端演示项目，目标是把后端 V1/V2 接口串成一个可以操作的作品展示界面。

当前已完成：

- Vite + React + TypeScript 项目骨架。
- 统一 API Client，开发环境默认通过 Vite proxy 转发到 `http://localhost:8080`，避免浏览器 CORS 问题。
- 后端健康检查：`GET /healthz`。
- 注册：`POST /api/v1/auth/register`。
- 登录：`POST /api/v1/auth/login`。
- 当前用户：`GET /api/v1/users/me`。
- JWT access token 保存到 `localStorage`，退出登录时清除。
- 帖子流：`GET /api/v1/posts?page=1&page_size=10`。
- 发布帖子：`POST /api/v1/posts`。
- 帖子详情：`GET /api/v1/posts/:id`。
- 帖子点赞、取消点赞、点赞状态：`POST/DELETE/GET /api/v1/posts/:id/like(d)`。
- 帖子收藏、取消收藏、收藏状态：`POST/DELETE/GET /api/v1/posts/:id/collect(ed)`。
- 帖子评论列表：`GET /api/v1/posts/:id/comments?page=1&page_size=10`。
- 发布一级评论和二级回复：`POST /api/v1/posts/:id/comments`。
- 查看二级回复：`GET /api/v1/comments/:id/replies?page=1&page_size=10`。

## 为什么这样设计

- 前端单独放在 `frontend/`，和 `backend/` 并列，后续可以独立构建和部署。
- API 调用集中在 `src/api/client.ts`，避免每个页面重复写 `fetch`、统一响应解析和 Token Header。
- 登录态先用 `localStorage`，足够支撑本地演示；后续如果做生产级安全，可以再改成更严格的 Cookie / Refresh Token 方案。
- 模块 1 先做认证闭环，模块 2 接入帖子流和发帖，模块 3 接入帖子详情、点赞和收藏，模块 4 接入评论列表和回复；后续模块再接入评论点赞和用户主页。
- 帖子列表是公开读取接口，不需要登录；发布帖子必须携带 JWT，前端从 `localStorage` 读取 Token 后通过 `Authorization: Bearer <token>` 发送。
- 帖子详情也是公开读取接口；点赞、收藏和状态查询是当前用户维度的数据，所以必须登录并携带 JWT。
- 点赞和收藏是幂等接口，前端可以安全地让按钮重复点击；后端会通过唯一索引和事务保证计数不会重复增加或扣成负数。
- 评论列表是公开读取接口；发布一级评论和回复都必须登录，因为后端需要从 JWT 中拿到评论作者 `user_id`。
- 回复列表采用点击后懒加载：打开帖子详情时只加载一级评论，点开某条评论才请求它的二级回复，避免一次拉取过多嵌套数据。

## 启动方式

先启动后端依赖和 API：

```bash
cd /Users/zwy/Documents/Build_My_Vps-Go
docker compose up -d mysql redis

cd /Users/zwy/Documents/Build_My_Vps-Go/backend
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

如果后端地址不是 `http://localhost:8080`，复制 `.env.example` 为 `.env.local`，然后修改代理目标：

```bash
VITE_API_PROXY_TARGET=http://localhost:8080
```

只有在你明确希望浏览器直接请求某个后端地址时，才设置 `VITE_API_BASE_URL`。本地开发优先使用 proxy。

## 测试流程

1. 打开页面后确认左侧服务状态为 `api/mysql/redis = ok`。
2. 切换到“注册”，输入唯一用户名、邮箱和密码，提交。
3. 注册成功后页面自动切回“登录”，邮箱和密码会带入登录表单。
4. 点击登录，确认左侧显示当前用户信息和 Token 预览。
5. 刷新页面，确认登录态仍可从 `localStorage` 恢复。
6. 点击退出，确认 Token 和当前用户信息被清除。
7. 在“帖子流与发布”区域填写标题和正文，点击发布帖子。
8. 发布成功后确认帖子列表刷新，并且左侧当前用户的发帖数更新。
9. 点击帖子卡片的“查看详情”，确认详情区域展示作者、正文、浏览数、点赞数、收藏数和评论数。
10. 登录状态下点击“点赞”，确认按钮变为“取消点赞”，列表卡片和详情中的点赞数同步更新。
11. 再次点击“取消点赞”，确认点赞数回退且不会继续重复扣减。
12. 点击“收藏”，确认按钮变为“取消收藏”，列表卡片和详情中的收藏数同步更新。
13. 在评论区输入内容并点击“发布评论”，确认评论出现在列表顶部，帖子评论数同步增加。
14. 点击某条评论的“回复 / 查看回复”，输入回复并点击“发布回复”，确认回复出现在该评论下方。
15. 再次点击“收起回复”，确认回复区域可以折叠。
16. 退出登录后确认帖子列表、详情和评论仍可查看，但发布、点赞、收藏、评论、回复按钮不可用。

## 当前验证命令

```bash
cd /Users/zwy/Documents/Build_My_Vps-Go/frontend
npm run build
```
