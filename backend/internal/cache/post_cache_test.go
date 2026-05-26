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

func TestRankHotPostsKey(t *testing.T) {
	if RankHotPostsKey != "rank:hot_posts" {
		t.Fatalf("unexpected hot posts key: %q", RankHotPostsKey)
	}
}

func TestPostViewCountKey(t *testing.T) {
	got := PostViewCountKey(42)
	want := "post:view_count:42"
	if got != want {
		t.Fatalf("unexpected key: got %q want %q", got, want)
	}
}
