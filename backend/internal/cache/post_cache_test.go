package cache

import "testing"

func TestPostDetailKey(t *testing.T) {
	got := PostDetailKey(42)
	want := "post:detail:42"
	if got != want {
		t.Fatalf("unexpected key: got %q want %q", got, want)
	}
}

func TestUserProfileKey(t *testing.T) {
	got := UserProfileKey(7)
	want := "user:profile:7"
	if got != want {
		t.Fatalf("unexpected key: got %q want %q", got, want)
	}
}
