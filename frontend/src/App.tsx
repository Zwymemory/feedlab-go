import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import gsap from "gsap";
import { api, ApiError, tokenStore } from "./api/client";
import type {
  CreatePostPayload,
  HealthStatus,
  LoginPayload,
  NotificationItem,
  Post,
  PublicUser,
  User
} from "./types";

type FeedMode = "latest" | "hot" | "cursor";
type Notice = { type: "success" | "error" | "info"; text: string } | null;

const demoAccounts = [
  { label: "Alice 作者", email: "alice@example.com", password: "secret123" },
  { label: "Mer_src 互动号", email: "mer@example.com", password: "secret123" },
  { label: "V4 演示账号", email: "v4demo@example.com", password: "secret123" }
];

const navItems = [
  { to: "/", label: "星舰总览" },
  { to: "/feed", label: "Feed 流" },
  { to: "/notifications", label: "通知中心" },
  { to: "/profile", label: "用户宇航图" },
  { to: "/lab", label: "系统驾驶舱" }
];

const versionCards = [
  { tag: "V1", title: "基础闭环", text: "注册登录、JWT、发帖、软删除、Swagger。", tone: "cyan" },
  { tag: "V2", title: "互动系统", text: "点赞、收藏、评论、关注、公开主页。", tone: "violet" },
  { tag: "V3", title: "Redis 加速", text: "缓存、热门榜、游标分页、浏览量、限流。", tone: "amber" },
  { tag: "V4", title: "异步通知", text: "RabbitMQ 生产者、消费者、通知收件箱。", tone: "green" }
];

const emptyPostForm: CreatePostPayload = {
  title: "",
  content: "",
  cover_url: "",
  content_type: "article",
  status: "published"
};

function App() {
  const [token, setToken] = useState<string | null>(() => tokenStore.get());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    void refreshHealth();
  }, []);

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      setUnreadCount(0);
      return;
    }
    void refreshMe(token);
    void refreshUnread(token);
  }, [token]);

  return (
    <div className="showcase-shell">
      <CosmicBackdrop />
      <aside className="command-rail">
        <Link className="brand-chip" to="/" aria-label="FeedLab home">
          <span>FL</span>
          <strong>FeedLab</strong>
        </Link>
        <nav className="route-nav" aria-label="主导航">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <PilotCard
          currentUser={currentUser}
          token={token}
          unreadCount={unreadCount}
          onLogout={logout}
          onDemoLogin={loginDemo}
        />
        <SystemPulse health={health} onRefresh={refreshHealth} />
      </aside>

      <main className="route-stage">
        <RouteAnimator routeKey={location.pathname}>
          <Routes>
            <Route path="/" element={<HomePage currentUser={currentUser} health={health} />} />
            <Route
              path="/feed"
              element={
                <FeedPage
                  token={token}
                  currentUser={currentUser}
                  onNotice={setNotice}
                  onMeChanged={() => token && void refreshMe(token)}
                />
              }
            />
            <Route
              path="/notifications"
              element={
                <NotificationsPage
                  token={token}
                  onUnreadChange={setUnreadCount}
                  onNotice={setNotice}
                />
              }
            />
            <Route
              path="/profile"
              element={<ProfilePage token={token} currentUser={currentUser} onNotice={setNotice} />}
            />
            <Route
              path="/profile/:id"
              element={<ProfilePage token={token} currentUser={currentUser} onNotice={setNotice} />}
            />
            <Route
              path="/lab"
              element={<LabPage health={health} token={token} currentUser={currentUser} onNotice={setNotice} />}
            />
          </Routes>
        </RouteAnimator>
      </main>

      {notice && (
        <button className={`toast ${notice.type}`} type="button" onClick={() => setNotice(null)}>
          {notice.text}
        </button>
      )}
    </div>
  );

  async function refreshHealth() {
    try {
      setHealth(await api.health());
    } catch (error) {
      setHealth(null);
      setNotice({ type: "error", text: formatError(error, "后端没有响应，请确认 API 已启动。") });
    }
  }

  async function refreshMe(nextToken: string) {
    try {
      setCurrentUser(await api.me(nextToken));
    } catch (error) {
      tokenStore.clear();
      setToken(null);
      setNotice({ type: "error", text: formatError(error, "登录态失效，请重新登录。") });
    }
  }

  async function refreshUnread(nextToken: string) {
    try {
      const result = await api.unreadNotifications(nextToken);
      setUnreadCount(result.unread_count);
    } catch {
      setUnreadCount(0);
    }
  }

  async function loginDemo(account: LoginPayload) {
    try {
      const result = await api.login(account);
      tokenStore.set(result.access_token);
      setToken(result.access_token);
      setCurrentUser(result.user);
      setNotice({ type: "success", text: `已接入 ${result.user.nickname || result.user.username} 的驾驶席。` });
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "演示账号登录失败，可以先在 Swagger/Postman 创建账号。") });
    }
  }

  function logout() {
    tokenStore.clear();
    setToken(null);
    setCurrentUser(null);
    setNotice({ type: "info", text: "已断开本地 Token。" });
  }
}

