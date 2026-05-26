import type {
  ApiResponse,
  CreatePostPayload,
  HealthStatus,
  LoginPayload,
  LoginResult,
  Post,
  PostList,
  RegisterPayload,
  User
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const API_BASE_LABEL = API_BASE_URL || "Vite proxy -> http://localhost:8080";
const TOKEN_KEY = "feedlab_access_token";

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
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
  listPosts(page = 1, pageSize = 10) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize)
    });
    return request<PostList>(`/api/v1/posts?${params.toString()}`);
  },
  createPost(payload: CreatePostPayload, token: string) {
    return request<Post>("/api/v1/posts", {
      method: "POST",
      body: payload,
      token
    });
  }
};
