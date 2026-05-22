package password

import "testing"

func TestHashAndCompare(t *testing.T) {
	hash, err := Hash("secret123")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	if hash == "secret123" {
		t.Fatal("password hash must not equal raw password")
	}
	if !Compare(hash, "secret123") {
		t.Fatal("expected password to match hash")
	}
	if Compare(hash, "wrong-password") {
		t.Fatal("expected wrong password to fail")
	}
}