function CosmicBackdrop() {
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!layerRef.current) {
      return;
    }
    const ctx = gsap.context(() => {
      gsap.to(".nebula-a", { x: 70, y: -40, duration: 9, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".nebula-b", { x: -55, y: 60, duration: 11, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".scan-line", { yPercent: 110, duration: 4.6, repeat: -1, ease: "none" });
      gsap.to(".star-node", {
        opacity: 0.25,
        scale: 0.6,
        duration: 1.6,
        repeat: -1,
        yoyo: true,
        stagger: 0.18,
        ease: "sine.inOut"
      });
    }, layerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="cosmic-backdrop" ref={layerRef} aria-hidden="true">
      <div className="nebula nebula-a" />
      <div className="nebula nebula-b" />
      <div className="scan-line" />
      {Array.from({ length: 18 }, (_, index) => (
        <span className="star-node" key={index} style={{ left: `${8 + ((index * 23) % 86)}%`, top: `${6 + ((index * 31) % 82)}%` }} />
      ))}
    </div>
  );
}

function RouteAnimator({ routeKey, children }: { routeKey: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".route-panel",
        { autoAlpha: 0, y: 18, filter: "blur(8px)" },
        { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "power3.out" }
      );
      gsap.fromTo(
        ".stagger-in",
        { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.06, ease: "power3.out", delay: 0.08 }
      );
    }, ref);
    return () => ctx.revert();
  }, [routeKey]);

  return (
    <div ref={ref} className="route-panel">
      {children}
    </div>
  );
}

