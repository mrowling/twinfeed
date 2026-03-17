package models

import (
	"time"
)

type SleepSession struct {
	ID        uint         `json:"id" gorm:"primaryKey"`
	Twin      string       `json:"twin" gorm:"not null" validate:"required,oneof=A B"`
	Events    []SleepEvent `json:"events" gorm:"foreignKey:SleepSessionID;constraint:OnDelete:CASCADE"`
	CreatedAt time.Time    `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time    `json:"updated_at" gorm:"autoUpdateTime"`
}

type SleepEvent struct {
	ID             uint      `json:"id" gorm:"primaryKey"`
	SleepSessionID uint      `json:"sleep_session_id" gorm:"not null"`
	EventType      string    `json:"event_type" gorm:"not null" validate:"required,oneof=start pause end"`
	Timestamp      time.Time `json:"timestamp" gorm:"not null" validate:"required"`
	CreatedAt      time.Time `json:"created_at" gorm:"autoCreateTime"`
}

// TableName specifies the table name for the SleepSession model
func (SleepSession) TableName() string {
	return "sleep_sessions"
}

// TableName specifies the table name for the SleepEvent model
func (SleepEvent) TableName() string {
	return "sleep_events"
}

// GetTotalDuration calculates the total sleep duration from events
func (ss *SleepSession) GetTotalDuration() int {
	if len(ss.Events) == 0 {
		return 0
	}

	var totalDuration int
	var startTime *time.Time

	for _, event := range ss.Events {
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
func (ss *SleepSession) IsActive() bool {
	if len(ss.Events) == 0 {
		return false
	}

	lastEvent := ss.Events[len(ss.Events)-1]
	return lastEvent.EventType == "start"
}
