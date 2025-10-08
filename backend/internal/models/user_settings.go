package models

import (
	"time"
)

type UserSettings struct {
	ID                   uint      `json:"id" gorm:"primaryKey"`
	TwinAName           string    `json:"twin_a_name" gorm:"default:'Twin A'"`
	TwinBName           string    `json:"twin_b_name" gorm:"default:'Twin B'"`
	TwinAColor          string    `json:"twin_a_color" gorm:"default:'blue'"`
	TwinBColor          string    `json:"twin_b_color" gorm:"default:'pink'"`
	DefaultTimerInterval int       `json:"default_timer_interval" gorm:"default:100"`
	Theme               string    `json:"theme" gorm:"default:'system'"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}