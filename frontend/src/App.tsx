import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import gsap from "gsap";
import { api, ApiError, tokenStore } from "./api/client";
import type {
  Comment,
  CreatePostPayload,
  HealthStatus,
  LoginPayload,
  NotificationItem,
  Post,
  PostMedia,
  PublicUser,
  PublicUserList,
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
  status: "published",
  media: []
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
  const navigate = useNavigate();
  const [mode, setMode] = useState<FeedMode>("latest");
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
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
        <div className="media-uploader">
          <div>
            <strong>{describeComposerType(form.media)}</strong>
            <span>支持 jpg/png/webp/gif、mp4/webm/mov。图片 5MB 内，视频 50MB 内。</span>
          </div>
          <label className={`media-pick ${!token || uploading ? "disabled" : ""}`}>
            {uploading ? "上传中..." : "选择图片/视频"}
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              disabled={!token || uploading}
              onChange={uploadMediaFiles}
            />
          </label>
        </div>
        {form.media.length > 0 && (
          <div className="media-preview-grid" aria-label="待发布媒体">
            {form.media.map((item, index) => (
              <article className="media-preview" key={`${item.url}-${index}`}>
                {item.media_type === "image" ? (
                  <img src={item.url} alt={item.original_name || `media-${index + 1}`} />
                ) : (
                  <video src={item.url} muted playsInline />
                )}
                <div>
                  <strong>{item.media_type === "image" ? "图片" : "视频"}</strong>
                  <span>{item.original_name || item.url}</span>
                </div>
                <button type="button" onClick={() => removeMedia(index)}>移除</button>
              </article>
            ))}
          </div>
        )}
      </form>

      {mode === "hot" && (
        <section className="hot-formula stagger-in" aria-label="热门排序说明">
          <div>
            <strong>热门排序由后端 Redis ZSet 返回</strong>
            <span>热度分 = 点赞数 * 3 + 收藏数 * 5 + 评论数 * 4</span>
          </div>
          <p>如果某条帖子没有排第一，优先看它在 Redis `rank:hot_posts` 里的 score，而不是只看肉眼的赞评数量。</p>
        </section>
      )}

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
          key={`feed-detail-${selectedPost?.id ?? "empty"}`}
          post={selectedPost}
          token={token}
          onNotice={onNotice}
          onPostChanged={(next) => {
            setSelectedPost((current) => (current?.id === next.id ? next : current));
            setPosts((items) => items.map((item) => (item.id === next.id ? next : item)));
          }}
          onOpenUser={(id) => navigate(`/profile/${id}`)}
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
    if (!form.title.trim()) {
      onNotice({ type: "error", text: "标题不能为空。" });
      return;
    }
    if (!form.content.trim() && form.media.length === 0) {
      onNotice({ type: "error", text: "正文和媒体至少需要一个。" });
      return;
    }
    setCreating(true);
    try {
      const media = form.media.map((item, index) => ({ ...item, sort_order: index + 1 }));
      const created = await api.createPost({
        ...form,
        status: "published",
        content_type: derivePostContentType(media),
        media
      }, token);
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

  async function uploadMediaFiles(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (!token || files.length === 0) {
      return;
    }
    if (form.media.length + files.length > 12) {
      onNotice({ type: "error", text: "单篇帖子最多上传 12 个媒体资源。" });
      return;
    }
    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map((file) => api.uploadMedia(file, token)));
      setForm((current) => ({
        ...current,
        media: [
          ...current.media,
          ...uploaded.map((item, offset) => ({
            ...item,
            sort_order: current.media.length + offset + 1
          }))
        ]
      }));
      onNotice({ type: "success", text: "媒体上传成功，发布帖子时会一起保存。" });
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "媒体上传失败。") });
    } finally {
      setUploading(false);
    }
  }

  function removeMedia(index: number) {
    setForm((current) => ({
      ...current,
      media: current.media.filter((_, itemIndex) => itemIndex !== index)
    }));
  }
}

