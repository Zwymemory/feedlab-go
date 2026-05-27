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
		{method: http.MethodGet, path: "/api/v1/users/1/followed"},
		{method: http.MethodPost, path: "/api/v1/users/1/follow"},
		{method: http.MethodDelete, path: "/api/v1/users/1/follow"},
		{method: http.MethodPost, path: "/api/v1/posts/1/comments"},
		{method: http.MethodGet, path: "/api/v1/comments/1/liked"},
		{method: http.MethodPost, path: "/api/v1/comments/1/like"},
		{method: http.MethodDelete, path: "/api/v1/comments/1/like"},
		{method: http.MethodDelete, path: "/api/v1/comments/1"},
		{method: http.MethodGet, path: "/api/v1/cache/posts/1/status"},
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

func TestPublicUserRoutesRegister(t *testing.T) {
	engine := New(Dependencies{
		Config: &config.Config{
			Server: config.ServerConfig{Mode: "test"},
			JWT:    config.JWTConfig{Secret: "test-secret", Issuer: "feedlab", ExpiresHours: 2},
		},
		Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	})

	expected := map[string]bool{
		http.MethodGet + " /api/v1/users/:id":       false,
		http.MethodGet + " /api/v1/users/:id/posts": false,
	}
	for _, route := range engine.Routes() {
		key := route.Method + " " + route.Path
		if _, ok := expected[key]; ok {
			expected[key] = true
		}
	}

	for route, found := range expected {
		if !found {
			t.Fatalf("expected public route %s to be registered", route)
		}
	}
}
