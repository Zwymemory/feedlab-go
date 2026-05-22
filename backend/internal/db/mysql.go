package db

import (
	"database/sql"
	"fmt"
	"time"

	"feedlab/backend/internal/config"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func NewMySQL(cfg config.MySQLConfig) (*gorm.DB, error) {
	gormDB, err := gorm.Open(mysql.Open(cfg.DSN()), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("open mysql: %w", err)
	}

	sqlDB, err := gormDB.DB()
	if err != nil {
		return nil, fmt.Errorf("get mysql sql db: %w", err)
	}
	applyPool(sqlDB, cfg)

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping mysql: %w", err)
	}
	return gormDB, nil
}

func applyPool(sqlDB *sql.DB, cfg config.MySQLConfig) {
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetConnMaxLifetime(time.Hour)
}
