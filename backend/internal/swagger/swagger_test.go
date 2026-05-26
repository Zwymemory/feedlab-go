package swagger

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSwaggerDocRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	RegisterRoutes(engine)

	req := httptest.NewRequest(http.MethodGet, "/swagger/doc.json", nil)
	rec := httptest.NewRecorder()
	engine.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode openapi json: %v", err)
	}
	if body["openapi"] != "3.0.3" {
		t.Fatalf("unexpected openapi version: %v", body["openapi"])
	}

	paths, ok := body["paths"].(map[string]any)
	if !ok {
		t.Fatal("expected paths object")
	}
	for _, path := range []string{"/healthz", "/api/v1/auth/register", "/api/v1/posts", "/api/v1/users/{id}", "/api/v1/users/{id}/posts", "/api/v1/posts/{id}/like", "/api/v1/posts/{id}/liked", "/api/v1/users/{id}/likes", "/api/v1/posts/{id}/collect", "/api/v1/posts/{id}/collected", "/api/v1/users/{id}/collects", "/api/v1/users/{id}/follow", "/api/v1/users/{id}/followed", "/api/v1/users/{id}/followers", "/api/v1/users/{id}/following", "/api/v1/posts/{id}/comments", "/api/v1/comments/{id}/replies", "/api/v1/comments/{id}/like", "/api/v1/comments/{id}/liked", "/api/v1/comments/{id}"} {
		if _, ok := paths[path]; !ok {
			t.Fatalf("expected path %s in openapi document", path)
		}
	}

	posts, ok := paths["/api/v1/posts"].(map[string]any)
	if !ok {
		t.Fatal("expected /api/v1/posts object")
	}
	list, ok := posts["get"].(map[string]any)
	if !ok {
		t.Fatal("expected GET /api/v1/posts operation")
	}
	parameters, ok := list["parameters"].([]any)
	if !ok || len(parameters) != 2 {
		t.Fatalf("expected page query parameters, got %#v", list["parameters"])
	}
}

func TestSwaggerIndexRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	RegisterRoutes(engine)

	req := httptest.NewRequest(http.MethodGet, "/swagger/index.html", nil)
	rec := httptest.NewRecorder()
	engine.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if rec.Header().Get("Content-Type") != "text/html; charset=utf-8" {
		t.Fatalf("unexpected content type: %s", rec.Header().Get("Content-Type"))
	}
	if body := rec.Body.String(); !strings.Contains(body, "SwaggerUIBundle") || !strings.Contains(body, "/swagger/doc.json") {
		t.Fatal("expected swagger ui html to load /swagger/doc.json")
	}
}
