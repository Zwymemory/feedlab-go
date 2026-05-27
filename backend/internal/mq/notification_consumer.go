package mq

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"

	"feedlab/backend/internal/event"
	"feedlab/backend/internal/service"

	amqp "github.com/rabbitmq/amqp091-go"
)

type NotificationConsumer struct {
	conn    *amqp.Connection
	queue   string
	service *service.NotificationService
	log     *slog.Logger
}

func NewNotificationConsumer(conn *amqp.Connection, queue string, service *service.NotificationService, log *slog.Logger) *NotificationConsumer {
	return &NotificationConsumer{conn: conn, queue: queue, service: service, log: log}
}

func (c *NotificationConsumer) Start(ctx context.Context) error {
	if c == nil || c.conn == nil {
		return nil
	}
	ch, err := c.conn.Channel()
	if err != nil {
		return err
	}
	if _, err := ch.QueueDeclare(c.queue, true, false, false, false, nil); err != nil {
		_ = ch.Close()
		return err
	}
	if err := ch.Qos(8, 0, false); err != nil {
		_ = ch.Close()
		return err
	}
	deliveries, err := ch.Consume(c.queue, "feedlab-notification-worker", false, false, false, false, nil)
	if err != nil {
		_ = ch.Close()
		return err
	}

	go func() {
		defer ch.Close()
		for {
			select {
			case <-ctx.Done():
				return
			case msg, ok := <-deliveries:
				if !ok {
					return
				}
				c.handle(ctx, msg)
			}
		}
	}()
	return nil
}

func (c *NotificationConsumer) handle(ctx context.Context, msg amqp.Delivery) {
	var evt event.NotificationEvent
	if err := json.Unmarshal(msg.Body, &evt); err != nil {
		c.log.Warn("discard invalid notification message", "error", err)
		_ = msg.Nack(false, false)
		return
	}
	if err := c.service.CreateFromEvent(ctx, evt); err != nil {
		if errors.Is(err, service.ErrBadRequest) {
			c.log.Warn("discard invalid notification event", "message_id", evt.MessageID, "error", err)
			_ = msg.Nack(false, false)
			return
		}
		c.log.Error("consume notification message failed", "message_id", evt.MessageID, "error", err)
		_ = msg.Nack(false, true)
		return
	}
	_ = msg.Ack(false)
}
