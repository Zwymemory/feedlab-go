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

func TestPostCommentsKey(t *testing.T) {
	got := PostCommentsKey(42, 2, 20)
	want := "post:comments:42:page:2:size:20"
	if got != want {
		t.Fatalf("unexpected key: got %q want %q", got, want)
	}
}

func TestCommentRepliesKey(t *testing.T) {
	got := CommentRepliesKey(7, 1, 10)
	want := "comment:replies:7:page:1:size:10"
	if got != want {
		t.Fatalf("unexpected key: got %q want %q", got, want)
	}
}
