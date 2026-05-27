package mq

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"feedlab/backend/internal/event"

	amqp "github.com/rabbitmq/amqp091-go"
)

type NotificationPublisher struct {
	conn  *amqp.Connection
	queue string
	log   *slog.Logger
}

func NewNotificationPublisher(conn *amqp.Connection, queue string, log *slog.Logger) *NotificationPublisher {
	return &NotificationPublisher{conn: conn, queue: queue, log: log}
}

func (p *NotificationPublisher) PublishNotification(ctx context.Context, evt event.NotificationEvent) error {
	if p == nil || p.conn == nil {
		return nil
	}
	body, err := json.Marshal(evt)
	if err != nil {
		return fmt.Errorf("marshal notification event: %w", err)
	}

	ch, err := p.conn.Channel()
	if err != nil {
		return fmt.Errorf("open rabbitmq channel: %w", err)
	}
	defer ch.Close()

	if _, err := ch.QueueDeclare(p.queue, true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare notification queue: %w", err)
	}

	err = ch.PublishWithContext(ctx, "", p.queue, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		MessageId:    evt.MessageID,
		Timestamp:    time.Now(),
		Body:         body,
	})
	if err != nil {
		return fmt.Errorf("publish notification event: %w", err)
	}
	if p.log != nil {
		p.log.Debug("notification event published", "message_id", evt.MessageID, "type", evt.Type)
	}
	return nil
}
