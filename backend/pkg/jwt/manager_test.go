package jwt

import (
	"strings"
	"testing"
	"time"
)

func TestGenerateAndParse(t *testing.T) {
	manager, err := NewManager("secret", "feedlab", time.Hour)
	if err != nil {
		t.Fatalf("new manager: %v", err)
	}

	token, expiresAt, err := manager.Generate(12, "user")
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}
	if token == "" {
		t.Fatal("expected token")
	}
	if !expiresAt.After(time.Now()) {
		t.Fatal("expected future expiration")
	}

	claims, err := manager.Parse(token)
	if err != nil {
		t.Fatalf("parse token: %v", err)
	}
	if claims.UserID != 12 || claims.Role != "user" {
		t.Fatalf("unexpected claims: %+v", claims)
	}
}

func TestParseRejectsTamperedToken(t *testing.T) {
	manager, err := NewManager("secret", "feedlab", time.Hour)
	if err != nil {
		t.Fatalf("new manager: %v", err)
	}

	token, _, err := manager.Generate(12, "user")
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	replacement := "x"
	if strings.HasSuffix(token, "x") {
		replacement = "y"
	}
	tampered := strings.TrimSuffix(token, token[len(token)-1:]) + replacement
	if _, err := manager.Parse(tampered); err == nil {
		t.Fatal("expected tampered token to fail")
	}
}