function PostDetailPanel({
  post,
  token,
  onNotice,
  onPostChanged,
  onOpenUser
}: {
  post: Post | null;
  token: string | null;
  onNotice: (notice: Notice) => void;
  onPostChanged: (post: Post) => void;
  onOpenUser?: (userID: number) => void;
}) {
  const [detail, setDetail] = useState<Post | null>(post);
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyMap, setReplyMap] = useState<Record<number, Comment[]>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [postLiked, setPostLiked] = useState(false);
  const [postCollected, setPostCollected] = useState(false);
  const [commentLikeMap, setCommentLikeMap] = useState<Record<number, boolean>>({});
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<"detail" | "like" | "collect" | "comment" | `reply-${number}` | `comment-like-${number}` | null>(null);
  const actionGuardRef = useRef<Record<string, number>>({});
  const detailRequestRef = useRef(0);
  const commentsRequestRef = useRef(0);

  useEffect(() => {
    setDetail(post);
    setComments([]);
    setReplyMap({});
    setExpandedReplies({});
    setReplyDrafts({});
    setPostLiked(false);
    setPostCollected(false);
    setCommentLikeMap({});
    setComment("");
    if (post) {
      void loadPostDetail(post.id);
      void loadComments(post.id);
    }
  }, [post?.id]);

  useEffect(() => {
    if (post) {
      void loadPostActions(post.id);
    }
  }, [post?.id, token]);

  useEffect(() => {
    const loadedReplies = Object.values(replyMap).flat();
    void loadCommentLikeStatuses([...comments, ...loadedReplies]);
  }, [token]);

  if (!post) {
    return <aside className="post-detail empty">选择一条帖子查看详情。</aside>;
  }
  const activePost = detail ?? post;

  return (
    <aside className="post-detail stagger-in">
      <div className="detail-beacon" />
      <p className="kicker">Signal #{activePost.id}</p>
      <h2>{activePost.title}</h2>
      <button className="author-link" type="button" onClick={() => onOpenUser?.(activePost.author.id)}>
        @{activePost.author.username}
      </button>
      <p className="detail-content">{activePost.content}</p>
      <MediaGallery media={activePost.media ?? []} mode="detail" />
      <div className="stat-row">
        <span>{activePost.view_count} 浏览</span>
        <span>{activePost.like_count} 赞</span>
        <span>{activePost.collect_count} 收藏</span>
        <span>{activePost.comment_count} 评论</span>
        <span>热度 {Math.round(activePost.hot_score)}</span>
      </div>
      <div className="detail-actions">
        <button type="button" className={postLiked ? "active" : ""} disabled={!token || busy === "like"} onClick={togglePostLike}>
          {busy === "like" ? "处理中" : postLiked ? "已点赞" : "点赞"}
        </button>
        <button type="button" className={postCollected ? "active" : ""} disabled={!token || busy === "collect"} onClick={togglePostCollect}>
          {busy === "collect" ? "处理中" : postCollected ? "已收藏" : "收藏"}
        </button>
      </div>
      <form className="inline-comment" onSubmit={submitComment}>
        <textarea value={comment} placeholder="写一条评论，V4 会异步通知作者。" onChange={(event) => setComment(event.target.value)} />
        <button type="submit" disabled={!token || busy === "comment"}>{busy === "comment" ? "发送中" : "评论"}</button>
      </form>
      <section className="comment-deck" aria-label="评论列表">
        <div className="section-title">
          <strong>评论轨道</strong>
          <button type="button" onClick={() => loadComments(activePost.id)} disabled={busy === "detail"}>刷新</button>
        </div>
        {comments.length === 0 && <p className="empty-signal compact">暂无评论。登录后可以写第一条。</p>}
        {comments.map((item) => (
          <article className="comment-card" key={item.id}>
            <div className="comment-head">
              <button className="author-link" type="button" onClick={() => onOpenUser?.(item.author.id)}>
                @{item.author.username}
              </button>
              <span>{formatTime(item.created_at)}</span>
            </div>
            <p>{item.content}</p>
            <div className="comment-actions">
              <button type="button" onClick={() => toggleReplies(item.id)}>
                {expandedReplies[item.id] ? "收起回复" : "查看回复"}
              </button>
              <button
                type="button"
                className={commentLikeMap[item.id] ? "active" : ""}
                disabled={!token || busy === `comment-like-${item.id}`}
                onClick={() => toggleCommentLike(item.id)}
              >
                {commentLikeMap[item.id] ? "已赞" : "点赞"} · {item.like_count}
              </button>
            </div>
            {expandedReplies[item.id] && (
              <div className="reply-thread">
                {(replyMap[item.id] ?? []).map((reply) => (
                  <article className="reply-card" key={reply.id}>
                    <button className="author-link" type="button" onClick={() => onOpenUser?.(reply.author.id)}>
                      @{reply.author.username}
                    </button>
                    <p>{reply.content}</p>
                    <div className="comment-actions">
                      <button
                        type="button"
                        className={commentLikeMap[reply.id] ? "active" : ""}
                        disabled={!token || busy === `comment-like-${reply.id}`}
                        onClick={() => toggleCommentLike(reply.id)}
                      >
                        {commentLikeMap[reply.id] ? "已赞" : "点赞"} · {reply.like_count}
                      </button>
                    </div>
                  </article>
                ))}
                {(replyMap[item.id] ?? []).length === 0 && <p className="empty-signal compact">还没有回复。</p>}
                <form className="reply-form" onSubmit={(event) => submitReply(event, item.id)}>
                  <input
                    value={replyDrafts[item.id] ?? ""}
                    placeholder="回复这条评论"
                    onChange={(event) => setReplyDrafts((drafts) => ({ ...drafts, [item.id]: event.target.value }))}
                  />
                  <button type="submit" disabled={!token || busy === `reply-${item.id}`}>
                    {busy === `reply-${item.id}` ? "发送中" : "回复"}
                  </button>
                </form>
              </div>
            )}
          </article>
        ))}
      </section>
    </aside>
  );

  async function loadPostDetail(postID: number) {
    const requestID = detailRequestRef.current + 1;
    detailRequestRef.current = requestID;
    setBusy("detail");
    try {
      const next = await api.postDetail(postID);
      if (detailRequestRef.current !== requestID) {
        return;
      }
      setDetail(next);
      onPostChanged(next);
    } catch (error) {
      if (detailRequestRef.current !== requestID) {
        return;
      }
      onNotice({ type: "error", text: formatError(error, "帖子详情加载失败。") });
    } finally {
      if (detailRequestRef.current === requestID) {
        setBusy(null);
      }
    }
  }

  async function loadPostActions(postID: number) {
    if (!token) {
      setPostLiked(false);
      setPostCollected(false);
      return;
    }
    try {
      const [likeStatus, collectStatus] = await Promise.all([
        api.postLiked(postID, token),
        api.postCollected(postID, token)
      ]);
      setPostLiked(likeStatus.liked);
      setPostCollected(collectStatus.collected);
      patchActivePost({
        like_count: likeStatus.like_count,
        collect_count: collectStatus.collect_count
      });
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "点赞/收藏状态加载失败。") });
    }
  }

  async function loadComments(postID: number) {
    const requestID = commentsRequestRef.current + 1;
    commentsRequestRef.current = requestID;
    try {
      const result = await api.listComments(postID, 1, 20);
      if (commentsRequestRef.current !== requestID) {
        return;
      }
      setComments(result.items);
      await loadCommentLikeStatuses(result.items);
    } catch (error) {
      if (commentsRequestRef.current !== requestID) {
        return;
      }
      onNotice({ type: "error", text: formatError(error, "评论加载失败。") });
    }
  }

  async function loadCommentLikeStatuses(items: Comment[]) {
    if (!token || items.length === 0) {
      if (!token) {
        setCommentLikeMap({});
      }
      return;
    }
    try {
      const statuses = await Promise.all(items.map((item) => api.commentLiked(item.id, token)));
      setCommentLikeMap((current) => {
        const next = { ...current };
        for (const status of statuses) {
          next[status.comment_id] = status.liked;
        }
        return next;
      });
      for (const status of statuses) {
        patchCommentLikeCount(status.comment_id, status.like_count);
      }
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "评论点赞状态加载失败。") });
    }
  }

  async function toggleReplies(commentID: number) {
    const nextOpen = !expandedReplies[commentID];
    setExpandedReplies((current) => ({ ...current, [commentID]: nextOpen }));
    if (!nextOpen || replyMap[commentID]) {
      return;
    }
    try {
      const result = await api.listReplies(commentID, 1, 20);
      setReplyMap((current) => ({ ...current, [commentID]: result.items }));
      await loadCommentLikeStatuses(result.items);
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "回复加载失败。") });
    }
  }

  async function togglePostLike() {
    if (!token) {
      return;
    }
    if (!allowAction(`post-like-${activePost.id}`)) {
      return;
    }
    setBusy("like");
    try {
      const result = postLiked
        ? await api.unlikePost(activePost.id, token)
        : await api.likePost(activePost.id, token);
      setPostLiked(result.liked);
      patchActivePost({ like_count: result.like_count });
      onNotice({ type: "success", text: result.liked ? "点赞成功，通知会经 RabbitMQ 异步送达。" : "已取消点赞。" });
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, postLiked ? "取消点赞失败。" : "点赞失败。") });
    } finally {
      setBusy(null);
    }
  }

  async function togglePostCollect() {
    if (!token) {
      return;
    }
    if (!allowAction(`post-collect-${activePost.id}`)) {
      return;
    }
    setBusy("collect");
    try {
      const result = postCollected
        ? await api.uncollectPost(activePost.id, token)
        : await api.collectPost(activePost.id, token);
      setPostCollected(result.collected);
      patchActivePost({ collect_count: result.collect_count });
      onNotice({ type: "success", text: result.collected ? "收藏成功。" : "已取消收藏。" });
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, postCollected ? "取消收藏失败。" : "收藏失败。") });
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
      incrementPostCommentCount();
      await loadComments(activePost.id);
      onNotice({ type: "success", text: "评论已发布，作者会收到异步通知。" });
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "评论失败。") });
    } finally {
      setBusy(null);
    }
  }

  async function submitReply(event: FormEvent<HTMLFormElement>, parentID: number) {
    event.preventDefault();
    const content = (replyDrafts[parentID] ?? "").trim();
    if (!token || !content) {
      return;
    }
    setBusy(`reply-${parentID}`);
    try {
      await api.createComment(activePost.id, { content, parent_id: parentID }, token);
      const result = await api.listReplies(parentID, 1, 20);
      setReplyMap((current) => ({ ...current, [parentID]: result.items }));
      setReplyDrafts((drafts) => ({ ...drafts, [parentID]: "" }));
      incrementPostCommentCount();
      await loadCommentLikeStatuses(result.items);
      onNotice({ type: "success", text: "回复已发布。" });
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "回复失败。") });
    } finally {
      setBusy(null);
    }
  }

  async function toggleCommentLike(commentID: number) {
    if (!token) {
      return;
    }
    if (!allowAction(`comment-like-${commentID}`)) {
      return;
    }
    const liked = commentLikeMap[commentID] ?? false;
    setBusy(`comment-like-${commentID}`);
    try {
      const result = liked
        ? await api.unlikeComment(commentID, token)
        : await api.likeComment(commentID, token);
      setCommentLikeMap((current) => ({ ...current, [commentID]: result.liked }));
      patchCommentLikeCount(commentID, result.like_count);
      onNotice({ type: "success", text: result.liked ? "评论点赞成功。" : "已取消评论点赞。" });
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, liked ? "取消评论点赞失败。" : "评论点赞失败。") });
    } finally {
      setBusy(null);
    }
  }

  function allowAction(key: string) {
    const now = Date.now();
    const last = actionGuardRef.current[key] ?? 0;
    if (now - last < 800) {
      onNotice({ type: "info", text: "操作太频繁，请稍等一下再试。" });
      return false;
    }
    actionGuardRef.current[key] = now;
    return true;
  }

  function patchActivePost(patch: Partial<Post>) {
    const base = detail ?? post;
    if (!base) {
      return;
    }
    const next = normalizePostHotScore({ ...base, ...patch });
    setDetail(next);
    onPostChanged(next);
  }

  function incrementPostCommentCount() {
    patchActivePost({ comment_count: activePost.comment_count + 1 });
  }

  function patchCommentLikeCount(commentID: number, likeCount: number) {
    setComments((items) => items.map((item) => (
      item.id === commentID ? { ...item, like_count: likeCount } : item
    )));
    setReplyMap((current) => {
      const next: Record<number, Comment[]> = {};
      for (const [parentID, replies] of Object.entries(current)) {
        next[Number(parentID)] = replies.map((reply) => (
          reply.id === commentID ? { ...reply, like_count: likeCount } : reply
        ));
      }
      return next;
    });
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
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [relationTab, setRelationTab] = useState<"posts" | "followers" | "following">("posts");
  const [relations, setRelations] = useState<PublicUserList | null>(null);
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
              <button className={relationTab === "posts" ? "active" : ""} type="button" onClick={showProfilePosts}>
                {profile.post_count} 发帖
              </button>
              <button className={relationTab === "followers" ? "active" : ""} type="button" onClick={() => loadRelations("followers")}>
                {profile.follower_count} 粉丝
              </button>
              <button className={relationTab === "following" ? "active" : ""} type="button" onClick={() => loadRelations("following")}>
                {profile.following_count} 关注
              </button>
            </div>
            {token && currentUser?.id !== profile.id && (
              <button type="button" onClick={toggleFollow} disabled={loading}>
                {followed ? "取消关注" : "关注"}
              </button>
            )}
          </article>
          <div className="profile-workspace">
            <div className="profile-posts">
              {relationTab === "posts" && (
                <>
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      active={selectedPost?.id === post.id}
                      onOpen={() => setSelectedPost(post)}
                    />
                  ))}
                  {posts.length === 0 && <p className="empty-signal">这个用户暂时没有公开帖子。</p>}
                </>
              )}
              {relationTab !== "posts" && (
                <RelationList
                  title={relationTab === "followers" ? "粉丝列表" : "关注列表"}
                  list={relations}
                  onOpenUser={(id) => navigate(`/profile/${id}`)}
                />
              )}
            </div>
            <PostDetailPanel
              key={`profile-detail-${selectedPost?.id ?? "empty"}`}
              post={selectedPost}
              token={token}
              onNotice={onNotice}
              onPostChanged={(next) => {
                setSelectedPost((current) => (current?.id === next.id ? next : current));
                setPosts((items) => items.map((item) => (item.id === next.id ? next : item)));
              }}
              onOpenUser={(id) => navigate(`/profile/${id}`)}
            />
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
      setSelectedPost(list.items[0] ?? null);
      setInput(String(user.id));
      setRelationTab("posts");
      setRelations(null);
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

  async function loadRelations(kind: "followers" | "following") {
    if (!profile) {
      return;
    }
    setRelationTab(kind);
    setLoading(true);
    try {
      const result = kind === "followers"
        ? await api.listFollowers(profile.id, 1, 20)
        : await api.listFollowing(profile.id, 1, 20);
      setRelations(result);
      setSelectedPost(null);
    } catch (error) {
      onNotice({ type: "error", text: formatError(error, "用户关系列表加载失败。") });
    } finally {
      setLoading(false);
    }
  }

  function showProfilePosts() {
    setRelationTab("posts");
    setRelations(null);
    setSelectedPost((current) => current ?? posts[0] ?? null);
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

function RelationList({
  title,
  list,
  onOpenUser
}: {
  title: string;
  list: PublicUserList | null;
  onOpenUser: (userID: number) => void;
}) {
  return (
    <section className="relation-panel">
      <div className="section-title">
        <strong>{title}</strong>
        <span>{list?.total ?? 0} 人</span>
      </div>
      {!list || list.items.length === 0 ? (
        <p className="empty-signal compact">这里暂时没有用户。</p>
      ) : (
        <div className="relation-list">
          {list.items.map((user) => (
            <button className="relation-user" type="button" key={user.id} onClick={() => onOpenUser(user.id)}>
              <span className="avatar mini">{initials(user)}</span>
              <span>
                <strong>{user.nickname || user.username}</strong>
                <small>@{user.username}</small>
              </span>
              <em>{user.follower_count} 粉丝</em>
            </button>
          ))}
        </div>
      )}
    </section>
  );
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
  const [loginForm, setLoginForm] = useState<LoginPayload>({ email: "", password: "" });

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onDemoLogin(loginForm);
  }

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
      <form className="pilot-login-form" onSubmit={submitLogin}>
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
            placeholder="secret123"
            minLength={6}
            onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
            required
          />
        </label>
        <button type="submit">使用输入账号接入</button>
      </form>
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
  const media = post.media ?? [];
  return (
    <article
      className={`post-card stagger-in ${active ? "active" : ""}`}
      role="button"
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.button === 0) {
          onOpen();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <span className="post-chip">#{post.id}</span>
      <span className="post-type">{labelPostContentType(post.content_type, media.length)}</span>
      <h2>{post.title}</h2>
      <p>{post.content}</p>
      <MediaGallery media={media} mode="card" />
      <div className="post-meta">
        <span>@{post.author.username}</span>
        <span>{post.like_count} 赞</span>
        <span>{post.collect_count} 收藏</span>
        <span>{post.comment_count} 评论</span>
        <span>热度 {Math.round(post.hot_score)}</span>
      </div>
    </article>
  );
}