function HomePage({ currentUser, health }: { currentUser: User | null; health: HealthStatus | null }) {
  return (
    <section className="home-grid">
      <div className="hero-console stagger-in">
        <p className="kicker">Go + Gin + GORM + MySQL + Redis + RabbitMQ</p>
        <h1>FeedLab 内容社区星舰已经进入展示轨道</h1>
        <p>
          一个面向 Go 后端实习展示的完整项目：从用户认证、内容发布，到互动关系、Redis 加速、RabbitMQ 异步通知，再到 V5 展示型前端。
        </p>
        <div className="hero-actions">
          <Link className="primary-link" to="/feed">进入 Feed 流</Link>
          <Link className="ghost-link" to="/lab">查看系统驾驶舱</Link>
        </div>
      </div>

      <div className="orbit-card stagger-in">
        <div className="orbit-core">API</div>
        <span className="orbit-ring ring-one" />
        <span className="orbit-ring ring-two" />
        <span className="orbit-satellite satellite-one">JWT</span>
        <span className="orbit-satellite satellite-two">Redis</span>
        <span className="orbit-satellite satellite-three">MQ</span>
      </div>

      <div className="metric-strip stagger-in">
        <Metric label="当前驾驶员" value={currentUser ? `@${currentUser.username}` : "未登录"} />
        <Metric label="RabbitMQ" value={health?.rabbitmq ?? "unknown"} />
        <Metric label="Redis" value={health?.redis ?? "unknown"} />
        <Metric label="MySQL" value={health?.mysql ?? "unknown"} />
      </div>

      <div className="version-grid">
        {versionCards.map((card) => (
          <article className={`version-card ${card.tone} stagger-in`} key={card.tag}>
            <span>{card.tag}</span>
            <h2>{card.title}</h2>
            <p>{card.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FeedPage({
  token,
  currentUser,
  onNotice,
  onMeChanged
}: {
  token: string | null;
  currentUser: User | null;
  onNotice: (notice: Notice) => void;
  onMeChanged: () => void;
}) {
  const [mode, setMode] = useState<FeedMode>("latest");
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreatePostPayload>(emptyPostForm);
  const [cursor, setCursor] = useState("");
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    void loadPosts("reset");
  }, [mode]);

  useEffect(() => {
    if (posts.length > 0 && !selectedPost) {
      setSelectedPost(posts[0]);
    }
  }, [posts, selectedPost]);

  return (
    <section className="feed-layout">
      <div className="feed-header stagger-in">
        <div>
          <p className="kicker">V5 Feed Deck</p>
          <h1>内容流展示舰桥</h1>
        </div>
        <div className="segmented dark">
          <button className={mode === "latest" ? "active" : ""} type="button" onClick={() => setMode("latest")}>最新</button>
          <button className={mode === "hot" ? "active" : ""} type="button" onClick={() => setMode("hot")}>热门</button>
          <button className={mode === "cursor" ? "active" : ""} type="button" onClick={() => setMode("cursor")}>游标</button>
        </div>
      </div>

      <form className="composer stagger-in" onSubmit={createPost}>
        <div className="composer-top">
          <span>{currentUser ? `@${currentUser.username}` : "Guest"}</span>
          <button type="submit" disabled={!token || creating}>{creating ? "发射中..." : "发布"}</button>
        </div>
        <input value={form.title} placeholder="给这条信号起一个标题" maxLength={120} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <textarea value={form.content} placeholder="写下你的帖子内容，发布后会进入 Feed。" onChange={(event) => setForm({ ...form, content: event.target.value })} />
      </form>

      <div className="feed-main">
        <div className="post-stream">
          {loading && <p className="empty-signal">正在同步 Feed...</p>}
          {!loading && posts.length === 0 && <p className="empty-signal">还没有公开帖子，登录后发布第一条。</p>}
          {posts.map((post) => (
            <PostCard key={post.id} post={post} active={selectedPost?.id === post.id} onOpen={() => setSelectedPost(post)} />
          ))}
          {mode === "cursor" && hasMore && (
            <button className="load-more" type="button" onClick={() => loadPosts("append")} disabled={loading}>
              载入下一段轨迹
            </button>
          )}
        </div>

        <PostDetailPanel
          post={selectedPost}
          token={token}
          onNotice={onNotice}
          onPostChanged={(next) => {
            setSelectedPost(next);
            setPosts((items) => items.map((item) => (item.id === next.id ? next : item)));
          }}
        />
      </div>
    </section>
  );

  async function loadPosts(strategy: "reset" | "append") {
    setLoading(true);
    try {
      if (mode === "hot") {
        const result = await api.hotPosts(12);
        setPosts(result.items);
        setCursor("");
        setHasMore(false);
        setSelectedPost(result.items[0] ?? null);
        return;
      }
      if (mode === "cursor") {
        const result = await api.feedPosts(strategy === "append" ? cursor : "", 8);
        setPosts((current) => (strategy === "append" ? [...current, ...result.items] : result.items));
        setCursor(result.next_cursor);
        setHasMore(result.has_more);
        if (strategy === "reset") {
          setSelectedPost(result.items[0] ?? null);
        }
        return;
      }
      const result = await api.listPosts(1, 12);
      setPosts(result.items);
      setCursor("");
      setHasMore(false);
      setSelectedPost(result.items[0] ?? null);
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "Feed 加载失败。") });
    } finally {
      setLoading(false);
    }
  }

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      onNotice({ type: "error", text: "请先登录，再发布帖子。" });
      return;
    }
    if (!form.title.trim() || !form.content.trim()) {
      onNotice({ type: "error", text: "标题和正文不能为空。" });
      return;
    }
    setCreating(true);
    try {
      const created = await api.createPost({ ...form, status: "published" }, token);
      setForm(emptyPostForm);
      setPosts((items) => [created, ...items]);
      setSelectedPost(created);
      onMeChanged();
      onNotice({ type: "success", text: "帖子已经进入公开 Feed。" });
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "发布失败。") });
    } finally {
      setCreating(false);
    }
  }
}

