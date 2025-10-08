package models

import (
	"time"
)

type FeedSession struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Twin      string    `json:"twin" gorm:"not null" validate:"required,oneof=A B"`
	Side      string    `json:"side" gorm:"not null" validate:"required,oneof=Left Right"`
	Duration  int       `json:"duration" gorm:"not null" validate:"required,min=1"`
	StartTime time.Time `json:"start_time" gorm:"not null" validate:"required"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName specifies the table name for the FeedSession model
func (FeedSession) TableName() string {
	return "feed_sessions"
}