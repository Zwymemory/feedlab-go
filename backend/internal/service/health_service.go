package service

import (
	"context"
	"database/sql"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type HealthService struct {
	mysql *gorm.DB
	redis *redis.Client
}

type HealthResult struct {
	API   string `json:"api"`
	MySQL string `json:"mysql"`
	Redis string `json:"redis"`
}

func NewHealthService(mysql *gorm.DB, redis *redis.Client) *HealthService {
	return &HealthService{mysql: mysql, redis: redis}
}

func (s *HealthService) Check(ctx context.Context) (HealthResult, bool) {
	result := HealthResult{
		API:   "ok",
		MySQL: "ok",
		Redis: "ok",
	}
	ok := true

	sqlDB, err := s.mysql.DB()
	if err != nil {
		result.MySQL = "error: " + err.Error()
		ok = false
	} else if err := sqlDB.PingContext(ctx); err != nil && err != sql.ErrConnDone {
		result.MySQL = "error: " + err.Error()
		ok = false
	}

	if err := s.redis.Ping(ctx).Err(); err != nil {
		result.Redis = "error: " + err.Error()
		ok = false
	}

	return result, ok
}
