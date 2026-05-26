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
