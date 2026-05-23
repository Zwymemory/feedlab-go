package swagger

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
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
	for _, path := range []string{"/healthz", "/api/v1/auth/register", "/api/v1/posts"} {
		if _, ok := paths[path]; !ok {
			t.Fatalf("expected path %s in openapi document", path)
		}
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
}
