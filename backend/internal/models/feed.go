package models

import (
	"time"
)

type FeedSession struct {
	ID        uint        `json:"id" gorm:"primaryKey"`
	Twin      string      `json:"twin" gorm:"not null" validate:"required,oneof=A B"`
	Events    []FeedEvent `json:"events" gorm:"foreignKey:FeedSessionID;constraint:OnDelete:CASCADE"`
	CreatedAt time.Time   `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time   `json:"updated_at" gorm:"autoUpdateTime"`
}

type FeedEvent struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	FeedSessionID uint      `json:"feed_session_id" gorm:"not null"`
	EventType     string    `json:"event_type" gorm:"not null" validate:"required,oneof=start pause end"`
	Side          string    `json:"side" gorm:"not null" validate:"required,oneof=Left Right"`
	Timestamp     time.Time `json:"timestamp" gorm:"not null" validate:"required"`
	CreatedAt     time.Time `json:"created_at" gorm:"autoCreateTime"`
}

// TableName specifies the table name for the FeedSession model
func (FeedSession) TableName() string {
	return "feed_sessions"
}

// TableName specifies the table name for the FeedEvent model
func (FeedEvent) TableName() string {
	return "feed_events"
}

// GetTotalDuration calculates the total feeding duration from events
func (fs *FeedSession) GetTotalDuration() int {
	if len(fs.Events) == 0 {
		return 0
	}

	var totalDuration int
	var startTime *time.Time

	for _, event := range fs.Events {
		switch event.EventType {
		case "start":
			startTime = &event.Timestamp
		case "pause", "end":
			if startTime != nil {
				duration := int(event.Timestamp.Sub(*startTime).Seconds())
				totalDuration += duration
				startTime = nil
			}
		}
	}

	// If session is still active (no pause/end event after last start)
	if startTime != nil {
		duration := int(time.Now().Sub(*startTime).Seconds())
		totalDuration += duration
	}

	return totalDuration
}

// IsActive returns true if the session is currently active (started but not paused/ended)
func (fs *FeedSession) IsActive() bool {
	if len(fs.Events) == 0 {
		return false
	}

	lastEvent := fs.Events[len(fs.Events)-1]
	return lastEvent.EventType == "start"
}
