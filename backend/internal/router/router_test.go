package router

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"feedlab/backend/internal/config"
)

func TestLikeRoutesRegister(t *testing.T) {
	engine := New(Dependencies{
		Config: &config.Config{
			Server: config.ServerConfig{Mode: "test"},
			JWT:    config.JWTConfig{Secret: "test-secret", Issuer: "feedlab", ExpiresHours: 2},
		},
		Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/posts/1/liked", nil)
	rec := httptest.NewRecorder()
	engine.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected liked route to require auth, got %d", rec.Code)
	}
}
