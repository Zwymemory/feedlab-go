package router

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"feedlab/backend/internal/config"
)

func TestAuthenticatedInteractionRoutesRegister(t *testing.T) {
	engine := New(Dependencies{
		Config: &config.Config{
			Server: config.ServerConfig{Mode: "test"},
			JWT:    config.JWTConfig{Secret: "test-secret", Issuer: "feedlab", ExpiresHours: 2},
		},
		Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	})

	routes := []struct {
		method string
		path   string
	}{
		{method: http.MethodGet, path: "/api/v1/posts/1/liked"},
		{method: http.MethodGet, path: "/api/v1/posts/1/collected"},
		{method: http.MethodPost, path: "/api/v1/posts/1/collect"},
		{method: http.MethodDelete, path: "/api/v1/posts/1/collect"},
		{method: http.MethodPost, path: "/api/v1/posts/1/comments"},
		{method: http.MethodDelete, path: "/api/v1/comments/1"},
	}

	for _, route := range routes {
		req := httptest.NewRequest(route.method, route.path, nil)
		rec := httptest.NewRecorder()
		engine.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected %s %s to require auth, got %d", route.method, route.path, rec.Code)
		}
	}
}