function PostDetailPanel({
  post,
  token,
  onNotice,
  onPostChanged
}: {
  post: Post | null;
  token: string | null;
  onNotice: (notice: Notice) => void;
  onPostChanged: (post: Post) => void;
}) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<"like" | "collect" | "comment" | null>(null);

  if (!post) {
    return <aside className="post-detail empty">选择一条帖子查看详情。</aside>;
  }
  const activePost = post;

  return (
    <aside className="post-detail stagger-in">
      <div className="detail-beacon" />
      <p className="kicker">Signal #{activePost.id}</p>
      <h2>{activePost.title}</h2>
      <button className="author-link" type="button">
        @{activePost.author.username}
      </button>
      <p className="detail-content">{activePost.content}</p>
      <div className="stat-row">
        <span>{activePost.view_count} 浏览</span>
        <span>{activePost.like_count} 赞</span>
        <span>{activePost.collect_count} 收藏</span>
        <span>{activePost.comment_count} 评论</span>
      </div>
      <div className="detail-actions">
        <button type="button" disabled={!token || busy === "like"} onClick={likePost}>点赞</button>
        <button type="button" disabled={!token || busy === "collect"} onClick={collectPost}>收藏</button>
      </div>
      <form className="inline-comment" onSubmit={submitComment}>
        <textarea value={comment} placeholder="写一条评论，V4 会异步通知作者。" onChange={(event) => setComment(event.target.value)} />
        <button type="submit" disabled={!token || busy === "comment"}>{busy === "comment" ? "发送中" : "评论"}</button>
      </form>
    </aside>
  );

  async function likePost() {
    if (!token) {
      return;
    }
    setBusy("like");
    try {
      const result = await api.likePost(activePost.id, token);
      onPostChanged({ ...activePost, like_count: result.like_count });
      onNotice({ type: "success", text: "点赞成功，通知会经 RabbitMQ 异步送达。" });
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "点赞失败。") });
    } finally {
      setBusy(null);
    }
  }

  async function collectPost() {
    if (!token) {
      return;
    }
    setBusy("collect");
    try {
      const result = await api.collectPost(activePost.id, token);
      onPostChanged({ ...activePost, collect_count: result.collect_count });
      onNotice({ type: "success", text: "收藏成功。" });
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "收藏失败。") });
    } finally {
      setBusy(null);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !comment.trim()) {
      return;
    }
    setBusy("comment");
    try {
      await api.createComment(activePost.id, { content: comment.trim(), parent_id: 0 }, token);
      setComment("");
      onPostChanged({ ...activePost, comment_count: activePost.comment_count + 1 });
      onNotice({ type: "success", text: "评论已发布，作者会收到异步通知。" });
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "评论失败。") });
    } finally {
      setBusy(null);
    }
  }
}

function NotificationsPage({
  token,
  onUnreadChange,
  onNotice
}: {
  token: string | null;
  onUnreadChange: (count: number) => void;
  onNotice: (notice: Notice) => void;
}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const unread = useMemo(() => items.filter((item) => !item.is_read).length, [items]);

  useEffect(() => {
    if (token) {
      void loadNotifications();
    }
  }, [token]);

  if (!token) {
    return <LockedPanel title="通知中心需要登录" text="登录后可以查看 RabbitMQ 异步写入的站内通知。" />;
  }

  return (
    <section className="notification-page">
      <div className="feed-header stagger-in">
        <div>
          <p className="kicker">V4 Notification Queue</p>
          <h1>通知中心</h1>
        </div>
        <button className="primary-link as-button" type="button" onClick={markAllRead} disabled={loading || unread === 0}>
          全部已读
        </button>
      </div>
      <div className="notification-meter stagger-in">
        <Metric label="当前未读" value={String(unread)} />
        <Metric label="消息来源" value="RabbitMQ" />
        <Metric label="消费幂等" value="message_id" />
      </div>
      <div className="notification-list">
        {items.map((item) => (
          <article className={`notification-item ${item.is_read ? "read" : ""} stagger-in`} key={item.id}>
            <span className="notification-type">{labelNotification(item.type)}</span>
            <div>
              <h2>{item.actor.nickname || item.actor.username}</h2>
              <p>{item.content || item.subject_type}</p>
              <small>{formatTime(item.created_at)} · {item.message_id}</small>
            </div>
            <button type="button" disabled={item.is_read} onClick={() => markRead(item.id)}>
              {item.is_read ? "已读" : "标记"}
            </button>
          </article>
        ))}
        {!loading && items.length === 0 && <p className="empty-signal">还没有通知。试试让另一个账号点赞、评论或关注你。</p>}
      </div>
    </section>
  );

  async function loadNotifications() {
    if (!token) {
      return;
    }
    setLoading(true);
    try {
      const result = await api.notifications(token, 1, 20);
      setItems(result.items);
      onUnreadChange(result.items.filter((item) => !item.is_read).length);
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "通知加载失败。") });
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: number) {
    if (!token) {
      return;
    }
    try {
      await api.markNotificationRead(id, token);
      setItems((current) => current.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
      const result = await api.unreadNotifications(token);
      onUnreadChange(result.unread_count);
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "标记已读失败。") });
    }
  }

  async function markAllRead() {
    if (!token) {
      return;
    }
    setLoading(true);
    try {
      await api.markAllNotificationsRead(token);
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
      onUnreadChange(0);
      onNotice({ type: "success", text: "通知已全部归档为已读。" });
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "全部已读失败。") });
    } finally {
      setLoading(false);
    }
  }
}

