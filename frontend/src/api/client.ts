import type {
  ApiResponse,
  Comment,
  CommentLikeStatus,
  CommentList,
  CollectStatus,
  CreateCommentPayload,
  CreatePostPayload,
  DeleteCommentResult,
  FeedPostList,
  HealthStatus,
  LikeStatus,
  LoginPayload,
  LoginResult,
  NotificationList,
  Post,
  PostList,
  ReadNotificationResult,
  FollowStatus,
  PublicUser,
  PublicUserList,
  RegisterPayload,
  UploadedMedia,
  UnreadNotificationCount,
  User
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const API_BASE_LABEL = API_BASE_URL || "Vite proxy -> http://localhost:8080";
const TOKEN_KEY = "feedlab_access_token";

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE" | "PATCH";
  body?: unknown;
  token?: string | null;
};

export class ApiError extends Error {
  status: number;
  code?: number;

  constructor(message: string, status: number, code?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  headers.set("Accept", "application/json");

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as ApiResponse<T>)
    : null;

  if (!response.ok || !payload || payload.code !== 0) {
    throw new ApiError(
      payload?.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.code
    );
  }

  return payload.data;
}

async function upload<T>(path: string, formData: FormData, token: string): Promise<T> {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as ApiResponse<T>)
    : null;

  if (!response.ok || !payload || payload.code !== 0) {
    throw new ApiError(
      payload?.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.code
    );
  }

  return payload.data;
}

export const tokenStore = {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const api = {
  baseURL: API_BASE_LABEL,
  health() {
    return request<HealthStatus>("/healthz");
  },
  register(payload: RegisterPayload) {
    return request<User>("/api/v1/auth/register", {
      method: "POST",
      body: payload
    });
  },
  login(payload: LoginPayload) {
    return request<LoginResult>("/api/v1/auth/login", {
      method: "POST",
      body: payload
    });
  },
  me(token: string) {
    return request<User>("/api/v1/users/me", { token });
  },
  publicUser(userID: number) {
    return request<PublicUser>(`/api/v1/users/${userID}`);
  },
  listUserPosts(userID: number, page = 1, pageSize = 10) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize)
    });
    return request<PostList>(`/api/v1/users/${userID}/posts?${params.toString()}`);
  },
  listUserLikedPosts(userID: number, page = 1, pageSize = 10) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize)
    });
    return request<PostList>(`/api/v1/users/${userID}/likes?${params.toString()}`);
  },
  listUserCollectedPosts(userID: number, page = 1, pageSize = 10) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize)
    });
    return request<PostList>(`/api/v1/users/${userID}/collects?${params.toString()}`);
  },
  followUser(userID: number, token: string) {
    return request<FollowStatus>(`/api/v1/users/${userID}/follow`, {
      method: "POST",
      token
    });
  },
  unfollowUser(userID: number, token: string) {
    return request<FollowStatus>(`/api/v1/users/${userID}/follow`, {
      method: "DELETE",
      token
    });
  },
  userFollowed(userID: number, token: string) {
    return request<FollowStatus>(`/api/v1/users/${userID}/followed`, { token });
  },
  listFollowers(userID: number, page = 1, pageSize = 10) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize)
    });
    return request<PublicUserList>(`/api/v1/users/${userID}/followers?${params.toString()}`);
  },
  listFollowing(userID: number, page = 1, pageSize = 10) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize)
    });
    return request<PublicUserList>(`/api/v1/users/${userID}/following?${params.toString()}`);
  },
  listPosts(page = 1, pageSize = 10) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize)
    });
    return request<PostList>(`/api/v1/posts?${params.toString()}`);
  },
  hotPosts(limit = 10) {
    const params = new URLSearchParams({ limit: String(limit) });
    return request<PostList>(`/api/v1/posts/hot?${params.toString()}`);
  },
  feedPosts(cursor = "", limit = 10) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) {
      params.set("cursor", cursor);
    }
    return request<FeedPostList>(`/api/v1/feed/posts?${params.toString()}`);
  },
  createPost(payload: CreatePostPayload, token: string) {
    return request<Post>("/api/v1/posts", {
      method: "POST",
      body: payload,
      token
    });
  },
  uploadMedia(file: File, token: string) {
    const formData = new FormData();
    formData.set("file", file);
    return upload<UploadedMedia>("/api/v1/uploads/media", formData, token);
  },
  postDetail(postID: number) {
    return request<Post>(`/api/v1/posts/${postID}`);
  },
  likePost(postID: number, token: string) {
    return request<LikeStatus>(`/api/v1/posts/${postID}/like`, {
      method: "POST",
      token
    });
  },
  unlikePost(postID: number, token: string) {
    return request<LikeStatus>(`/api/v1/posts/${postID}/like`, {
      method: "DELETE",
      token
    });
  },
  postLiked(postID: number, token: string) {
    return request<LikeStatus>(`/api/v1/posts/${postID}/liked`, { token });
  },
  collectPost(postID: number, token: string) {
    return request<CollectStatus>(`/api/v1/posts/${postID}/collect`, {
      method: "POST",
      token
    });
  },
  uncollectPost(postID: number, token: string) {
    return request<CollectStatus>(`/api/v1/posts/${postID}/collect`, {
      method: "DELETE",
      token
    });
  },
  postCollected(postID: number, token: string) {
    return request<CollectStatus>(`/api/v1/posts/${postID}/collected`, { token });
  },
  listComments(postID: number, page = 1, pageSize = 10) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize)
    });
    return request<CommentList>(`/api/v1/posts/${postID}/comments?${params.toString()}`);
  },
  createComment(postID: number, payload: CreateCommentPayload, token: string) {
    return request<Comment>(`/api/v1/posts/${postID}/comments`, {
      method: "POST",
      body: payload,
      token
    });
  },
  listReplies(commentID: number, page = 1, pageSize = 10) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize)
    });
    return request<CommentList>(`/api/v1/comments/${commentID}/replies?${params.toString()}`);
  },
  commentLiked(commentID: number, token: string) {
    return request<CommentLikeStatus>(`/api/v1/comments/${commentID}/liked`, { token });
  },
  likeComment(commentID: number, token: string) {
    return request<CommentLikeStatus>(`/api/v1/comments/${commentID}/like`, {
      method: "POST",
      token
    });
  },
  unlikeComment(commentID: number, token: string) {
    return request<CommentLikeStatus>(`/api/v1/comments/${commentID}/like`, {
      method: "DELETE",
      token
    });
  },
  deleteComment(commentID: number, token: string) {
    return request<DeleteCommentResult>(`/api/v1/comments/${commentID}`, {
      method: "DELETE",
      token
    });
  },
  notifications(token: string, page = 1, pageSize = 10, unreadOnly = false) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      unread_only: String(unreadOnly)
    });
    return request<NotificationList>(`/api/v1/notifications?${params.toString()}`, { token });
  },
  unreadNotifications(token: string) {
    return request<UnreadNotificationCount>("/api/v1/notifications/unread-count", { token });
  },
  markNotificationRead(notificationID: number, token: string) {
    return request<ReadNotificationResult>(`/api/v1/notifications/${notificationID}/read`, {
      method: "PATCH",
      token
    });
  },
  markAllNotificationsRead(token: string) {
    return request<ReadNotificationResult>("/api/v1/notifications/read-all", {
      method: "PATCH",
      token
    });
  }
};
