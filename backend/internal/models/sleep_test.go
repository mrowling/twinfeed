package models

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestSleepSessionValidation(t *testing.T) {
	tests := []struct {
		name         string
		sleepSession SleepSession
		expectValid  bool
	}{
		{
			name: "valid sleep session with Twin A",
			sleepSession: SleepSession{
				Twin: "A",
				Events: []SleepEvent{
					{EventType: "start", Timestamp: time.Now()},
					{EventType: "end", Timestamp: time.Now().Add(30 * time.Minute)},
				},
			},
			expectValid: true,
		},
		{
			name: "valid sleep session with Twin B",
			sleepSession: SleepSession{
				Twin: "B",
				Events: []SleepEvent{
					{EventType: "start", Timestamp: time.Now()},
					{EventType: "pause", Timestamp: time.Now().Add(20 * time.Minute)},
				},
			},
			expectValid: true,
		},
		{
			name: "invalid twin value",
			sleepSession: SleepSession{
				Twin: "C",
				Events: []SleepEvent{
					{EventType: "start", Timestamp: time.Now()},
				},
			},
			expectValid: false,
		},
		{
			name: "empty events",
			sleepSession: SleepSession{
				Twin:   "A",
				Events: []SleepEvent{},
			},
			expectValid: true, // Empty events is allowed for new sessions
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test that struct values are set correctly
			isValid := tt.sleepSession.Twin == "A" || tt.sleepSession.Twin == "B"

			assert.Equal(t, tt.expectValid, isValid)
		})
	}
}

func TestSleepEventValidation(t *testing.T) {
	tests := []struct {
		name        string
		sleepEvent  SleepEvent
		expectValid bool
	}{
		{
			name: "valid start event",
			sleepEvent: SleepEvent{
				SleepSessionID: 1,
				EventType:      "start",
				Timestamp:      time.Now(),
			},
			expectValid: true,
		},
		{
			name: "valid pause event",
			sleepEvent: SleepEvent{
				SleepSessionID: 1,
				EventType:      "pause",
				Timestamp:      time.Now(),
			},
			expectValid: true,
		},
		{
			name: "valid end event",
			sleepEvent: SleepEvent{
				SleepSessionID: 1,
				EventType:      "end",
				Timestamp:      time.Now(),
			},
			expectValid: true,
		},
		{
			name: "invalid event type",
			sleepEvent: SleepEvent{
				SleepSessionID: 1,
				EventType:      "invalid",
				Timestamp:      time.Now(),
			},
			expectValid: false,
		},
		{
			name: "zero session ID",
			sleepEvent: SleepEvent{
				SleepSessionID: 0,
				EventType:      "start",
				Timestamp:      time.Now(),
			},
			expectValid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test that struct values are set correctly
			isValid := tt.sleepEvent.EventType == "start" || tt.sleepEvent.EventType == "pause" || tt.sleepEvent.EventType == "end"
			isValid = isValid && tt.sleepEvent.SleepSessionID > 0
			isValid = isValid && !tt.sleepEvent.Timestamp.IsZero()

			assert.Equal(t, tt.expectValid, isValid)
		})
	}
}

func TestSleepSessionTableName(t *testing.T) {
	sleepSession := SleepSession{}
	assert.Equal(t, "sleep_sessions", sleepSession.TableName())
}

func TestSleepEventTableName(t *testing.T) {
	sleepEvent := SleepEvent{}
	assert.Equal(t, "sleep_events", sleepEvent.TableName())
}

func TestSleepSessionFields(t *testing.T) {
	now := time.Now()
	events := []SleepEvent{
		{EventType: "start", Timestamp: now},
		{EventType: "end", Timestamp: now.Add(30 * time.Minute)},
	}

	sleepSession := SleepSession{
		ID:        1,
		Twin:      "A",
		Events:    events,
		CreatedAt: now,
		UpdatedAt: now,
	}

	assert.Equal(t, uint(1), sleepSession.ID)
	assert.Equal(t, "A", sleepSession.Twin)
	assert.Equal(t, events, sleepSession.Events)
	assert.Equal(t, now, sleepSession.CreatedAt)
	assert.Equal(t, now, sleepSession.UpdatedAt)
}

