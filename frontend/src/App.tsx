import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError, tokenStore } from "./api/client";
import type { CreatePostPayload, HealthStatus, LoginPayload, Post, RegisterPayload, User } from "./types";

type AuthMode = "login" | "register";
type Notice = { type: "success" | "error" | "info"; text: string } | null;

const defaultRegisterForm: RegisterPayload = {
  username: "",
  email: "",
  password: "secret123",
  nickname: ""
};

const defaultLoginForm: LoginPayload = {
  email: "",
  password: "secret123"
};

const defaultPostForm: CreatePostPayload = {
  title: "",
  content: "",
  cover_url: "",
  content_type: "article",
  status: "published"
};

function App() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [registerForm, setRegisterForm] = useState<RegisterPayload>(defaultRegisterForm);
  const [loginForm, setLoginForm] = useState<LoginPayload>(defaultLoginForm);
  const [token, setToken] = useState<string | null>(() => tokenStore.get());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postTotal, setPostTotal] = useState(0);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postForm, setPostForm] = useState<CreatePostPayload>(defaultPostForm);
  const [creatingPost, setCreatingPost] = useState(false);

  const tokenPreview = useMemo(() => {
    if (!token) {
      return "未登录";
    }
    return `${token.slice(0, 18)}...${token.slice(-8)}`;
  }, [token]);

  useEffect(() => {
    void checkHealth();
    void loadPosts();
  }, []);

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      return;
    }
    void loadMe(token);
  }, [token]);

  async function checkHealth() {
    setCheckingHealth(true);
    try {
      const result = await api.health();
      setHealth(result);
    } catch (error) {
      setHealth(null);
      setNotice({ type: "error", text: formatError(error, "无法连接后端，请确认 API 已启动。") });
    } finally {
      setCheckingHealth(false);
    }
  }

  async function loadMe(nextToken: string) {
    try {
      const user = await api.me(nextToken);
      setCurrentUser(user);
    } catch (error) {
      tokenStore.clear();
      setToken(null);
      setNotice({ type: "error", text: formatError(error, "登录态已失效，请重新登录。") });
    }
  }

  async function loadPosts() {
    setPostsLoading(true);
    try {
      const result = await api.listPosts(1, 10);
      setPosts(result.items);
      setPostTotal(result.total);
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "帖子流加载失败。") });
    } finally {
      setPostsLoading(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setNotice(null);

    try {
      const nickname = registerForm.nickname.trim() || registerForm.username.trim();
      const user = await api.register({ ...registerForm, nickname });
      setLoginForm({ email: registerForm.email, password: registerForm.password });
      setMode("login");
      setNotice({ type: "success", text: `注册成功：${user.username}。现在可以直接登录。` });
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "注册失败。") });
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setNotice(null);

    try {
      const result = await api.login(loginForm);
      tokenStore.set(result.access_token);
      setToken(result.access_token);
      setCurrentUser(result.user);
      setNotice({ type: "success", text: `欢迎回来，${result.user.nickname || result.user.username}。` });
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "登录失败。") });
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    tokenStore.clear();
    setToken(null);
    setCurrentUser(null);
    setNotice({ type: "info", text: "已退出登录，本地 Token 已清除。" });
  }

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setNotice({ type: "error", text: "请先登录，再发布帖子。" });
      return;
    }

    setCreatingPost(true);
    setNotice(null);
    try {
      const created = await api.createPost(postForm, token);
      setPostForm(defaultPostForm);
      setNotice({ type: "success", text: `帖子发布成功：${created.title}` });
      await loadPosts();
      await loadMe(token);
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "发布帖子失败。") });
    } finally {
      setCreatingPost(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="status-panel">
          <div className="brand-block">
            <span className="brand-mark">FL</span>
            <div>
              <p className="eyebrow">FeedLab Console</p>
              <h1>认证工作台</h1>
            </div>
          </div>

          <div className="status-grid">
            <div>
              <span>API</span>
              <strong>{api.baseURL}</strong>
            </div>
            <div>
              <span>Token</span>
              <strong>{tokenPreview}</strong>
            </div>
          </div>

          <div className="health-block">
            <div className="section-title">
              <h2>服务状态</h2>
              <button className="icon-button" type="button" onClick={checkHealth} disabled={checkingHealth} title="刷新服务状态">
                {checkingHealth ? "..." : "↻"}
              </button>
            </div>
            <div className="health-list">
              <HealthItem label="API" value={health?.api} />
              <HealthItem label="MySQL" value={health?.mysql} />
              <HealthItem label="Redis" value={health?.redis} />
            </div>
          </div>

          <div className="current-user">
            <div className="section-title">
              <h2>当前用户</h2>
              {token && (
                <button className="text-button" type="button" onClick={handleLogout}>
                  退出
                </button>
              )}
            </div>
            {currentUser ? (
              <div className="user-summary">
                <div className="avatar">{initials(currentUser)}</div>
                <div>
                  <strong>{currentUser.nickname || currentUser.username}</strong>
                  <span>@{currentUser.username}</span>
                </div>
                <dl>
                  <div>
                    <dt>用户 ID</dt>
                    <dd>{currentUser.id}</dd>
                  </div>
                  <div>
                    <dt>发帖</dt>
                    <dd>{currentUser.post_count}</dd>
                  </div>
                  <div>
                    <dt>粉丝</dt>
                    <dd>{currentUser.follower_count}</dd>
                  </div>
                  <div>
                    <dt>关注</dt>
                    <dd>{currentUser.following_count}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="empty-text">登录后这里会显示 `/api/v1/users/me` 返回的用户信息。</p>
            )}
          </div>
        </aside>

        <section className="main-stack">
          <section className="auth-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Module 1</p>
                <h2>注册与登录</h2>
              </div>
              <div className="segmented">
                <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
                  登录
                </button>
                <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>
                  注册
                </button>
              </div>
            </div>

            {notice && <p className={`notice ${notice.type}`}>{notice.text}</p>}

            {mode === "login" ? (
              <form className="form-stack" onSubmit={handleLogin}>
                <label>
                  <span>邮箱</span>
                  <input
                    type="email"
                    value={loginForm.email}
                    placeholder="alice@example.com"
                    onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                    required
                  />
                </label>
                <label>
                  <span>密码</span>
                  <input
                    type="password"
                    value={loginForm.password}
                    minLength={6}
                    onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                    required
                  />
                </label>
                <button className="primary-button" type="submit" disabled={loading}>
                  {loading ? "登录中..." : "登录并保存 Token"}
                </button>
              </form>
            ) : (
              <form className="form-stack" onSubmit={handleRegister}>
                <div className="form-row">
                  <label>
                    <span>用户名</span>
                    <input
                      value={registerForm.username}
                      minLength={3}
                      maxLength={50}
                      placeholder="alice"
                      onChange={(event) => setRegisterForm({ ...registerForm, username: event.target.value })}
                      required
                    />
                  </label>
                  <label>
                    <span>昵称</span>
                    <input
                      value={registerForm.nickname}
                      maxLength={50}
                      placeholder="Alice"
                      onChange={(event) => setRegisterForm({ ...registerForm, nickname: event.target.value })}
                    />
                  </label>
                </div>
                <label>
                  <span>邮箱</span>
                  <input
                    type="email"
                    value={registerForm.email}
                    placeholder="alice@example.com"
                    onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
                    required
                  />
                </label>
                <label>
                  <span>密码</span>
                  <input
                    type="password"
                    value={registerForm.password}
                    minLength={6}
                    maxLength={72}
                    onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                    required
                  />
                </label>
                <button className="primary-button" type="submit" disabled={loading}>
                  {loading ? "注册中..." : "创建账号"}
                </button>
              </form>
            )}
          </section>

          <section className="posts-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Module 2</p>
                <h2>帖子流与发布</h2>
              </div>
              <button className="text-button" type="button" onClick={loadPosts} disabled={postsLoading}>
                {postsLoading ? "刷新中" : "刷新"}
              </button>
            </div>

            <form className="post-form" onSubmit={handleCreatePost}>
              <div className="form-row">
                <label>
                  <span>标题</span>
                  <input
                    value={postForm.title}
                    maxLength={120}
                    placeholder="写一篇 FeedLab 帖子"
                    onChange={(event) => setPostForm({ ...postForm, title: event.target.value })}
                    required
                  />
                </label>
                <label className="status-field">
                  <span>状态</span>
                  <select
                    value={postForm.status}
                    onChange={(event) => setPostForm({ ...postForm, status: event.target.value as CreatePostPayload["status"] })}
                  >
                    <option value="published">发布</option>
                    <option value="draft">草稿</option>
                  </select>
                </label>
              </div>
              <label>
                <span>正文</span>
                <textarea
                  value={postForm.content}
                  minLength={1}
                  placeholder={token ? "分享一点你正在构建的东西。" : "登录后可以发布帖子。"}
                  onChange={(event) => setPostForm({ ...postForm, content: event.target.value })}
                  required
                />
              </label>
              <button className="primary-button" type="submit" disabled={creatingPost || !token}>
                {creatingPost ? "发布中..." : token ? "发布帖子" : "请先登录"}
              </button>
            </form>

            <div className="feed-header">
              <h3>公开帖子</h3>
              <span>{postTotal} 篇</span>
            </div>

            {postsLoading ? (
              <p className="empty-text">正在加载帖子流...</p>
            ) : posts.length > 0 ? (
              <div className="post-list">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <p className="empty-text">还没有公开帖子。登录后发布第一篇吧。</p>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}

function HealthItem({ label, value }: { label: string; value?: string }) {
  const ok = value === "ok";
  return (
    <div className="health-item">
      <span className={ok ? "dot ok" : "dot"} />
      <span>{label}</span>
      <strong>{value ?? "unknown"}</strong>
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <article className="post-card">
      <div className="post-card-header">
        <div>
          <span className="post-author">@{post.author.username}</span>
          <h3>{post.title}</h3>
        </div>
        <span className="post-id">#{post.id}</span>
      </div>
      <p>{post.content}</p>
      <div className="post-meta">
        <span>{formatDate(post.created_at)}</span>
        <span>{post.like_count} 赞</span>
        <span>{post.collect_count} 收藏</span>
        <span>{post.comment_count} 评论</span>
      </div>
    </article>
  );
}

function initials(user: User) {
  const source = user.nickname || user.username;
  return source.slice(0, 2).toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return `${fallback} ${error.message}${error.code ? `（code ${error.code}）` : ""}`;
  }
  if (error instanceof Error) {
    return `${fallback} ${error.message}`;
  }
  return fallback;
}

export default App;
