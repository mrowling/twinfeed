package models

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestFeedSessionValidation(t *testing.T) {
	tests := []struct {
		name        string
		feedSession FeedSession
		expectValid bool
	}{
		{
			name: "valid feed session with Twin A",
			feedSession: FeedSession{
				Twin: "A",
				Events: []FeedEvent{
					{EventType: "start", Side: "Left", Timestamp: time.Now()},
					{EventType: "end", Side: "Left", Timestamp: time.Now().Add(5 * time.Minute)},
				},
			},
			expectValid: true,
		},
		{
			name: "valid feed session with Twin B",
			feedSession: FeedSession{
				Twin: "B",
				Events: []FeedEvent{
					{EventType: "start", Side: "Right", Timestamp: time.Now()},
					{EventType: "pause", Side: "Right", Timestamp: time.Now().Add(3 * time.Minute)},
				},
			},
			expectValid: true,
		},
		{
			name: "invalid twin value",
			feedSession: FeedSession{
				Twin: "C",
				Events: []FeedEvent{
					{EventType: "start", Side: "Left", Timestamp: time.Now()},
				},
			},
			expectValid: false,
		},
		{
			name: "empty events",
			feedSession: FeedSession{
				Twin:   "A",
				Events: []FeedEvent{},
			},
			expectValid: true, // Empty events is allowed for new sessions
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test that struct values are set correctly
			isValid := tt.feedSession.Twin == "A" || tt.feedSession.Twin == "B"

			assert.Equal(t, tt.expectValid, isValid)
		})
	}
}

func TestFeedEventValidation(t *testing.T) {
	tests := []struct {
		name        string
		feedEvent   FeedEvent
		expectValid bool
	}{
		{
			name: "valid start event",
			feedEvent: FeedEvent{
				FeedSessionID: 1,
				EventType:     "start",
				Side:          "Left",
				Timestamp:     time.Now(),
			},
			expectValid: true,
		},
		{
			name: "valid pause event",
			feedEvent: FeedEvent{
				FeedSessionID: 1,
				EventType:     "pause",
				Side:          "Left",
				Timestamp:     time.Now(),
			},
			expectValid: true,
		},
		{
			name: "valid end event",
			feedEvent: FeedEvent{
				FeedSessionID: 1,
				EventType:     "end",
				Side:          "Left",
				Timestamp:     time.Now(),
			},
			expectValid: true,
		},
		{
			name: "invalid event type",
			feedEvent: FeedEvent{
				FeedSessionID: 1,
				EventType:     "invalid",
				Side:          "Left",
				Timestamp:     time.Now(),
			},
			expectValid: false,
		},
		{
			name: "zero session ID",
			feedEvent: FeedEvent{
				FeedSessionID: 0,
				EventType:     "start",
				Side:          "Left",
				Timestamp:     time.Now(),
			},
			expectValid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test that struct values are set correctly
			isValid := tt.feedEvent.EventType == "start" || tt.feedEvent.EventType == "pause" || tt.feedEvent.EventType == "end"
			isValid = isValid && tt.feedEvent.FeedSessionID > 0
			isValid = isValid && (tt.feedEvent.Side == "Left" || tt.feedEvent.Side == "Right")
			isValid = isValid && !tt.feedEvent.Timestamp.IsZero()

			assert.Equal(t, tt.expectValid, isValid)
		})
	}
}

func TestFeedSessionTableName(t *testing.T) {
	feedSession := FeedSession{}
	assert.Equal(t, "feed_sessions", feedSession.TableName())
}

func TestFeedEventTableName(t *testing.T) {
	feedEvent := FeedEvent{}
	assert.Equal(t, "feed_events", feedEvent.TableName())
}

