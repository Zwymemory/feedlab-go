# FeedLab VPS 部署指南

这份文档用于把 FeedLab 部署到你的 DMIT 洛杉矶 VPS。当前方案优先保证“面试官/HR 可以直接访问演示页面”，先使用 HTTP + 服务器 IP；如果后续绑定域名，再升级 HTTPS。

## 部署架构

```text
Browser
  |
  | http://服务器IP
  v
feedlab-web / Caddy :80
  |-- 静态前端：React dist
  |-- /api/*      -> feedlab-api:8080
  |-- /healthz    -> feedlab-api:8080
  |-- /swagger*   -> feedlab-api:8080
  |-- /uploads/*  -> feedlab-api:8080

Docker internal network
  |-- feedlab-api
  |-- mysql
  |-- redis
  |-- rabbitmq
```

公网只开放 `80`。MySQL、Redis、RabbitMQ 不暴露到公网，降低被扫描和爆破的风险。

## 本地准备

先确认当前分支已经推送到 GitHub：

```bash
git status
git push origin codex/v5-showcase-feed
```

如果你要部署 `main`，先把当前分支合并到 `main` 后再部署。

## 服务器初始化

SSH 登录服务器：

```bash
ssh root@154.17.20.90
```

安装 Docker 和 Git。以下命令适用于 Ubuntu/Debian：

```bash
apt update
apt install -y ca-certificates curl git ufw
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo ${UBUNTU_CODENAME:-$VERSION_CODENAME}) stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

防火墙只放行 SSH 和 HTTP：

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw --force enable
ufw status
```

## 拉取项目

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/Zwymemory/feedlab-go.git
cd feedlab-go
git checkout codex/v5-showcase-feed
```

## 配置生产环境变量

复制模板：

```bash
cd /opt/feedlab-go/deploy
cp .env.production.example .env
```

编辑 `.env`：

```bash
nano .env
```

建议至少修改：

```text
MYSQL_ROOT_PASSWORD=随机长密码
FEEDLAB_MYSQL_PASSWORD=随机长密码
RABBITMQ_DEFAULT_PASS=随机长密码
FEEDLAB_JWT_SECRET=随机长字符串
```

可以用下面命令生成随机值。这里用 `hex`，是为了避免 RabbitMQ URL 里出现 `/`、`+`、`@` 这类需要转义的特殊字符：

```bash
openssl rand -hex 24
```

## 启动服务

```bash
cd /opt/feedlab-go/deploy
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

查看容器：

```bash
docker compose -f docker-compose.prod.yml --env-file .env ps
```

查看后端日志：

```bash
docker logs -f feedlab-api
```

## 初始化演示数据

首次部署后运行 seed：

```bash
docker exec feedlab-api /app/seed-demo
```

这会创建演示账号、帖子、互动、热门榜和通知数据。

演示账号：

| 用户 | 邮箱 | 密码 |
|---|---|---|
| Alice | `alice@example.com` | `secret123` |
| Mer_src | `mer@example.com` | `secret123` |
| V4 Demo | `v4demo@example.com` | `secret123` |

## 访问地址

前端展示页：

```text
http://154.17.20.90/
```

健康检查：

```text
http://154.17.20.90/healthz
```

Swagger：

```text
http://154.17.20.90/swagger/index.html
```

## 更新部署

本地提交并推送后，在服务器执行：

```bash
cd /opt/feedlab-go
git pull
cd deploy
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

如果只改了前端，也可以照样执行上面的命令，Docker 会复用缓存。

## 上传文件持久化

媒体文件保存在 Docker volume：

```text
uploads_data -> /app/uploads
```

容器重建不会丢失上传文件。不要手动删除 `uploads_data`，否则图片和视频会失效。

## 服务器容量提醒

你的 VPS 是 20GB SSD，建议：

```bash
docker system df
docker image prune -f
```

不要频繁保存大视频。当前上传限制是图片 5MB、视频 50MB，演示时建议只上传小视频。

## 后续绑定域名和 HTTPS

如果你后续买域名：

1. 把域名 A 记录指向 `154.17.20.90`。
2. 把 `deploy/Caddyfile` 第一行从 `:80` 改成你的域名，例如：

```text
feedlab.example.com {
```

3. 重新部署：

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Caddy 会自动申请 HTTPS 证书。
