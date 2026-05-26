package service

import (
	"testing"
	"time"

	"feedlab/backend/internal/model"
)

func TestFeedCursorRoundTrip(t *testing.T) {
	post := model.Post{
		ID:        42,
		CreatedAt: time.Date(2026, 5, 26, 12, 0, 0, 123, time.UTC),
	}

	cursor := encodeFeedCursor(post)
	createdAt, postID, err := decodeFeedCursor(cursor)
	if err != nil {
		t.Fatalf("decode cursor: %v", err)
	}
	if postID != post.ID {
		t.Fatalf("unexpected post id: got %d want %d", postID, post.ID)
	}
	if !createdAt.Equal(post.CreatedAt) {
		t.Fatalf("unexpected created_at: got %s want %s", createdAt, post.CreatedAt)
	}
}

func TestDecodeFeedCursorRejectsInvalidValue(t *testing.T) {
	if _, _, err := decodeFeedCursor("not-a-valid-cursor"); err == nil {
		t.Fatal("expected invalid cursor error")
	}
}
