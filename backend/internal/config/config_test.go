package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadConfig(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	body := []byte(`
server:
  addr: ":9090"
mysql:
  host: "127.0.0.1"
  port: 3306
  username: "u"
  password: "p"
  database: "feedlab"
redis:
  addr: "127.0.0.1:6379"
jwt:
  secret: "secret"
`)
	if err := os.WriteFile(path, body, 0o600); err != nil {
		t.Fatalf("write config: %v", err)
	}

	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Server.Addr != ":9090" {
		t.Fatalf("unexpected server addr: %s", cfg.Server.Addr)
	}
	if cfg.MySQL.Charset != "utf8mb4" {
		t.Fatalf("expected default charset, got %s", cfg.MySQL.Charset)
	}
	if cfg.JWT.ExpiresHours != 2 {
		t.Fatalf("expected default jwt expires hours, got %d", cfg.JWT.ExpiresHours)
	}
	if cfg.Redis.PostDetailTTLSeconds != 300 {
		t.Fatalf("expected default post detail ttl seconds, got %d", cfg.Redis.PostDetailTTLSeconds)
	}
	if cfg.Redis.UserProfileTTLSeconds != 600 {
		t.Fatalf("expected default user profile ttl seconds, got %d", cfg.Redis.UserProfileTTLSeconds)
	}
	if cfg.Redis.PostViewTTLSeconds != 86400 {
		t.Fatalf("expected default post view ttl seconds, got %d", cfg.Redis.PostViewTTLSeconds)
	}
	if cfg.Redis.PostViewFlushThreshold != 100 {
		t.Fatalf("expected default post view flush threshold, got %d", cfg.Redis.PostViewFlushThreshold)
	}
	if cfg.Redis.CommentListTTLSeconds != 120 {
		t.Fatalf("expected default comment list ttl seconds, got %d", cfg.Redis.CommentListTTLSeconds)
	}
}
