package middleware

import "testing"

func TestLoginRateLimitKey(t *testing.T) {
	got := LoginRateLimitKey("127.0.0.1")
	want := "rate_limit:login:127.0.0.1"
	if got != want {
		t.Fatalf("unexpected key: got %q want %q", got, want)
	}
}
