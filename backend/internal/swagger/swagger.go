package swagger

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(engine *gin.Engine) {
	engine.GET("/swagger", redirectToIndex)
	engine.GET("/swagger/", index)
	engine.GET("/swagger/index.html", index)
	engine.GET("/swagger/doc.json", doc)
}

func redirectToIndex(c *gin.Context) {
	c.Redirect(http.StatusMovedPermanently, "/swagger/index.html")
}

func index(c *gin.Context) {
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(indexHTML))
}

func doc(c *gin.Context) {
	c.JSON(http.StatusOK, spec())
}

func spec() gin.H {
	return gin.H{
		"openapi": "3.0.3",
		"info": gin.H{
			"title":       "FeedLab API",
			"version":     "1.0.0",
			"description": "FeedLab content community backend API.",
		},
		"servers": []gin.H{
			{"url": "http://localhost:8080", "description": "Local development"},
		},
		"tags": []gin.H{
			{"name": "health", "description": "Service health checks"},
			{"name": "auth", "description": "Register and login"},
			{"name": "users", "description": "Current and public user APIs"},
			{"name": "posts", "description": "Post publishing and reading"},
			{"name": "feed", "description": "Cursor-based post feed"},
			{"name": "likes", "description": "Post like interactions"},
			{"name": "collects", "description": "Post collect interactions"},
			{"name": "follows", "description": "User follow relationships"},
			{"name": "comments", "description": "Post comments and replies"},
			{"name": "comment_likes", "description": "Comment like interactions"},
		},
		"components": gin.H{
			"securitySchemes": gin.H{
				"BearerAuth": gin.H{
					"type":         "http",
					"scheme":       "bearer",
					"bearerFormat": "JWT",
				},
			},
			"schemas": schemas(),
		},
		"paths": paths(),
	}
}

func schemas() gin.H {
	return gin.H{
		"Response": gin.H{
			"type":     "object",
			"required": []string{"code", "message", "data"},
			"properties": gin.H{
				"code":    gin.H{"type": "integer", "example": 0},
				"message": gin.H{"type": "string", "example": "success"},
				"data":    gin.H{"nullable": true},
			},
		},
		"RegisterRequest": gin.H{
			"type":     "object",
			"required": []string{"username", "email", "password"},
			"properties": gin.H{
				"username": gin.H{"type": "string", "minLength": 3, "maxLength": 50, "example": "alice"},
				"email":    gin.H{"type": "string", "format": "email", "example": "alice@example.com"},
				"password": gin.H{"type": "string", "minLength": 6, "maxLength": 72, "example": "secret123"},
				"nickname": gin.H{"type": "string", "maxLength": 50, "example": "Alice"},
			},
		},
		"LoginRequest": gin.H{
			"type":     "object",
			"required": []string{"email", "password"},
			"properties": gin.H{
				"email":    gin.H{"type": "string", "format": "email", "example": "alice@example.com"},
				"password": gin.H{"type": "string", "minLength": 6, "maxLength": 72, "example": "secret123"},
			},
		},
		"CreatePostRequest": gin.H{
			"type":     "object",
			"required": []string{"title", "content"},
			"properties": gin.H{
				"title":        gin.H{"type": "string", "maxLength": 120, "example": "FeedLab 第一篇帖子"},
				"content":      gin.H{"type": "string", "example": "这是 V1 帖子模块创建的内容。"},
				"cover_url":    gin.H{"type": "string", "example": ""},
				"content_type": gin.H{"type": "string", "enum": []string{"article", "image", "video"}, "example": "article"},
				"status":       gin.H{"type": "string", "enum": []string{"draft", "published"}, "example": "published"},
			},
		},
		"CreateCommentRequest": gin.H{
			"type":     "object",
			"required": []string{"content"},
			"properties": gin.H{
				"content":   gin.H{"type": "string", "maxLength": 1000, "example": "这是一条评论。"},
				"parent_id": gin.H{"type": "integer", "format": "uint64", "example": 0},
			},
		},
	}
}

