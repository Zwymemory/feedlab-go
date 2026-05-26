export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

export type HealthStatus = {
  api: string;
  mysql: string;
  redis: string;
};

export type User = {
  id: number;
  username: string;
  email?: string;
  nickname: string;
  avatar_url: string;
  bio: string;
  role?: string;
  status?: string;
  follower_count: number;
  following_count: number;
  post_count: number;
  created_at: string;
};

export type PublicUser = Omit<User, "email" | "role" | "status">;

export type Author = {
  id: number;
  username: string;
  nickname: string;
  avatar_url: string;
};

export type Post = {
  id: number;
  user_id: number;
  title: string;
  content: string;
  cover_url: string;
  content_type: "article" | "image" | "video";
  status: "draft" | "published";
  view_count: number;
  like_count: number;
  comment_count: number;
  collect_count: number;
  hot_score: number;
  created_at: string;
  updated_at: string;
  author: Author;
};

export type PostList = {
  items: Post[];
  page: number;
  page_size: number;
  total: number;
};

export type LikeStatus = {
  post_id: number;
  liked: boolean;
  like_count: number;
};

export type CollectStatus = {
  post_id: number;
  collected: boolean;
  collect_count: number;
};

export type Comment = {
  id: number;
  post_id: number;
  user_id: number;
  parent_id: number;
  reply_to_user_id: number;
  content: string;
  like_count: number;
  status: "published";
  created_at: string;
  updated_at: string;
  author: Author;
};

export type CommentList = {
  items: Comment[];
  page: number;
  page_size: number;
  total: number;
};

export type CreateCommentPayload = {
  content: string;
  parent_id?: number;
};

export type CommentLikeStatus = {
  comment_id: number;
  liked: boolean;
  like_count: number;
};

export type DeleteCommentResult = {
  deleted: boolean;
  deleted_count: number;
};

export type CreatePostPayload = {
  title: string;
  content: string;
  cover_url: string;
  content_type: "article";
  status: "draft" | "published";
};

export type LoginResult = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
};

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
  nickname: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};
