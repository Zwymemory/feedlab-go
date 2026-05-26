package db

import (
	"fmt"

	"feedlab/backend/internal/model"

	"gorm.io/gorm"
)

func AutoMigrate(mysql *gorm.DB) error {
	if err := mysql.AutoMigrate(&model.User{}, &model.UserFollow{}, &model.Post{}, &model.PostLike{}, &model.PostCollect{}, &model.Comment{}, &model.CommentLike{}); err != nil {
		return fmt.Errorf("auto migrate mysql: %w", err)
	}
	return nil
}