function ProfilePage({
  token,
  currentUser,
  onNotice
}: {
  token: string | null;
  currentUser: User | null;
  onNotice: (notice: Notice) => void;
}) {
  const params = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(params.id ?? currentUser?.id?.toString() ?? "1");
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followed, setFollowed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = Number(params.id ?? currentUser?.id ?? input);
    if (Number.isFinite(id) && id > 0) {
      void loadProfile(id);
    }
  }, [params.id, currentUser?.id]);

  return (
    <section className="profile-page">
      <div className="feed-header stagger-in">
        <div>
          <p className="kicker">Public User Graph</p>
          <h1>用户宇航图</h1>
        </div>
        <form className="profile-search" onSubmit={submitSearch}>
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="用户 ID" />
          <button type="submit">跃迁</button>
        </form>
      </div>

      {profile ? (
        <div className="profile-grid">
          <article className="profile-card stagger-in">
            <div className="big-avatar">{initials(profile)}</div>
            <h2>{profile.nickname || profile.username}</h2>
            <p>@{profile.username}</p>
            <div className="stat-row vertical">
              <span>{profile.post_count} 发帖</span>
              <span>{profile.follower_count} 粉丝</span>
              <span>{profile.following_count} 关注</span>
            </div>
            {token && currentUser?.id !== profile.id && (
              <button type="button" onClick={toggleFollow} disabled={loading}>
                {followed ? "取消关注" : "关注"}
              </button>
            )}
          </article>
          <div className="profile-posts">
            {posts.map((post) => <PostCard key={post.id} post={post} active={false} onOpen={() => undefined} />)}
            {posts.length === 0 && <p className="empty-signal">这个用户暂时没有公开帖子。</p>}
          </div>
        </div>
      ) : (
        <p className="empty-signal">输入用户 ID 查看公开主页。</p>
      )}
    </section>
  );

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = Number(input);
    if (!Number.isFinite(id) || id <= 0) {
      onNotice({ type: "error", text: "请输入有效用户 ID。" });
      return;
    }
    navigate(`/profile/${id}`);
  }

  async function loadProfile(id: number) {
    setLoading(true);
    try {
      const [user, list] = await Promise.all([api.publicUser(id), api.listUserPosts(id, 1, 10)]);
      setProfile(user);
      setPosts(list.items);
      setInput(String(user.id));
      if (token && currentUser?.id !== user.id) {
        const status = await api.userFollowed(user.id, token);
        setFollowed(status.followed);
      } else {
        setFollowed(false);
      }
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "公开主页加载失败。") });
    } finally {
      setLoading(false);
    }
  }

  async function toggleFollow() {
    if (!token || !profile) {
      return;
    }
    setLoading(true);
    try {
      const result = followed ? await api.unfollowUser(profile.id, token) : await api.followUser(profile.id, token);
      setFollowed(result.followed);
      setProfile({ ...profile, follower_count: result.follower_count });
      onNotice({ type: "success", text: result.followed ? "关注成功。" : "已取消关注。" });
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "关注操作失败。") });
    } finally {
      setLoading(false);
    }
  }
}

