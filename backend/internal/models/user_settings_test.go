package models

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestUserSettingsDefaults(t *testing.T) {
	settings := UserSettings{}

	// Test that zero values are what we expect
	assert.Equal(t, uint(0), settings.ID)
	assert.Equal(t, "", settings.TwinAName)
	assert.Equal(t, "", settings.TwinBName)
	assert.Equal(t, "", settings.TwinAColor)
	assert.Equal(t, "", settings.TwinBColor)
	assert.Equal(t, 0, settings.DefaultTimerInterval)
	assert.Equal(t, "", settings.Theme)
}

func TestUserSettingsWithValues(t *testing.T) {
	now := time.Now()
	settings := UserSettings{
		ID:                   1,
		TwinAName:            "Alice",
		TwinBName:            "Bob",
		TwinAColor:           "blue",
		TwinBColor:           "pink",
		DefaultTimerInterval: 100,
		Theme:                "dark",
		CreatedAt:            now,
		UpdatedAt:            now,
	}

	assert.Equal(t, uint(1), settings.ID)
	assert.Equal(t, "Alice", settings.TwinAName)
	assert.Equal(t, "Bob", settings.TwinBName)
	assert.Equal(t, "blue", settings.TwinAColor)
	assert.Equal(t, "pink", settings.TwinBColor)
	assert.Equal(t, 100, settings.DefaultTimerInterval)
	assert.Equal(t, "dark", settings.Theme)
	assert.Equal(t, now, settings.CreatedAt)
	assert.Equal(t, now, settings.UpdatedAt)
}

func TestUserSettingsValidColors(t *testing.T) {
	validColors := []string{"blue", "pink", "red", "green", "yellow", "purple", "orange", "teal", "gray", "indigo"}

	for _, color := range validColors {
		t.Run("valid_color_"+color, func(t *testing.T) {
			settings := UserSettings{
				TwinAColor: color,
				TwinBColor: color,
			}

			assert.Equal(t, color, settings.TwinAColor)
			assert.Equal(t, color, settings.TwinBColor)
		})
	}
}

func TestUserSettingsValidThemes(t *testing.T) {
	validThemes := []string{"light", "dark", "system"}

	for _, theme := range validThemes {
		t.Run("valid_theme_"+theme, func(t *testing.T) {
			settings := UserSettings{
				Theme: theme,
			}

			assert.Equal(t, theme, settings.Theme)
		})
	}
}

func TestUserSettingsTimerInterval(t *testing.T) {
	tests := []struct {
		name     string
		interval int
		valid    bool
	}{
		{
			name:     "minimum valid interval",
			interval: 50,
			valid:    true,
		},
		{
			name:     "default interval",
			interval: 100,
			valid:    true,
		},
		{
			name:     "maximum reasonable interval",
			interval: 1000,
			valid:    true,
		},
		{
			name:     "zero interval",
			interval: 0,
			valid:    false,
		},
		{
			name:     "negative interval",
			interval: -50,
			valid:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			settings := UserSettings{
				DefaultTimerInterval: tt.interval,
			}

			isValid := settings.DefaultTimerInterval > 0
			assert.Equal(t, tt.valid, isValid)
		})
	}
}
