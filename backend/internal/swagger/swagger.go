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
			"description": "FeedLab V1 content community backend API.",
		},
		"servers": []gin.H{
			{"url": "http://localhost:8080", "description": "Local development"},
		},
		"tags": []gin.H{
			{"name": "health", "description": "Service health checks"},
			{"name": "auth", "description": "Register and login"},
			{"name": "users", "description": "Current user APIs"},
			{"name": "posts", "description": "Post publishing and reading"},
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
	}
}

func paths() gin.H {
	return gin.H{
		"/healthz": gin.H{
			"get": operation("health", "Health check", "Check API, MySQL and Redis availability.", nil, nil, responseMap("200", "success", "500", "dependency unhealthy")),
		},
		"/api/v1/auth/register": gin.H{
			"post": operation("auth", "Register user", "Create a FeedLab user account with bcrypt password hashing.", schemaRef("RegisterRequest"), nil, responseMap("201", "created", "400", "invalid request", "409", "resource conflict")),
		},
		"/api/v1/auth/login": gin.H{
			"post": operation("auth", "Login user", "Login with email and password, then return an access token.", schemaRef("LoginRequest"), nil, responseMap("200", "success", "400", "invalid request", "401", "invalid credentials")),
		},
		"/api/v1/users/me": gin.H{
			"get": operation("users", "Current user profile", "Return the current user profile from JWT context.", nil, bearerSecurity(), responseMap("200", "success", "401", "invalid token")),
		},
		"/api/v1/posts": gin.H{
			"get":  operation("posts", "List published posts", "List published posts by page and page_size.", nil, nil, responseMap("200", "success", "400", "invalid query")),
			"post": operation("posts", "Create post", "Create a post for the current user and update user post count in one transaction.", schemaRef("CreatePostRequest"), bearerSecurity(), responseMap("201", "created", "400", "invalid request", "401", "invalid token")),
		},
		"/api/v1/posts/{id}": gin.H{
			"get":    operationWithID("posts", "Post detail", "Return a published post detail.", nil, responseMap("200", "success", "400", "invalid id", "404", "not found")),
			"delete": operationWithID("posts", "Delete post", "Soft delete a post. Only the author or admin can delete it.", bearerSecurity(), responseMap("200", "success", "401", "invalid token", "403", "permission denied", "404", "not found")),
		},
	}
}

func operation(tag string, summary string, description string, requestBody gin.H, security any, responses gin.H) gin.H {
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
				"application/json": gin.H{"schema": requestBody},
			},
		}
	}
	if security != nil {
		op["security"] = security
	}
	return op
}

func operationWithID(tag string, summary string, description string, security any, responses gin.H) gin.H {
	op := operation(tag, summary, description, nil, security, responses)
	op["parameters"] = []gin.H{
		{
			"name":        "id",
			"in":          "path",
			"required":    true,
			"description": "resource id",
			"schema":      gin.H{"type": "integer", "format": "uint64", "minimum": 1},
		},
	}
	return op
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
  <title>FeedLab Swagger Docs</title>
  <style>
    :root { color: #17202a; background: #edf1f6; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: linear-gradient(135deg, #f7f9fc 0%, #e7ecf3 100%); }
    main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 40px; }
    header { padding: 28px; border: 1px solid rgba(38,54,76,.12); border-radius: 8px; background: rgba(255,255,255,.86); box-shadow: 0 24px 60px rgba(37,52,72,.12); }
    h1 { margin: 8px 0 10px; font-size: clamp(34px, 5vw, 64px); line-height: 1; letter-spacing: 0; }
    p { color: #5d6c7f; line-height: 1.7; }
    a { color: #1e64d8; font-weight: 800; }
    .eyebrow { color: #667589; font-size: 12px; font-weight: 900; text-transform: uppercase; }
    .toolbar { display: flex; gap: 12px; flex-wrap: wrap; margin: 20px 0; }
    .toolbar a, .toolbar button { min-height: 42px; padding: 0 16px; border: 1px solid rgba(38,54,76,.14); border-radius: 8px; background: #fff; color: #263444; text-decoration: none; font: inherit; font-weight: 800; cursor: pointer; }
    .docs { display: grid; gap: 14px; }
    .operation { border: 1px solid rgba(38,54,76,.12); border-radius: 8px; background: rgba(255,255,255,.9); overflow: hidden; box-shadow: 0 18px 44px rgba(37,52,72,.08); }
    .operation summary { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 14px; align-items: center; padding: 18px; cursor: pointer; }
    .method { display: inline-grid; place-items: center; min-height: 34px; border-radius: 8px; color: white; font-weight: 900; }
    .GET { background: #2f7dff; } .POST { background: #00a878; } .DELETE { background: #e05a47; }
    .path { font-family: "SFMono-Regular", Consolas, monospace; overflow-wrap: anywhere; font-weight: 800; }
    .details { padding: 0 18px 18px 116px; color: #536276; }
    .tag { display: inline-block; margin-right: 8px; padding: 4px 8px; border-radius: 999px; background: #eef2f7; color: #536276; font-size: 12px; font-weight: 800; }
    code, pre { font-family: "SFMono-Regular", Consolas, monospace; }
    pre { overflow: auto; padding: 14px; border-radius: 8px; background: #17202a; color: #edf1f6; }
  </style>
</head>
<body>
  <main>
    <header>
      <span class="eyebrow">OpenAPI 3.0</span>
      <h1>FeedLab Swagger Docs</h1>
      <p>V1 API 文档，覆盖健康检查、用户注册登录、JWT 鉴权、帖子发布/列表/详情/删除。原始 OpenAPI JSON 可用于导入 Postman、Apifox 或 Swagger UI。</p>
      <div class="toolbar">
        <a href="/swagger/doc.json" target="_blank" rel="noreferrer">查看 doc.json</a>
        <button id="expand">展开全部接口</button>
      </div>
    </header>
    <section class="docs" id="docs"></section>
  </main>
  <script>
    async function loadDocs() {
      const spec = await fetch('/swagger/doc.json').then((res) => res.json());
      const docs = document.querySelector('#docs');
      const methods = ['get', 'post', 'put', 'delete', 'patch'];
      for (const [path, ops] of Object.entries(spec.paths)) {
        for (const method of methods) {
          const op = ops[method];
          if (!op) continue;
          const detail = document.createElement('details');
          detail.className = 'operation';
          const upper = method.toUpperCase();
          detail.innerHTML = '<summary><span class="method ' + upper + '">' + upper + '</span><span><span class="path">' + path + '</span><br><strong>' + op.summary + '</strong></span></summary>' +
            '<div class="details"><span class="tag">' + (op.tags || []).join(', ') + '</span><p>' + op.description + '</p><strong>Responses</strong><pre>' + JSON.stringify(op.responses, null, 2) + '</pre></div>';
          docs.appendChild(detail);
        }
      }
      document.querySelector('#expand').addEventListener('click', () => {
        document.querySelectorAll('details').forEach((item) => item.open = true);
      });
    }
    loadDocs();
  </script>
</body>
</html>`