function MediaGallery({ media, mode }: { media: PostMedia[]; mode: "card" | "detail" }) {
  if (!media || media.length === 0) {
    return null;
  }
  const visible = mode === "card" ? media.slice(0, 4) : media;
  return (
    <div className={`media-gallery ${mode}`}>
      {visible.map((item, index) => (
        <figure className={`media-tile ${item.media_type}`} key={`${item.url}-${index}`}>
          {item.media_type === "image" ? (
            <img src={item.url} alt={item.original_name || `post-media-${index + 1}`} loading="lazy" />
          ) : mode === "card" ? (
            <div className="video-placeholder">
              <span>VIDEO</span>
            </div>
          ) : (
            <video src={item.url} controls playsInline preload="metadata" />
          )}
          {mode === "card" && index === visible.length - 1 && media.length > visible.length && (
            <figcaption>+{media.length - visible.length}</figcaption>
          )}
        </figure>
      ))}
    </div>
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

function normalizePostHotScore(post: Post): Post {
  return {
    ...post,
    hot_score: post.like_count * 3 + post.collect_count * 5 + post.comment_count * 4
  };
}

function derivePostContentType(media: PostMedia[]): CreatePostPayload["content_type"] {
  if (media.length === 0) {
    return "article";
  }
  const hasImage = media.some((item) => item.media_type === "image");
  const hasVideo = media.some((item) => item.media_type === "video");
  if (hasImage && hasVideo) {
    return "mixed";
  }
  return hasVideo ? "video" : "image";
}

function describeComposerType(media: PostMedia[]) {
  const type = derivePostContentType(media);
  const labels: Record<CreatePostPayload["content_type"], string> = {
    article: "纯文本帖子",
    image: "图文帖子",
    video: "视频帖子",
    mixed: "复合型帖子"
  };
  return `${labels[type]} · ${media.length} 个媒体`;
}

function labelPostContentType(type: Post["content_type"], mediaCount: number) {
  const labels: Record<Post["content_type"], string> = {
    article: "Article",
    image: "Image",
    video: "Video",
    mixed: "Mixed"
  };
  return mediaCount > 0 ? `${labels[type]} · ${mediaCount}` : labels[type];
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