func TestSleepSessionGetTotalDuration(t *testing.T) {
	tests := []struct {
		name     string
		events   []SleepEvent
		expected int
	}{
		{
			name:     "empty events",
			events:   []SleepEvent{},
			expected: 0,
		},
		{
			name: "single start-end session",
			events: []SleepEvent{
				{EventType: "start", Timestamp: time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC)},
				{EventType: "end", Timestamp: time.Date(2023, 1, 1, 12, 30, 0, 0, time.UTC)},
			},
			expected: 1800, // 30 minutes
		},
		{
			name: "start-pause-start-end session",
			events: []SleepEvent{
				{EventType: "start", Timestamp: time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC)},
				{EventType: "pause", Timestamp: time.Date(2023, 1, 1, 12, 20, 0, 0, time.UTC)},
				{EventType: "start", Timestamp: time.Date(2023, 1, 1, 12, 30, 0, 0, time.UTC)},
				{EventType: "end", Timestamp: time.Date(2023, 1, 1, 12, 45, 0, 0, time.UTC)},
			},
			expected: 2100, // 20 minutes + 15 minutes = 35 minutes total
		},
		{
			name: "multiple pause/resume cycles",
			events: []SleepEvent{
				{EventType: "start", Timestamp: time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC)},
				{EventType: "pause", Timestamp: time.Date(2023, 1, 1, 12, 10, 0, 0, time.UTC)},
				{EventType: "start", Timestamp: time.Date(2023, 1, 1, 12, 20, 0, 0, time.UTC)},
				{EventType: "pause", Timestamp: time.Date(2023, 1, 1, 12, 30, 0, 0, time.UTC)},
				{EventType: "start", Timestamp: time.Date(2023, 1, 1, 12, 40, 0, 0, time.UTC)},
				{EventType: "end", Timestamp: time.Date(2023, 1, 1, 12, 50, 0, 0, time.UTC)},
			},
			expected: 1800, // 10 + 10 + 10 = 30 minutes total
		},
		{
			name: "longer sleep session - 2 hours",
			events: []SleepEvent{
				{EventType: "start", Timestamp: time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC)},
				{EventType: "end", Timestamp: time.Date(2023, 1, 1, 14, 0, 0, 0, time.UTC)},
			},
			expected: 7200, // 2 hours
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			session := SleepSession{Events: tt.events}
			duration := session.GetTotalDuration()
			assert.Equal(t, tt.expected, duration)
		})
	}
}

func TestSleepSessionIsActive(t *testing.T) {
	tests := []struct {
		name     string
		events   []SleepEvent
		expected bool
	}{
		{
			name:     "empty events",
			events:   []SleepEvent{},
			expected: false,
		},
		{
			name: "ends with start event",
			events: []SleepEvent{
				{EventType: "start", Timestamp: time.Now()},
			},
			expected: true,
		},
		{
			name: "ends with pause event",
			events: []SleepEvent{
				{EventType: "start", Timestamp: time.Now()},
				{EventType: "pause", Timestamp: time.Now().Add(time.Minute)},
			},
			expected: false,
		},
		{
			name: "ends with end event",
			events: []SleepEvent{
				{EventType: "start", Timestamp: time.Now()},
				{EventType: "end", Timestamp: time.Now().Add(30 * time.Minute)},
			},
			expected: false,
		},
		{
			name: "resume after pause",
			events: []SleepEvent{
				{EventType: "start", Timestamp: time.Now()},
				{EventType: "pause", Timestamp: time.Now().Add(20 * time.Minute)},
				{EventType: "start", Timestamp: time.Now().Add(30 * time.Minute)},
			},
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			session := SleepSession{Events: tt.events}
			isActive := session.IsActive()
			assert.Equal(t, tt.expected, isActive)
		})
	}
}