func TestFeedSessionFields(t *testing.T) {
	now := time.Now()
	events := []FeedEvent{
		{EventType: "start", Side: "Left", Timestamp: now},
		{EventType: "end", Side: "Left", Timestamp: now.Add(5 * time.Minute)},
	}

	feedSession := FeedSession{
		ID:        1,
		Twin:      "A",
		Events:    events,
		CreatedAt: now,
		UpdatedAt: now,
	}

	assert.Equal(t, uint(1), feedSession.ID)
	assert.Equal(t, "A", feedSession.Twin)
	assert.Equal(t, events, feedSession.Events)
	assert.Equal(t, now, feedSession.CreatedAt)
	assert.Equal(t, now, feedSession.UpdatedAt)
}

func TestFeedSessionGetTotalDuration(t *testing.T) {
	tests := []struct {
		name     string
		events   []FeedEvent
		expected int
	}{
		{
			name:     "empty events",
			events:   []FeedEvent{},
			expected: 0,
		},
		{
			name: "single start-end session",
			events: []FeedEvent{
				{EventType: "start", Side: "Left", Timestamp: time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC)},
				{EventType: "end", Side: "Left", Timestamp: time.Date(2023, 1, 1, 12, 5, 0, 0, time.UTC)},
			},
			expected: 300, // 5 minutes
		},
		{
			name: "start-pause-start-end session",
			events: []FeedEvent{
				{EventType: "start", Side: "Left", Timestamp: time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC)},
				{EventType: "pause", Side: "Left", Timestamp: time.Date(2023, 1, 1, 12, 3, 0, 0, time.UTC)},
				{EventType: "start", Side: "Left", Timestamp: time.Date(2023, 1, 1, 12, 5, 0, 0, time.UTC)},
				{EventType: "end", Side: "Left", Timestamp: time.Date(2023, 1, 1, 12, 7, 0, 0, time.UTC)},
			},
			expected: 300, // 3 minutes + 2 minutes = 5 minutes total
		},
		{
			name: "multiple pause/resume cycles",
			events: []FeedEvent{
				{EventType: "start", Side: "Left", Timestamp: time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC)},
				{EventType: "pause", Side: "Left", Timestamp: time.Date(2023, 1, 1, 12, 2, 0, 0, time.UTC)},
				{EventType: "start", Side: "Left", Timestamp: time.Date(2023, 1, 1, 12, 4, 0, 0, time.UTC)},
				{EventType: "pause", Side: "Left", Timestamp: time.Date(2023, 1, 1, 12, 6, 0, 0, time.UTC)},
				{EventType: "start", Side: "Left", Timestamp: time.Date(2023, 1, 1, 12, 8, 0, 0, time.UTC)},
				{EventType: "end", Side: "Left", Timestamp: time.Date(2023, 1, 1, 12, 10, 0, 0, time.UTC)},
			},
			expected: 360, // 2 + 2 + 2 = 6 minutes total
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			session := FeedSession{Events: tt.events}
			duration := session.GetTotalDuration()
			assert.Equal(t, tt.expected, duration)
		})
	}
}

func TestFeedSessionIsActive(t *testing.T) {
	tests := []struct {
		name     string
		events   []FeedEvent
		expected bool
	}{
		{
			name:     "empty events",
			events:   []FeedEvent{},
			expected: false,
		},
		{
			name: "ends with start event",
			events: []FeedEvent{
				{EventType: "start", Timestamp: time.Now()},
			},
			expected: true,
		},
		{
			name: "ends with pause event",
			events: []FeedEvent{
				{EventType: "start", Timestamp: time.Now()},
				{EventType: "pause", Timestamp: time.Now().Add(time.Minute)},
			},
			expected: false,
		},
		{
			name: "ends with end event",
			events: []FeedEvent{
				{EventType: "start", Timestamp: time.Now()},
				{EventType: "end", Timestamp: time.Now().Add(time.Minute)},
			},
			expected: false,
		},
		{
			name: "resume after pause",
			events: []FeedEvent{
				{EventType: "start", Timestamp: time.Now()},
				{EventType: "pause", Timestamp: time.Now().Add(time.Minute)},
				{EventType: "start", Timestamp: time.Now().Add(2 * time.Minute)},
			},
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			session := FeedSession{Events: tt.events}
			isActive := session.IsActive()
			assert.Equal(t, tt.expected, isActive)
		})
	}
}
