package db

import (
	"fmt"

	"feedlab/backend/internal/config"

	amqp "github.com/rabbitmq/amqp091-go"
)

func NewRabbitMQ(cfg config.RabbitMQConfig) (*amqp.Connection, error) {
	if !cfg.Enabled {
		return nil, nil
	}
	conn, err := amqp.Dial(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("connect rabbitmq: %w", err)
	}
	return conn, nil
}
