package service

import (
	"context"
	"database/sql"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type HealthService struct {
	mysql    *gorm.DB
	redis    *redis.Client
	rabbitmq *amqp.Connection
}

type HealthResult struct {
	API      string `json:"api"`
	MySQL    string `json:"mysql"`
	Redis    string `json:"redis"`
	RabbitMQ string `json:"rabbitmq"`
}

func NewHealthService(mysql *gorm.DB, redis *redis.Client, rabbitmq *amqp.Connection) *HealthService {
	return &HealthService{mysql: mysql, redis: redis, rabbitmq: rabbitmq}
}

func (s *HealthService) Check(ctx context.Context) (HealthResult, bool) {
	result := HealthResult{
		API:      "ok",
		MySQL:    "ok",
		Redis:    "ok",
		RabbitMQ: "disabled",
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
	if s.rabbitmq != nil {
		if s.rabbitmq.IsClosed() {
			result.RabbitMQ = "error: connection closed"
			ok = false
		} else {
			result.RabbitMQ = "ok"
		}
	}

	return result, ok
}
