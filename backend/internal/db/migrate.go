package db

import (
	"fmt"

	"feedlab/backend/internal/model"

	"gorm.io/gorm"
)

func AutoMigrate(mysql *gorm.DB) error {
	if err := mysql.AutoMigrate(&model.User{}, &model.Post{}); err != nil {
		return fmt.Errorf("auto migrate mysql: %w", err)
	}
	return nil
}