func paths() gin.H {
	return gin.H{
		"/healthz": gin.H{
			"get": operation("health", "Health check", "Check API, MySQL and Redis availability.", nil, nil, nil, responseMap("200", "success", "500", "dependency unhealthy")),
		},
		"/api/v1/auth/register": gin.H{
			"post": operation("auth", "Register user", "Create a FeedLab user account with bcrypt password hashing.", schemaRef("RegisterRequest"), gin.H{
				"username": "alice",
				"email":    "alice@example.com",
				"password": "secret123",
				"nickname": "Alice",
			}, nil, responseMap("201", "created", "400", "invalid request", "409", "resource conflict")),
		},
		"/api/v1/auth/login": gin.H{
			"post": operation("auth", "Login user", "Login with email and password, then return an access token.", schemaRef("LoginRequest"), gin.H{
				"email":    "alice@example.com",
				"password": "secret123",
			}, nil, responseMap("200", "success", "400", "invalid request", "401", "invalid credentials")),
		},
		"/api/v1/users/me": gin.H{
			"get": operation("users", "Current user profile", "Return the current user profile from JWT context.", nil, nil, bearerSecurity(), responseMap("200", "success", "401", "invalid token")),
		},
		"/api/v1/users/{id}": gin.H{
			"get": operationWithID("users", "Public user profile", "Return a public user profile without email, role or password fields.", nil, responseMap("200", "success", "400", "invalid id", "404", "not found")),
		},
		"/api/v1/users/{id}/posts": gin.H{
			"get": operationWithIDAndParameters("users", "List user posts", "List published posts created by a user.", nil, responseMap("200", "success", "400", "invalid query", "404", "not found"), []gin.H{
				queryParameter("page", "Page number, starting from 1.", 1, 1, 0),
				queryParameter("page_size", "Page size, default 10, max 50.", 10, 1, 50),
			}),
		},
		"/api/v1/users/{id}/likes": gin.H{
			"get": operationWithIDAndParameters("likes", "List user liked posts", "List published posts liked by a user.", nil, responseMap("200", "success", "400", "invalid query", "404", "not found"), []gin.H{
				queryParameter("page", "Page number, starting from 1.", 1, 1, 0),
				queryParameter("page_size", "Page size, default 10, max 50.", 10, 1, 50),
			}),
		},
		"/api/v1/users/{id}/collects": gin.H{
			"get": operationWithIDAndParameters("collects", "List user collected posts", "List published posts collected by a user.", nil, responseMap("200", "success", "400", "invalid query", "404", "not found"), []gin.H{
				queryParameter("page", "Page number, starting from 1.", 1, 1, 0),
				queryParameter("page_size", "Page size, default 10, max 50.", 10, 1, 50),
			}),
		},
		"/api/v1/users/{id}/follow": gin.H{
			"post":   operationWithID("follows", "Follow user", "Follow a user idempotently and update follower/following counts in one transaction.", bearerSecurity(), responseMap("200", "success", "400", "cannot follow self", "401", "invalid token", "404", "not found")),
			"delete": operationWithID("follows", "Unfollow user", "Cancel a user follow idempotently and update follower/following counts only when a relationship existed.", bearerSecurity(), responseMap("200", "success", "400", "cannot unfollow self", "401", "invalid token", "404", "not found")),
		},
		"/api/v1/users/{id}/followed": gin.H{
			"get": operationWithID("follows", "Check user followed", "Check whether the current user has followed another user.", bearerSecurity(), responseMap("200", "success", "400", "cannot check self", "401", "invalid token", "404", "not found")),
		},
		"/api/v1/users/{id}/followers": gin.H{
			"get": operationWithIDAndParameters("follows", "List followers", "List public users who follow the target user.", nil, responseMap("200", "success", "400", "invalid query", "404", "not found"), []gin.H{
				queryParameter("page", "Page number, starting from 1.", 1, 1, 0),
				queryParameter("page_size", "Page size, default 10, max 50.", 10, 1, 50),
			}),
		},
		"/api/v1/users/{id}/following": gin.H{
			"get": operationWithIDAndParameters("follows", "List following", "List public users followed by the target user.", nil, responseMap("200", "success", "400", "invalid query", "404", "not found"), []gin.H{
				queryParameter("page", "Page number, starting from 1.", 1, 1, 0),
				queryParameter("page_size", "Page size, default 10, max 50.", 10, 1, 50),
			}),
		},
		"/api/v1/posts": gin.H{
			"get": operationWithParameters("posts", "List published posts", "List published posts by page and page_size.", nil, responseMap("200", "success", "400", "invalid query"), []gin.H{
				queryParameter("page", "Page number, starting from 1.", 1, 1, 0),
				queryParameter("page_size", "Page size, default 10, max 50.", 10, 1, 50),
			}),
			"post": operation("posts", "Create post", "Create a post for the current user and update user post count in one transaction.", schemaRef("CreatePostRequest"), gin.H{
				"title":        "FeedLab 第一篇帖子",
				"content":      "这是 V1 帖子模块创建的内容。",
				"cover_url":    "",
				"content_type": "article",
				"status":       "published",
			}, bearerSecurity(), responseMap("201", "created", "400", "invalid request", "401", "invalid token")),
		},
		"/api/v1/feed/posts": gin.H{
			"get": operationWithParameters("feed", "Cursor feed posts", "List published posts by cursor for infinite-scroll feed.", nil, responseMap("200", "success", "400", "invalid query"), []gin.H{
				stringQueryParameter("cursor", "Cursor returned by previous request."),
				queryParameter("limit", "Max number of feed posts, default 10, max 50.", 10, 1, 50),
			}),
		},
		"/api/v1/posts/{id}": gin.H{
			"get":    operationWithID("posts", "Post detail", "Return a published post detail.", nil, responseMap("200", "success", "400", "invalid id", "404", "not found")),
			"delete": operationWithID("posts", "Delete post", "Soft delete a post. Only the author or admin can delete it.", bearerSecurity(), responseMap("200", "success", "401", "invalid token", "403", "permission denied", "404", "not found")),
		},
		"/api/v1/posts/hot": gin.H{
			"get": operationWithIDAndParameters("posts", "List hot posts", "List hot published posts from Redis ZSet with MySQL fallback.", nil, responseMap("200", "success", "400", "invalid query"), []gin.H{
				queryParameter("limit", "Max number of hot posts, default 10, max 50.", 10, 1, 50),
			}),
		},
		"/api/v1/posts/{id}/like": gin.H{
			"post":   operationWithID("likes", "Like post", "Like a published post idempotently and increase like_count only once.", bearerSecurity(), responseMap("200", "success", "401", "invalid token", "404", "not found")),
			"delete": operationWithID("likes", "Unlike post", "Cancel a post like idempotently and decrease like_count only when a like existed.", bearerSecurity(), responseMap("200", "success", "401", "invalid token", "404", "not found")),
		},
		"/api/v1/posts/{id}/liked": gin.H{
			"get": operationWithID("likes", "Check post liked", "Check whether the current user has liked a published post.", bearerSecurity(), responseMap("200", "success", "401", "invalid token", "404", "not found")),
		},
		"/api/v1/posts/{id}/collect": gin.H{
			"post":   operationWithID("collects", "Collect post", "Collect a published post idempotently and increase collect_count only once.", bearerSecurity(), responseMap("200", "success", "401", "invalid token", "404", "not found")),
			"delete": operationWithID("collects", "Uncollect post", "Cancel a post collect idempotently and decrease collect_count only when a collect existed.", bearerSecurity(), responseMap("200", "success", "401", "invalid token", "404", "not found")),
		},
		"/api/v1/posts/{id}/collected": gin.H{
			"get": operationWithID("collects", "Check post collected", "Check whether the current user has collected a published post.", bearerSecurity(), responseMap("200", "success", "401", "invalid token", "404", "not found")),
		},
		"/api/v1/posts/{id}/comments": gin.H{
			"post": operationWithIDAndBody("comments", "Create comment", "Create a root comment or second-level reply for a published post.", schemaRef("CreateCommentRequest"), gin.H{
				"content":   "这是一条评论。",
				"parent_id": 0,
			}, bearerSecurity(), responseMap("201", "created", "400", "invalid request", "401", "invalid token", "404", "not found")),
			"get": operationWithIDAndParameters("comments", "List post comments", "List root comments for a published post.", nil, responseMap("200", "success", "400", "invalid query", "404", "not found"), []gin.H{
				queryParameter("page", "Page number, starting from 1.", 1, 1, 0),
				queryParameter("page_size", "Page size, default 10, max 50.", 10, 1, 50),
			}),
		},
		"/api/v1/comments/{id}/replies": gin.H{
			"get": operationWithIDAndParameters("comments", "List comment replies", "List second-level replies for a root comment.", nil, responseMap("200", "success", "400", "invalid query", "404", "not found"), []gin.H{
				queryParameter("page", "Page number, starting from 1.", 1, 1, 0),
				queryParameter("page_size", "Page size, default 10, max 50.", 10, 1, 50),
			}),
		},
		"/api/v1/comments/{id}/like": gin.H{
			"post":   operationWithID("comment_likes", "Like comment", "Like a published comment idempotently and increase like_count only once.", bearerSecurity(), responseMap("200", "success", "401", "invalid token", "404", "not found")),
			"delete": operationWithID("comment_likes", "Unlike comment", "Cancel a comment like idempotently and decrease like_count only when a like existed.", bearerSecurity(), responseMap("200", "success", "401", "invalid token", "404", "not found")),
		},
		"/api/v1/comments/{id}/liked": gin.H{
			"get": operationWithID("comment_likes", "Check comment liked", "Check whether the current user has liked a published comment.", bearerSecurity(), responseMap("200", "success", "401", "invalid token", "404", "not found")),
		},
		"/api/v1/comments/{id}": gin.H{
			"delete": operationWithID("comments", "Delete comment", "Soft delete a comment. Deleting a root comment also soft deletes its visible replies.", bearerSecurity(), responseMap("200", "success", "401", "invalid token", "403", "permission denied", "404", "not found")),
		},
	}
}

