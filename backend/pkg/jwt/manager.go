package jwt

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("expired token")
)

type Manager struct {
	secret []byte
	issuer string
	ttl    time.Duration
}

type Claims struct {
	UserID    uint64 `json:"user_id"`
	Role      string `json:"role"`
	Issuer    string `json:"iss"`
	Subject   string `json:"sub"`
	ExpiresAt int64  `json:"exp"`
	IssuedAt  int64  `json:"iat"`
}

func NewManager(secret string, issuer string, ttl time.Duration) (*Manager, error) {
	if strings.TrimSpace(secret) == "" {
		return nil, fmt.Errorf("jwt secret is required")
	}
	if issuer == "" {
		issuer = "feedlab"
	}
	if ttl <= 0 {
		ttl = 2 * time.Hour
	}
	return &Manager{secret: []byte(secret), issuer: issuer, ttl: ttl}, nil
}

func (m *Manager) Generate(userID uint64, role string) (string, time.Time, error) {
	now := time.Now()
	expiresAt := now.Add(m.ttl)
	header := map[string]string{
		"alg": "HS256",
		"typ": "JWT",
	}
	claims := Claims{
		UserID:    userID,
		Role:      role,
		Issuer:    m.issuer,
		Subject:   strconv.FormatUint(userID, 10),
		ExpiresAt: expiresAt.Unix(),
		IssuedAt:  now.Unix(),
	}

	headerJSON, err := json.Marshal(header)
	if err != nil {
		return "", time.Time{}, err
	}
	claimsJSON, err := json.Marshal(claims)
	if err != nil {
		return "", time.Time{}, err
	}

	headerPart := base64.RawURLEncoding.EncodeToString(headerJSON)
	claimsPart := base64.RawURLEncoding.EncodeToString(claimsJSON)
	unsigned := headerPart + "." + claimsPart
	signature := m.sign(unsigned)

	return unsigned + "." + signature, expiresAt, nil
}

func (m *Manager) Parse(token string) (*Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, ErrInvalidToken
	}

	unsigned := parts[0] + "." + parts[1]
	expected := m.sign(unsigned)
	if !hmac.Equal([]byte(expected), []byte(parts[2])) {
		return nil, ErrInvalidToken
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, ErrInvalidToken
	}

	var claims Claims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, ErrInvalidToken
	}
	if claims.Issuer != m.issuer {
		return nil, ErrInvalidToken
	}
	if claims.ExpiresAt <= time.Now().Unix() {
		return nil, ErrExpiredToken
	}
	if claims.UserID == 0 {
		return nil, ErrInvalidToken
	}

	return &claims, nil
}

func (m *Manager) sign(unsigned string) string {
	mac := hmac.New(sha256.New, m.secret)
	mac.Write([]byte(unsigned))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
