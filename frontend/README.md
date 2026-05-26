# FeedLab Frontend

这是 FeedLab 的前端演示项目，目标是把后端 V1/V2 接口串成一个可以操作的作品展示界面。

当前是前端模块 1：

- Vite + React + TypeScript 项目骨架。
- 统一 API Client，开发环境默认通过 Vite proxy 转发到 `http://localhost:8080`，避免浏览器 CORS 问题。
- 后端健康检查：`GET /healthz`。
- 注册：`POST /api/v1/auth/register`。
- 登录：`POST /api/v1/auth/login`。
- 当前用户：`GET /api/v1/users/me`。
- JWT access token 保存到 `localStorage`，退出登录时清除。

## 为什么这样设计

- 前端单独放在 `frontend/`，和 `backend/` 并列，后续可以独立构建和部署。
- API 调用集中在 `src/api/client.ts`，避免每个页面重复写 `fetch`、统一响应解析和 Token Header。
- 登录态先用 `localStorage`，足够支撑本地演示；后续如果做生产级安全，可以再改成更严格的 Cookie / Refresh Token 方案。
- 模块 1 只做认证闭环，后续模块再接入帖子流、发帖、详情、点赞、收藏、评论和用户主页。

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

## 当前验证命令

```bash
cd /Users/zwy/Documents/Build_My_Vps-Go/frontend
npm run build
```
