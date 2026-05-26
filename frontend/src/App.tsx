import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError, tokenStore } from "./api/client";
import type {
  Comment,
  CommentLikeStatus,
  CollectStatus,
  CreatePostPayload,
  DeleteCommentResult,
  FollowStatus,
  HealthStatus,
  LikeStatus,
  LoginPayload,
  Post,
  PublicUser,
  PublicUserList,
  RegisterPayload,
  User
} from "./types";

type AuthMode = "login" | "register";
type Notice = { type: "success" | "error" | "info"; text: string } | null;
type InteractionTarget = "like" | "collect";
type FollowListMode = "followers" | "following";

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
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [likeStatus, setLikeStatus] = useState<LikeStatus | null>(null);
  const [collectStatus, setCollectStatus] = useState<CollectStatus | null>(null);
  const [interactionLoading, setInteractionLoading] = useState<InteractionTarget | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentTotal, setCommentTotal] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [creatingComment, setCreatingComment] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});
  const [repliesByComment, setRepliesByComment] = useState<Record<number, Comment[]>>({});
  const [replyTotals, setReplyTotals] = useState<Record<number, number>>({});
  const [repliesLoading, setRepliesLoading] = useState<Record<number, boolean>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [creatingReplyID, setCreatingReplyID] = useState<number | null>(null);
  const [commentLikeStatuses, setCommentLikeStatuses] = useState<Record<number, CommentLikeStatus>>({});
  const [commentLikeLoadingID, setCommentLikeLoadingID] = useState<number | null>(null);
  const [deletingCommentID, setDeletingCommentID] = useState<number | null>(null);
  const [profileUserIDInput, setProfileUserIDInput] = useState("");
  const [profileUser, setProfileUser] = useState<PublicUser | null>(null);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [profilePostTotal, setProfilePostTotal] = useState(0);
  const [profileLoading, setProfileLoading] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [followListMode, setFollowListMode] = useState<FollowListMode>("followers");
  const [followUsers, setFollowUsers] = useState<PublicUser[]>([]);
  const [followUsersTotal, setFollowUsersTotal] = useState(0);
  const [followUsersLoading, setFollowUsersLoading] = useState(false);

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
      setLikeStatus(null);
      setCollectStatus(null);
      setCommentLikeStatuses({});
      return;
    }
    void loadMe(token);
  }, [token]);

  useEffect(() => {
    if (!selectedPost) {
      return;
    }
    if (!token) {
      setLikeStatus(null);
      setCollectStatus(null);
      return;
    }
    void loadPostInteractions(selectedPost.id, token);
  }, [selectedPost?.id, token]);

  useEffect(() => {
    if (!token) {
      setCommentLikeStatuses({});
      setFollowStatus(null);
      return;
    }
    const ids = visibleCommentIDs(comments, repliesByComment);
    if (ids.length > 0) {
      void loadCommentLikeStatuses(ids, token);
    }
  }, [token, comments, repliesByComment]);

  useEffect(() => {
    if (!profileUser) {
      return;
    }
    void loadFollowUsers(profileUser.id, followListMode);
  }, [profileUser?.id, followListMode]);

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

  async function loadPostInteractions(postID: number, nextToken: string) {
    try {
      const [liked, collected] = await Promise.all([
        api.postLiked(postID, nextToken),
        api.postCollected(postID, nextToken)
      ]);
      setLikeStatus(liked);
      setCollectStatus(collected);
    } catch (error) {
      setLikeStatus(null);
      setCollectStatus(null);
      setNotice({ type: "error", text: formatError(error, "互动状态加载失败，请重新登录后再试。") });
    }
  }

  async function openPost(postID: number) {
    setDetailLoading(true);
    setNotice(null);
    setLikeStatus(null);
    setCollectStatus(null);
    resetCommentState();
    try {
      const detail = await api.postDetail(postID);
      setSelectedPost(detail);
      syncPostCounts(postID, {
        like_count: detail.like_count,
        collect_count: detail.collect_count,
        comment_count: detail.comment_count
      });
      if (token) {
        await loadPostInteractions(postID, token);
      } else {
        setLikeStatus(null);
        setCollectStatus(null);
      }
      await loadComments(postID);
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "帖子详情加载失败。") });
    } finally {
      setDetailLoading(false);
    }
  }

  function closePost() {
    setSelectedPost(null);
    setLikeStatus(null);
    setCollectStatus(null);
    resetCommentState();
  }

  function syncPostCounts(
    postID: number,
    counts: Partial<Pick<Post, "like_count" | "collect_count" | "comment_count">>
  ) {
    setPosts((currentPosts) =>
      currentPosts.map((post) => (post.id === postID ? { ...post, ...counts } : post))
    );
    setSelectedPost((currentPost) => (currentPost?.id === postID ? { ...currentPost, ...counts } : currentPost));
  }

  function resetCommentState() {
    setComments([]);
    setCommentTotal(0);
    setCommentsLoading(false);
    setCommentDraft("");
    setCreatingComment(false);
    setExpandedReplies({});
    setRepliesByComment({});
    setReplyTotals({});
    setRepliesLoading({});
    setReplyDrafts({});
    setCreatingReplyID(null);
    setCommentLikeStatuses({});
    setCommentLikeLoadingID(null);
    setDeletingCommentID(null);
  }

  async function loadComments(postID: number) {
    setCommentsLoading(true);
    try {
      const result = await api.listComments(postID, 1, 10);
      setComments(result.items);
      setCommentTotal(result.total);
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "评论加载失败。") });
    } finally {
      setCommentsLoading(false);
    }
  }

  async function loadReplies(commentID: number) {
    setRepliesLoading((current) => ({ ...current, [commentID]: true }));
    try {
      const result = await api.listReplies(commentID, 1, 10);
      setRepliesByComment((current) => ({ ...current, [commentID]: result.items }));
      setReplyTotals((current) => ({ ...current, [commentID]: result.total }));
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "回复加载失败。") });
    } finally {
      setRepliesLoading((current) => ({ ...current, [commentID]: false }));
    }
  }

  async function loadCommentLikeStatuses(commentIDs: number[], nextToken: string) {
    const uniqueIDs = Array.from(new Set(commentIDs)).filter((id) => id > 0);
    if (uniqueIDs.length === 0) {
      return;
    }

    try {
      const statuses = await Promise.all(uniqueIDs.map((commentID) => api.commentLiked(commentID, nextToken)));
      setCommentLikeStatuses((current) => {
        const next = { ...current };
        for (const status of statuses) {
          next[status.comment_id] = status;
        }
        return next;
      });
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "评论点赞状态加载失败。") });
    }
  }

  function updateCommentLikeCount(commentID: number, likeCount: number) {
    setComments((current) =>
      current.map((comment) => (comment.id === commentID ? { ...comment, like_count: likeCount } : comment))
    );
    setRepliesByComment((current) => {
      const next: Record<number, Comment[]> = {};
      for (const [parentID, replies] of Object.entries(current)) {
        next[Number(parentID)] = replies.map((reply) =>
          reply.id === commentID ? { ...reply, like_count: likeCount } : reply
        );
      }
      return next;
    });
  }

  function adjustPostCommentCount(postID: number, delta: number) {
    const applyDelta = (count: number) => Math.max(0, count + delta);
    setPosts((currentPosts) =>
      currentPosts.map((post) => (post.id === postID ? { ...post, comment_count: applyDelta(post.comment_count) } : post))
    );
    setSelectedPost((currentPost) =>
      currentPost?.id === postID ? { ...currentPost, comment_count: applyDelta(currentPost.comment_count) } : currentPost
    );
  }

  async function openUserProfile(userID: number) {
    if (!Number.isFinite(userID) || userID <= 0) {
      setNotice({ type: "error", text: "请输入有效的用户 ID。" });
      return;
    }

    setProfileLoading(true);
    setNotice(null);
    try {
      const [profile, postsResult] = await Promise.all([api.publicUser(userID), api.listUserPosts(userID, 1, 10)]);
      setProfileUser(profile);
      setProfilePosts(postsResult.items);
      setProfilePostTotal(postsResult.total);
      setProfileUserIDInput(String(profile.id));
      setFollowListMode("followers");
      await loadFollowUsers(profile.id, "followers");
      if (token && currentUser?.id !== profile.id) {
        const status = await api.userFollowed(profile.id, token);
        setFollowStatus(status);
      } else {
        setFollowStatus(null);
      }
      setNotice({ type: "success", text: `已打开 @${profile.username} 的公开主页。` });
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "用户主页加载失败。") });
    } finally {
      setProfileLoading(false);
    }
  }

  function closeUserProfile() {
    setProfileUser(null);
    setProfilePosts([]);
    setProfilePostTotal(0);
    setFollowStatus(null);
    setFollowUsers([]);
    setFollowUsersTotal(0);
    setFollowListMode("followers");
  }

  async function loadFollowUsers(userID: number, mode: FollowListMode) {
    setFollowUsersLoading(true);
    try {
      const result: PublicUserList =
        mode === "followers" ? await api.listFollowers(userID, 1, 10) : await api.listFollowing(userID, 1, 10);
      setFollowUsers(result.items);
      setFollowUsersTotal(result.total);
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "关注列表加载失败。") });
    } finally {
      setFollowUsersLoading(false);
    }
  }

  async function toggleFollowUser() {
    if (!profileUser) {
      return;
    }
    if (!token) {
      setNotice({ type: "error", text: "请先登录，再关注用户。" });
      return;
    }
    if (currentUser?.id === profileUser.id) {
      setNotice({ type: "error", text: "不能关注自己。" });
      return;
    }

    setFollowLoading(true);
    setNotice(null);
    try {
      const wasFollowed = followStatus?.followed === true;
      const result = followStatus?.followed
        ? await api.unfollowUser(profileUser.id, token)
        : await api.followUser(profileUser.id, token);
      const followingDelta = result.followed === wasFollowed ? 0 : result.followed ? 1 : -1;
      setFollowStatus(result);
      setProfileUser((current) => (current ? { ...current, follower_count: result.follower_count } : current));
      setCurrentUser((current) =>
        current
          ? {
              ...current,
              following_count: Math.max(0, current.following_count + followingDelta)
            }
          : current
      );
      if (followListMode === "followers") {
        setFollowUsers((items) => {
          if (!currentUser || followingDelta === 0) {
            return items;
          }
          if (followingDelta > 0) {
            return items.some((item) => item.id === currentUser.id) ? items : [currentUser, ...items];
          }
          return items.filter((item) => item.id !== currentUser.id);
        });
        setFollowUsersTotal((total) => Math.max(0, total + followingDelta));
      }
      setNotice({ type: "success", text: result.followed ? "关注成功。" : "已取消关注。" });
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "关注操作失败。") });
    } finally {
      setFollowLoading(false);
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

  async function toggleLike() {
    if (!selectedPost) {
      return;
    }
    if (!token) {
      setNotice({ type: "error", text: "请先登录，再点赞帖子。" });
      return;
    }

    setInteractionLoading("like");
    setNotice(null);
    try {
      const result = likeStatus?.liked
        ? await api.unlikePost(selectedPost.id, token)
        : await api.likePost(selectedPost.id, token);
      setLikeStatus(result);
      syncPostCounts(result.post_id, { like_count: result.like_count });
      setNotice({ type: "success", text: result.liked ? "点赞成功。" : "已取消点赞。" });
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "点赞操作失败。") });
    } finally {
      setInteractionLoading(null);
    }
  }

  async function toggleCollect() {
    if (!selectedPost) {
      return;
    }
    if (!token) {
      setNotice({ type: "error", text: "请先登录，再收藏帖子。" });
      return;
    }

    setInteractionLoading("collect");
    setNotice(null);
    try {
      const result = collectStatus?.collected
        ? await api.uncollectPost(selectedPost.id, token)
        : await api.collectPost(selectedPost.id, token);
      setCollectStatus(result);
      syncPostCounts(result.post_id, { collect_count: result.collect_count });
      setNotice({ type: "success", text: result.collected ? "收藏成功。" : "已取消收藏。" });
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "收藏操作失败。") });
    } finally {
      setInteractionLoading(null);
    }
  }

  async function handleCreateComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPost) {
      return;
    }
    if (!token) {
      setNotice({ type: "error", text: "请先登录，再发布评论。" });
      return;
    }

    const content = commentDraft.trim();
    if (!content) {
      setNotice({ type: "error", text: "评论内容不能为空。" });
      return;
    }

    setCreatingComment(true);
    setNotice(null);
    try {
      const created = await api.createComment(selectedPost.id, { content, parent_id: 0 }, token);
      setComments((current) => [created, ...current]);
      setCommentTotal((current) => current + 1);
      setCommentDraft("");
      setCommentLikeStatuses((current) => ({
        ...current,
        [created.id]: { comment_id: created.id, liked: false, like_count: created.like_count }
      }));
      adjustPostCommentCount(selectedPost.id, 1);
      setNotice({ type: "success", text: "评论发布成功。" });
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "评论发布失败。") });
    } finally {
      setCreatingComment(false);
    }
  }

  async function toggleReplies(commentID: number) {
    const willOpen = !expandedReplies[commentID];
    setExpandedReplies((current) => ({ ...current, [commentID]: willOpen }));
    if (willOpen && !repliesByComment[commentID]) {
      await loadReplies(commentID);
    }
  }

  async function handleCreateReply(event: FormEvent<HTMLFormElement>, parentID: number) {
    event.preventDefault();
    if (!selectedPost) {
      return;
    }
    if (!token) {
      setNotice({ type: "error", text: "请先登录，再回复评论。" });
      return;
    }

    const content = (replyDrafts[parentID] ?? "").trim();
    if (!content) {
      setNotice({ type: "error", text: "回复内容不能为空。" });
      return;
    }

    setCreatingReplyID(parentID);
    setNotice(null);
    try {
      const created = await api.createComment(selectedPost.id, { content, parent_id: parentID }, token);
      setExpandedReplies((current) => ({ ...current, [parentID]: true }));
      setRepliesByComment((current) => ({
        ...current,
        [parentID]: [...(current[parentID] ?? []), created]
      }));
      setReplyTotals((current) => ({ ...current, [parentID]: (current[parentID] ?? 0) + 1 }));
      setReplyDrafts((current) => ({ ...current, [parentID]: "" }));
      setCommentLikeStatuses((current) => ({
        ...current,
        [created.id]: { comment_id: created.id, liked: false, like_count: created.like_count }
      }));
      adjustPostCommentCount(selectedPost.id, 1);
      setNotice({ type: "success", text: "回复发布成功。" });
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "回复发布失败。") });
    } finally {
      setCreatingReplyID(null);
    }
  }

  function handleProfileSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void openUserProfile(Number(profileUserIDInput));
  }

  async function toggleCommentLike(commentID: number) {
    if (!token) {
      setNotice({ type: "error", text: "请先登录，再点赞评论。" });
      return;
    }

    setCommentLikeLoadingID(commentID);
    setNotice(null);
    try {
      const currentStatus = commentLikeStatuses[commentID];
      const result = currentStatus?.liked
        ? await api.unlikeComment(commentID, token)
        : await api.likeComment(commentID, token);
      setCommentLikeStatuses((current) => ({ ...current, [result.comment_id]: result }));
      updateCommentLikeCount(result.comment_id, result.like_count);
      setNotice({ type: "success", text: result.liked ? "评论点赞成功。" : "已取消评论点赞。" });
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "评论点赞操作失败。") });
    } finally {
      setCommentLikeLoadingID(null);
    }
  }

  async function deleteComment(comment: Comment) {
    if (!selectedPost) {
      return;
    }
    if (!token) {
      setNotice({ type: "error", text: "请先登录，再删除评论。" });
      return;
    }

    setDeletingCommentID(comment.id);
    setNotice(null);
    try {
      const result = await api.deleteComment(comment.id, token);
      removeDeletedComment(comment, result);
      adjustPostCommentCount(selectedPost.id, -result.deleted_count);
      setNotice({ type: "success", text: result.deleted_count > 1 ? "评论及其回复已删除。" : "评论已删除。" });
    } catch (error) {
      setNotice({ type: "error", text: formatError(error, "评论删除失败。") });
    } finally {
      setDeletingCommentID(null);
    }
  }

  function removeDeletedComment(comment: Comment, result: DeleteCommentResult) {
    setCommentLikeStatuses((current) => {
      const next = { ...current };
      delete next[comment.id];
      if (comment.parent_id === 0) {
        for (const reply of repliesByComment[comment.id] ?? []) {
          delete next[reply.id];
        }
      }
      return next;
    });

    if (comment.parent_id === 0) {
      setComments((current) => current.filter((item) => item.id !== comment.id));
      setCommentTotal((current) => Math.max(0, current - 1));
      setRepliesByComment((current) => {
        const next = { ...current };
        delete next[comment.id];
        return next;
      });
      setReplyTotals((current) => {
        const next = { ...current };
        delete next[comment.id];
        return next;
      });
      setExpandedReplies((current) => {
        const next = { ...current };
        delete next[comment.id];
        return next;
      });
      return;
    }

    setRepliesByComment((current) => ({
      ...current,
      [comment.parent_id]: (current[comment.parent_id] ?? []).filter((reply) => reply.id !== comment.id)
    }));
    setReplyTotals((current) => ({
      ...current,
      [comment.parent_id]: Math.max(0, (current[comment.parent_id] ?? 0) - result.deleted_count)
    }));
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
                  <PostCard
                    key={post.id}
                    post={post}
                    selected={selectedPost?.id === post.id}
                    onOpen={() => void openPost(post.id)}
                    onOpenAuthor={() => void openUserProfile(post.author.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="empty-text">还没有公开帖子。登录后发布第一篇吧。</p>
            )}

            <UserProfilePanel
              user={profileUser}
              posts={profilePosts}
              total={profilePostTotal}
              loading={profileLoading}
              userIDInput={profileUserIDInput}
              currentUser={currentUser}
              followStatus={followStatus}
              followLoading={followLoading}
              followListMode={followListMode}
              followUsers={followUsers}
              followUsersTotal={followUsersTotal}
              followUsersLoading={followUsersLoading}
              onUserIDInputChange={setProfileUserIDInput}
              onSearch={handleProfileSearch}
              onClose={closeUserProfile}
              onOpenPost={(postID) => void openPost(postID)}
              onToggleFollow={() => void toggleFollowUser()}
              onFollowListModeChange={setFollowListMode}
              onOpenUser={(userID) => void openUserProfile(userID)}
            />

            {(detailLoading || selectedPost) && (
              <PostDetailPanel
                post={selectedPost}
                loading={detailLoading}
                loggedIn={Boolean(token)}
                likeStatus={likeStatus}
                collectStatus={collectStatus}
                interactionLoading={interactionLoading}
                onOpenAuthor={() => selectedPost && void openUserProfile(selectedPost.author.id)}
                comments={comments}
                commentTotal={commentTotal}
                commentsLoading={commentsLoading}
                commentDraft={commentDraft}
                creatingComment={creatingComment}
                currentUser={currentUser}
                expandedReplies={expandedReplies}
                repliesByComment={repliesByComment}
                replyTotals={replyTotals}
                repliesLoading={repliesLoading}
                replyDrafts={replyDrafts}
                creatingReplyID={creatingReplyID}
                commentLikeStatuses={commentLikeStatuses}
                commentLikeLoadingID={commentLikeLoadingID}
                deletingCommentID={deletingCommentID}
                onClose={closePost}
                onToggleLike={() => void toggleLike()}
                onToggleCollect={() => void toggleCollect()}
                onRefreshComments={() => {
                  if (selectedPost) {
                    void loadComments(selectedPost.id);
                  }
                }}
                onCommentDraftChange={setCommentDraft}
                onCreateComment={handleCreateComment}
                onToggleReplies={(commentID) => void toggleReplies(commentID)}
                onReplyDraftChange={(commentID, value) =>
                  setReplyDrafts((current) => ({ ...current, [commentID]: value }))
                }
                onCreateReply={(event, parentID) => void handleCreateReply(event, parentID)}
                onToggleCommentLike={(commentID) => void toggleCommentLike(commentID)}
                onDeleteComment={(comment) => void deleteComment(comment)}
                onOpenCommentAuthor={(userID) => void openUserProfile(userID)}
              />
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

function PostCard({
  post,
  selected,
  onOpen,
  onOpenAuthor
}: {
  post: Post;
  selected: boolean;
  onOpen: () => void;
  onOpenAuthor: () => void;
}) {
  return (
    <article className={`post-card ${selected ? "selected" : ""}`}>
      <div className="post-card-header">
        <div>
          <button className="link-button post-author" type="button" onClick={onOpenAuthor}>
            @{post.author.username}
          </button>
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
      <div className="post-card-actions">
        <button className="text-button" type="button" onClick={onOpen}>
          查看详情
        </button>
      </div>
    </article>
  );
}

function UserProfilePanel({
  user,
  posts,
  total,
  loading,
  userIDInput,
  currentUser,
  followStatus,
  followLoading,
  followListMode,
  followUsers,
  followUsersTotal,
  followUsersLoading,
  onUserIDInputChange,
  onSearch,
  onClose,
  onOpenPost,
  onToggleFollow,
  onFollowListModeChange,
  onOpenUser
}: {
  user: PublicUser | null;
  posts: Post[];
  total: number;
  loading: boolean;
  userIDInput: string;
  currentUser: User | null;
  followStatus: FollowStatus | null;
  followLoading: boolean;
  followListMode: FollowListMode;
  followUsers: PublicUser[];
  followUsersTotal: number;
  followUsersLoading: boolean;
  onUserIDInputChange: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onOpenPost: (postID: number) => void;
  onToggleFollow: () => void;
  onFollowListModeChange: (mode: FollowListMode) => void;
  onOpenUser: (userID: number) => void;
}) {
  const isSelf = Boolean(user && currentUser?.id === user.id);
  const canFollow = Boolean(user && currentUser && !isSelf);
  const followerCount = followStatus?.follower_count ?? user?.follower_count ?? 0;

  return (
    <section className="profile-panel">
      <div className="profile-toolbar">
        <div>
          <p className="eyebrow">Module 6-7</p>
          <h3>用户公开主页</h3>
        </div>
        {user && (
          <button className="icon-button" type="button" onClick={onClose} title="关闭用户主页">
            ×
          </button>
        )}
      </div>

      <form className="profile-search" onSubmit={onSearch}>
        <label>
          <span>用户 ID</span>
          <input
            inputMode="numeric"
            min="1"
            placeholder="例如 1"
            value={userIDInput}
            onChange={(event) => onUserIDInputChange(event.target.value)}
          />
        </label>
        <button className="secondary-button" type="submit" disabled={loading || !userIDInput.trim()}>
          {loading ? "加载中..." : "打开主页"}
        </button>
      </form>

      {user ? (
        <div className="profile-content">
          <div className="profile-hero">
            <div className="avatar profile-avatar">{initialsFromName(user.nickname || user.username)}</div>
            <div>
              <h3>{user.nickname || user.username}</h3>
              <span>@{user.username}</span>
              <p>{user.bio || "这个用户还没有填写简介。"}</p>
            </div>
          </div>

          <div className="profile-actions">
            <button className="primary-button compact" type="button" onClick={onToggleFollow} disabled={!canFollow || followLoading}>
              {isSelf ? "这是你自己" : followLoading ? "处理中..." : followStatus?.followed ? "取消关注" : "关注"}
            </button>
            {!currentUser && <span>登录后可以关注用户。</span>}
          </div>

          <div className="profile-stats">
            <div>
              <span>帖子</span>
              <strong>{user.post_count}</strong>
            </div>
            <div>
              <span>粉丝</span>
              <strong>{followerCount}</strong>
            </div>
            <div>
              <span>关注</span>
              <strong>{user.following_count}</strong>
            </div>
          </div>

          <div className="follow-list-panel">
            <div className="segmented compact-tabs">
              <button
                className={followListMode === "followers" ? "active" : ""}
                type="button"
                onClick={() => onFollowListModeChange("followers")}
              >
                粉丝
              </button>
              <button
                className={followListMode === "following" ? "active" : ""}
                type="button"
                onClick={() => onFollowListModeChange("following")}
              >
                关注
              </button>
            </div>
            <span className="follow-total">{followUsersTotal} 人</span>

            {followUsersLoading ? (
              <p className="empty-text">正在加载用户列表...</p>
            ) : followUsers.length > 0 ? (
              <div className="follow-user-list">
                {followUsers.map((item) => (
                  <button className="follow-user" type="button" key={item.id} onClick={() => onOpenUser(item.id)}>
                    <span className="avatar tiny">{initialsFromName(item.nickname || item.username)}</span>
                    <span>
                      <strong>{item.nickname || item.username}</strong>
                      <small>@{item.username}</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-text">{followListMode === "followers" ? "还没有粉丝。" : "还没有关注任何人。"}</p>
            )}
          </div>

          <div className="profile-posts-header">
            <h4>公开帖子</h4>
            <span>{total} 篇</span>
          </div>

          {posts.length > 0 ? (
            <div className="profile-post-list">
              {posts.map((post) => (
                <article className="profile-post" key={post.id}>
                  <div>
                    <h4>{post.title}</h4>
                    <p>{post.content}</p>
                  </div>
                  <button className="text-button" type="button" onClick={() => onOpenPost(post.id)}>
                    查看
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-text">这个用户还没有公开帖子。</p>
          )}
        </div>
      ) : (
        <p className="empty-text">点击帖子或评论里的作者名，或者输入用户 ID，可以查看公开主页。</p>
      )}
    </section>
  );
}

function PostDetailPanel({
  post,
  loading,
  loggedIn,
  likeStatus,
  collectStatus,
  interactionLoading,
  onOpenAuthor,
  comments,
  commentTotal,
  commentsLoading,
  commentDraft,
  creatingComment,
  currentUser,
  expandedReplies,
  repliesByComment,
  replyTotals,
  repliesLoading,
  replyDrafts,
  creatingReplyID,
  commentLikeStatuses,
  commentLikeLoadingID,
  deletingCommentID,
  onClose,
  onToggleLike,
  onToggleCollect,
  onRefreshComments,
  onCommentDraftChange,
  onCreateComment,
  onToggleReplies,
  onReplyDraftChange,
  onCreateReply,
  onToggleCommentLike,
  onDeleteComment,
  onOpenCommentAuthor
}: {
  post: Post | null;
  loading: boolean;
  loggedIn: boolean;
  likeStatus: LikeStatus | null;
  collectStatus: CollectStatus | null;
  interactionLoading: InteractionTarget | null;
  onOpenAuthor: () => void;
  comments: Comment[];
  commentTotal: number;
  commentsLoading: boolean;
  commentDraft: string;
  creatingComment: boolean;
  currentUser: User | null;
  expandedReplies: Record<number, boolean>;
  repliesByComment: Record<number, Comment[]>;
  replyTotals: Record<number, number>;
  repliesLoading: Record<number, boolean>;
  replyDrafts: Record<number, string>;
  creatingReplyID: number | null;
  commentLikeStatuses: Record<number, CommentLikeStatus>;
  commentLikeLoadingID: number | null;
  deletingCommentID: number | null;
  onClose: () => void;
  onToggleLike: () => void;
  onToggleCollect: () => void;
  onRefreshComments: () => void;
  onCommentDraftChange: (value: string) => void;
  onCreateComment: (event: FormEvent<HTMLFormElement>) => void;
  onToggleReplies: (commentID: number) => void;
  onReplyDraftChange: (commentID: number, value: string) => void;
  onCreateReply: (event: FormEvent<HTMLFormElement>, parentID: number) => void;
  onToggleCommentLike: (commentID: number) => void;
  onDeleteComment: (comment: Comment) => void;
  onOpenCommentAuthor: (userID: number) => void;
}) {
  if (loading && !post) {
    return (
      <section className="detail-panel">
        <p className="empty-text">正在打开帖子详情...</p>
      </section>
    );
  }

  if (!post) {
    return null;
  }

  const liked = likeStatus?.liked ?? false;
  const collected = collectStatus?.collected ?? false;
  const likeCount = likeStatus?.like_count ?? post.like_count;
  const collectCount = collectStatus?.collect_count ?? post.collect_count;

  return (
    <section className="detail-panel" aria-live="polite">
      <div className="detail-header">
        <div>
          <p className="eyebrow">Module 3</p>
          <h2>{post.title}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} title="关闭帖子详情">
          ×
        </button>
      </div>

      <div className="detail-author">
        <div className="avatar small">{initialsFromName(post.author.nickname || post.author.username)}</div>
        <div>
          <strong>{post.author.nickname || post.author.username}</strong>
          <button className="link-button" type="button" onClick={onOpenAuthor}>
            @{post.author.username}
          </button>
        </div>
        <time>{formatDate(post.created_at)}</time>
      </div>

      <p className="detail-content">{post.content}</p>

      <div className="detail-stats">
        <span>{post.view_count} 浏览</span>
        <span>{likeCount} 赞</span>
        <span>{collectCount} 收藏</span>
        <span>{post.comment_count} 评论</span>
      </div>

      <div className="detail-actions">
        <button
          className={liked ? "primary-button compact" : "secondary-button"}
          type="button"
          onClick={onToggleLike}
          disabled={!loggedIn || interactionLoading === "like"}
          aria-pressed={liked}
        >
          {interactionLoading === "like" ? "处理中..." : liked ? "取消点赞" : "点赞"}
        </button>
        <button
          className={collected ? "primary-button compact" : "secondary-button"}
          type="button"
          onClick={onToggleCollect}
          disabled={!loggedIn || interactionLoading === "collect"}
          aria-pressed={collected}
        >
          {interactionLoading === "collect" ? "处理中..." : collected ? "取消收藏" : "收藏"}
        </button>
      </div>

      {!loggedIn && <p className="detail-hint">登录后可以点赞和收藏这篇帖子。</p>}

      <CommentSection
        loggedIn={loggedIn}
        comments={comments}
        total={commentTotal}
        loading={commentsLoading}
        draft={commentDraft}
        creating={creatingComment}
        currentUser={currentUser}
        expandedReplies={expandedReplies}
        repliesByComment={repliesByComment}
        replyTotals={replyTotals}
        repliesLoading={repliesLoading}
        replyDrafts={replyDrafts}
        creatingReplyID={creatingReplyID}
        commentLikeStatuses={commentLikeStatuses}
        commentLikeLoadingID={commentLikeLoadingID}
        deletingCommentID={deletingCommentID}
        onRefresh={onRefreshComments}
        onDraftChange={onCommentDraftChange}
        onSubmit={onCreateComment}
        onToggleReplies={onToggleReplies}
        onReplyDraftChange={onReplyDraftChange}
        onCreateReply={onCreateReply}
        onToggleCommentLike={onToggleCommentLike}
        onDeleteComment={onDeleteComment}
        onOpenAuthor={onOpenCommentAuthor}
      />
    </section>
  );
}

function CommentSection({
  loggedIn,
  comments,
  total,
  loading,
  draft,
  creating,
  currentUser,
  expandedReplies,
  repliesByComment,
  replyTotals,
  repliesLoading,
  replyDrafts,
  creatingReplyID,
  commentLikeStatuses,
  commentLikeLoadingID,
  deletingCommentID,
  onRefresh,
  onDraftChange,
  onSubmit,
  onToggleReplies,
  onReplyDraftChange,
  onCreateReply,
  onToggleCommentLike,
  onDeleteComment,
  onOpenAuthor
}: {
  loggedIn: boolean;
  comments: Comment[];
  total: number;
  loading: boolean;
  draft: string;
  creating: boolean;
  currentUser: User | null;
  expandedReplies: Record<number, boolean>;
  repliesByComment: Record<number, Comment[]>;
  replyTotals: Record<number, number>;
  repliesLoading: Record<number, boolean>;
  replyDrafts: Record<number, string>;
  creatingReplyID: number | null;
  commentLikeStatuses: Record<number, CommentLikeStatus>;
  commentLikeLoadingID: number | null;
  deletingCommentID: number | null;
  onRefresh: () => void;
  onDraftChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleReplies: (commentID: number) => void;
  onReplyDraftChange: (commentID: number, value: string) => void;
  onCreateReply: (event: FormEvent<HTMLFormElement>, parentID: number) => void;
  onToggleCommentLike: (commentID: number) => void;
  onDeleteComment: (comment: Comment) => void;
  onOpenAuthor: (userID: number) => void;
}) {
  return (
    <section className="comments-section">
      <div className="comments-header">
        <div>
          <p className="eyebrow">Module 4</p>
          <h3>评论区</h3>
        </div>
        <button className="text-button" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "刷新中" : `${total} 条`}
        </button>
      </div>

      <form className="comment-form" onSubmit={onSubmit}>
        <label>
          <span>发布评论</span>
          <textarea
            value={draft}
            maxLength={1000}
            placeholder={loggedIn ? "写下你的想法。" : "登录后可以发布评论。"}
            onChange={(event) => onDraftChange(event.target.value)}
          />
        </label>
        <button className="primary-button compact" type="submit" disabled={!loggedIn || creating || !draft.trim()}>
          {creating ? "发布中..." : loggedIn ? "发布评论" : "请先登录"}
        </button>
      </form>

      {loading ? (
        <p className="empty-text">正在加载评论...</p>
      ) : comments.length > 0 ? (
        <div className="comment-list">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              loggedIn={loggedIn}
              currentUser={currentUser}
              expanded={Boolean(expandedReplies[comment.id])}
              replies={repliesByComment[comment.id] ?? []}
              replyTotal={replyTotals[comment.id] ?? 0}
              repliesLoading={Boolean(repliesLoading[comment.id])}
              replyDraft={replyDrafts[comment.id] ?? ""}
              creatingReply={creatingReplyID === comment.id}
              commentLikeStatuses={commentLikeStatuses}
              commentLikeLoadingID={commentLikeLoadingID}
              deletingCommentID={deletingCommentID}
              onToggleReplies={() => onToggleReplies(comment.id)}
              onReplyDraftChange={(value) => onReplyDraftChange(comment.id, value)}
              onCreateReply={(event) => onCreateReply(event, comment.id)}
              onToggleCommentLike={onToggleCommentLike}
              onDeleteComment={onDeleteComment}
              onOpenAuthor={onOpenAuthor}
            />
          ))}
        </div>
      ) : (
        <p className="empty-text">还没有评论。登录后可以写第一条。</p>
      )}
    </section>
  );
}

function CommentItem({
  comment,
  loggedIn,
  currentUser,
  expanded,
  replies,
  replyTotal,
  repliesLoading,
  replyDraft,
  creatingReply,
  commentLikeStatuses,
  commentLikeLoadingID,
  deletingCommentID,
  onToggleReplies,
  onReplyDraftChange,
  onCreateReply,
  onToggleCommentLike,
  onDeleteComment,
  onOpenAuthor
}: {
  comment: Comment;
  loggedIn: boolean;
  currentUser: User | null;
  expanded: boolean;
  replies: Comment[];
  replyTotal: number;
  repliesLoading: boolean;
  replyDraft: string;
  creatingReply: boolean;
  commentLikeStatuses: Record<number, CommentLikeStatus>;
  commentLikeLoadingID: number | null;
  deletingCommentID: number | null;
  onToggleReplies: () => void;
  onReplyDraftChange: (value: string) => void;
  onCreateReply: (event: FormEvent<HTMLFormElement>) => void;
  onToggleCommentLike: (commentID: number) => void;
  onDeleteComment: (comment: Comment) => void;
  onOpenAuthor: (userID: number) => void;
}) {
  const canDelete = canDeleteComment(currentUser, comment);

  return (
    <article className="comment-item">
      <CommentBody
        comment={comment}
        loggedIn={loggedIn}
        canDelete={canDelete}
        likeStatus={commentLikeStatuses[comment.id]}
        likeLoading={commentLikeLoadingID === comment.id}
        deleting={deletingCommentID === comment.id}
        onToggleLike={() => onToggleCommentLike(comment.id)}
        onDelete={() => onDeleteComment(comment)}
        onOpenAuthor={() => onOpenAuthor(comment.author.id)}
      />
      <div className="comment-actions">
        <button className="text-button" type="button" onClick={onToggleReplies}>
          {expanded ? "收起回复" : replyTotal > 0 ? `查看 ${replyTotal} 条回复` : "回复 / 查看回复"}
        </button>
      </div>

      {expanded && (
        <div className="reply-block">
          <form className="reply-form" onSubmit={onCreateReply}>
            <label>
              <span>回复 @{comment.author.username}</span>
              <textarea
                value={replyDraft}
                maxLength={1000}
                placeholder={loggedIn ? "写一条回复。" : "登录后可以回复评论。"}
                onChange={(event) => onReplyDraftChange(event.target.value)}
              />
            </label>
            <button className="secondary-button" type="submit" disabled={!loggedIn || creatingReply || !replyDraft.trim()}>
              {creatingReply ? "回复中..." : loggedIn ? "发布回复" : "请先登录"}
            </button>
          </form>

          {repliesLoading ? (
            <p className="empty-text">正在加载回复...</p>
          ) : replies.length > 0 ? (
            <div className="reply-list">
              {replies.map((reply) => (
                <article className="comment-item reply" key={reply.id}>
                  <CommentBody
                    comment={reply}
                    loggedIn={loggedIn}
                    canDelete={canDeleteComment(currentUser, reply)}
                    likeStatus={commentLikeStatuses[reply.id]}
                    likeLoading={commentLikeLoadingID === reply.id}
                    deleting={deletingCommentID === reply.id}
                    onToggleLike={() => onToggleCommentLike(reply.id)}
                    onDelete={() => onDeleteComment(reply)}
                    onOpenAuthor={() => onOpenAuthor(reply.author.id)}
                  />
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-text">暂无回复。</p>
          )}
        </div>
      )}
    </article>
  );
}

function CommentBody({
  comment,
  loggedIn,
  canDelete,
  likeStatus,
  likeLoading,
  deleting,
  onToggleLike,
  onDelete,
  onOpenAuthor
}: {
  comment: Comment;
  loggedIn: boolean;
  canDelete: boolean;
  likeStatus?: CommentLikeStatus;
  likeLoading: boolean;
  deleting: boolean;
  onToggleLike: () => void;
  onDelete: () => void;
  onOpenAuthor: () => void;
}) {
  const liked = likeStatus?.liked ?? false;
  const likeCount = likeStatus?.like_count ?? comment.like_count;

  return (
    <>
      <div className="comment-head">
        <div className="avatar tiny">{initialsFromName(comment.author.nickname || comment.author.username)}</div>
        <div>
          <strong>{comment.author.nickname || comment.author.username}</strong>
          <button className="link-button" type="button" onClick={onOpenAuthor}>
            @{comment.author.username}
          </button>
        </div>
        <time>{formatDate(comment.created_at)}</time>
      </div>
      {comment.reply_to_user_id > 0 && <p className="reply-target">回复用户 #{comment.reply_to_user_id}</p>}
      <p className="comment-content">{comment.content}</p>
      <div className="comment-meta">
        <span>#{comment.id}</span>
        <span>{likeCount} 赞</span>
      </div>
      <div className="comment-control-row">
        <button
          className={liked ? "primary-button mini" : "secondary-button mini"}
          type="button"
          onClick={onToggleLike}
          disabled={!loggedIn || likeLoading || deleting}
          aria-pressed={liked}
        >
          {likeLoading ? "处理中..." : liked ? "取消点赞" : "点赞"}
        </button>
        {canDelete && (
          <button className="danger-button mini" type="button" onClick={onDelete} disabled={deleting || likeLoading}>
            {deleting ? "删除中..." : "删除"}
          </button>
        )}
      </div>
    </>
  );
}

function initials(user: User) {
  const source = user.nickname || user.username;
  return source.slice(0, 2).toUpperCase();
}

function initialsFromName(source: string) {
  return source.slice(0, 2).toUpperCase();
}

function canDeleteComment(user: User | null, comment: Comment) {
  return Boolean(user && (user.id === comment.user_id || user.role === "admin"));
}

function visibleCommentIDs(comments: Comment[], repliesByComment: Record<number, Comment[]>) {
  const ids = new Set<number>();
  for (const comment of comments) {
    ids.add(comment.id);
  }
  for (const replies of Object.values(repliesByComment)) {
    for (const reply of replies) {
      ids.add(reply.id);
    }
  }
  return Array.from(ids);
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