func operation(tag string, summary string, description string, requestBody gin.H, requestExample any, security any, responses gin.H) gin.H {
	op := gin.H{
		"tags":        []string{tag},
		"summary":     summary,
		"description": description,
		"responses":   responses,
	}
	if requestBody != nil {
		op["requestBody"] = gin.H{
			"required": true,
			"content": gin.H{
				"application/json": gin.H{
					"schema":  requestBody,
					"example": requestExample,
				},
			},
		}
	}
	if security != nil {
		op["security"] = security
	}
	return op
}

func operationWithParameters(tag string, summary string, description string, security any, responses gin.H, parameters []gin.H) gin.H {
	op := operation(tag, summary, description, nil, nil, security, responses)
	op["parameters"] = parameters
	return op
}

func operationWithID(tag string, summary string, description string, security any, responses gin.H) gin.H {
	op := operation(tag, summary, description, nil, nil, security, responses)
	op["parameters"] = []gin.H{pathIDParameter()}
	return op
}

func operationWithIDAndBody(tag string, summary string, description string, requestBody gin.H, requestExample any, security any, responses gin.H) gin.H {
	op := operation(tag, summary, description, requestBody, requestExample, security, responses)
	op["parameters"] = []gin.H{pathIDParameter()}
	return op
}

func operationWithIDAndParameters(tag string, summary string, description string, security any, responses gin.H, parameters []gin.H) gin.H {
	op := operation(tag, summary, description, nil, nil, security, responses)
	op["parameters"] = append([]gin.H{pathIDParameter()}, parameters...)
	return op
}