function LabPage({
  health,
  token,
  currentUser,
  onNotice
}: {
  health: HealthStatus | null;
  token: string | null;
  currentUser: User | null;
  onNotice: (notice: Notice) => void;
}) {
  return (
    <section className="lab-page">
      <div className="feed-header stagger-in">
        <div>
          <p className="kicker">System Cockpit</p>
          <h1>系统驾驶舱</h1>
        </div>
      </div>
      <div className="lab-grid">
        <article className="lab-card stagger-in">
          <h2>后端依赖</h2>
          <SystemLine label="API" value={health?.api} />
          <SystemLine label="MySQL" value={health?.mysql} />
          <SystemLine label="Redis" value={health?.redis} />
          <SystemLine label="RabbitMQ" value={health?.rabbitmq} />
        </article>
        <article className="lab-card stagger-in">
          <h2>当前身份</h2>
          <p>{currentUser ? `${currentUser.nickname || currentUser.username} / @${currentUser.username}` : "未登录"}</p>
          <p className="token-preview">{token ? `${token.slice(0, 24)}...${token.slice(-8)}` : "无 Token"}</p>
        </article>
        <article className="lab-card wide stagger-in">
          <h2>展示路线</h2>
          <div className="mission-steps">
            <span>登录演示账号</span>
            <span>发布帖子</span>
            <span>点赞评论收藏</span>
            <span>RabbitMQ 通知</span>
            <span>Redis 热门/Feed</span>
          </div>
          <button type="button" onClick={() => onNotice({ type: "info", text: "演示建议：开 RabbitMQ 管理台 + FeedLab 前端 + Swagger 三个标签页。" })}>
            生成演示提示
          </button>
        </article>
      </div>
    </section>
  );
}

function PilotCard({
  currentUser,
  token,
  unreadCount,
  onLogout,
  onDemoLogin
}: {
  currentUser: User | null;
  token: string | null;
  unreadCount: number;
  onLogout: () => void;
  onDemoLogin: (payload: LoginPayload) => void;
}) {
  return (
    <section className="pilot-card">
      <div className="pilot-head">
        <div className="avatar">{currentUser ? initials(currentUser) : "?"}</div>
        <div>
          <strong>{currentUser ? currentUser.nickname || currentUser.username : "未接入"}</strong>
          <span>{currentUser ? `@${currentUser.username}` : "选择演示账号"}</span>
        </div>
      </div>
      <div className="pilot-metrics">
        <Metric label="发帖" value={String(currentUser?.post_count ?? 0)} />
        <Metric label="关注" value={String(currentUser?.following_count ?? 0)} />
        <Metric label="未读" value={String(unreadCount)} />
      </div>
      <div className="demo-logins">
        {demoAccounts.map((account) => (
          <button key={account.email} type="button" onClick={() => onDemoLogin(account)}>
            {account.label}
          </button>
        ))}
      </div>
      {token && <button className="logout-button" type="button" onClick={onLogout}>断开 Token</button>}
    </section>
  );
}

function SystemPulse({ health, onRefresh }: { health: HealthStatus | null; onRefresh: () => void }) {
  return (
    <section className="system-pulse">
      <div className="pulse-title">
        <strong>Service Pulse</strong>
        <button type="button" onClick={onRefresh}>刷新</button>
      </div>
      <SystemLine label="API" value={health?.api} />
      <SystemLine label="MySQL" value={health?.mysql} />
      <SystemLine label="Redis" value={health?.redis} />
      <SystemLine label="RabbitMQ" value={health?.rabbitmq} />
    </section>
  );
}

function SystemLine({ label, value }: { label: string; value?: string }) {
  const ok = value === "ok";
  return (
    <div className="system-line">
      <span className={ok ? "signal ok" : "signal"} />
      <span>{label}</span>
      <strong>{value ?? "unknown"}</strong>
    </div>
  );
}

function PostCard({ post, active, onOpen }: { post: Post; active: boolean; onOpen: () => void }) {
  return (
    <button className={`post-card stagger-in ${active ? "active" : ""}`} type="button" onClick={onOpen}>
      <span className="post-chip">#{post.id}</span>
      <h2>{post.title}</h2>
      <p>{post.content}</p>
      <div className="post-meta">
        <span>@{post.author.username}</span>
        <span>{post.like_count} 赞</span>
        <span>{post.comment_count} 评论</span>
      </div>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LockedPanel({ title, text }: { title: string; text: string }) {
  return (
    <section className="locked-panel">
      <p className="kicker">Access Required</p>
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}

function initials(user: Pick<User, "username" | "nickname"> | Pick<PublicUser, "username" | "nickname">) {
  const base = user.nickname || user.username || "FL";
  return base.slice(0, 2).toUpperCase();
}

function labelNotification(type: string) {
  const labels: Record<string, string> = {
    post_like: "帖子点赞",
    post_collect: "帖子收藏",
    comment: "新评论",
    reply: "新回复",
    follow: "新关注",
    comment_like: "评论点赞"
  };
  return labels[type] ?? type;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return `${fallback} ${error.message}`;
  }
  if (error instanceof Error) {
    return `${fallback} ${error.message}`;
  }
  return fallback;
}

export default App;
