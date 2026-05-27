package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"feedlab/backend/internal/config"
	"feedlab/backend/internal/db"
	"feedlab/backend/internal/logger"
	"feedlab/backend/internal/mq"
	"feedlab/backend/internal/repository"
	"feedlab/backend/internal/router"
	"feedlab/backend/internal/service"
)

// @title FeedLab API
// @version 1.0
// @description FeedLab V1 content community backend API.
// @host localhost:8080
// @BasePath /
func main() {
	cfg, err := config.Load("")
	if err != nil {
		slog.Error("load config failed", "error", err)
		os.Exit(1)
	}

	log := logger.New(cfg.Log)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	mysqlDB, err := db.NewMySQL(cfg.MySQL)
	if err != nil {
		log.Error("connect mysql failed", "error", err)
		os.Exit(1)
	}
	if err := db.AutoMigrate(mysqlDB); err != nil {
		log.Error("auto migrate mysql failed", "error", err)
		os.Exit(1)
	}

	redisClient, err := db.NewRedis(ctx, cfg.Redis)
	if err != nil {
		log.Error("connect redis failed", "error", err)
		os.Exit(1)
	}
	defer redisClient.Close()

	rabbitConn, err := db.NewRabbitMQ(cfg.RabbitMQ)
	if err != nil {
		log.Error("connect rabbitmq failed", "error", err)
		os.Exit(1)
	}
	if rabbitConn != nil {
		defer rabbitConn.Close()
		notificationService := service.NewNotificationService(
			repository.NewNotificationRepository(mysqlDB),
			repository.NewUserRepository(mysqlDB),
		)
		consumer := mq.NewNotificationConsumer(rabbitConn, cfg.RabbitMQ.NotificationQueue, notificationService, log)
		if err := consumer.Start(ctx); err != nil {
			log.Error("start notification consumer failed", "error", err)
			os.Exit(1)
		}
		log.Info("notification consumer started", "queue", cfg.RabbitMQ.NotificationQueue)
	}

	engine := router.New(router.Dependencies{
		Config:   cfg,
		Logger:   log,
		MySQL:    mysqlDB,
		Redis:    redisClient,
		RabbitMQ: rabbitConn,
	})

	go func() {
		if err := engine.Run(cfg.Server.Addr); err != nil {
			log.Error("api server stopped", "error", err)
		}
	}()

	log.Info("feedlab api started", "addr", cfg.Server.Addr)

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	cancel()

	log.Info("feedlab api shutting down")
	time.Sleep(300 * time.Millisecond)
}