func pathIDParameter() gin.H {
	return gin.H{
		"name":        "id",
		"in":          "path",
		"required":    true,
		"description": "resource id",
		"schema":      gin.H{"type": "integer", "format": "uint64", "minimum": 1},
	}
}

func queryParameter(name string, description string, example int, minimum int, maximum int) gin.H {
	schema := gin.H{
		"type":    "integer",
		"minimum": minimum,
		"example": example,
	}
	if maximum > 0 {
		schema["maximum"] = maximum
	}
	return gin.H{
		"name":        name,
		"in":          "query",
		"required":    false,
		"description": description,
		"schema":      schema,
	}
}

func stringQueryParameter(name string, description string) gin.H {
	return gin.H{
		"name":        name,
		"in":          "query",
		"required":    false,
		"description": description,
		"schema": gin.H{
			"type": "string",
		},
	}
}

func responseMap(values ...string) gin.H {
	responses := gin.H{}
	for i := 0; i+1 < len(values); i += 2 {
		responses[values[i]] = gin.H{
			"description": values[i+1],
			"content": gin.H{
				"application/json": gin.H{
					"schema": schemaRef("Response"),
				},
			},
		}
	}
	return responses
}

func schemaRef(name string) gin.H {
	return gin.H{"$ref": "#/components/schemas/" + name}
}

func bearerSecurity() []gin.H {
	return []gin.H{{"BearerAuth": []string{}}}
}

const indexHTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FeedLab Swagger UI</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #f7f9fc; }
    .topbar { display: none; }
    .swagger-ui .info { margin: 28px 0; }
    .swagger-ui .scheme-container { border-radius: 8px; box-shadow: none; border: 1px solid rgba(38,54,76,.12); }
    .notice { padding: 12px 28px; color: #536276; background: #eef4ff; border-bottom: 1px solid rgba(38,54,76,.1); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .notice strong { color: #17202a; }
  </style>
</head>
<body>
  <div class="notice">
    <strong>FeedLab API:</strong>
    点击接口右侧的 Try it out 可以直接测试。登录后复制 access_token，点击 Authorize，粘贴 token 即可，Swagger UI 会自动加 Bearer 前缀。
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: "/swagger/doc.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        persistAuthorization: true,
        displayRequestDuration: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`
