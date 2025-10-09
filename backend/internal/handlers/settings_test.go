package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"twinfeed-backend/internal/database"
	"twinfeed-backend/internal/models"
)

type SettingsHandlerTestSuite struct {
	suite.Suite
	db     *gorm.DB
	router *gin.Engine
}

func (suite *SettingsHandlerTestSuite) SetupSuite() {
	gin.SetMode(gin.TestMode)

	// Create in-memory SQLite database for testing
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	suite.Require().NoError(err)

	// Auto-migrate the schema
	err = db.AutoMigrate(&models.FeedSession{}, &models.UserSettings{})
	suite.Require().NoError(err)

	suite.db = db

	// Set the database instance for handlers
	database.DB = db

	// Setup router
	suite.router = gin.New()
	suite.router.GET("/settings", GetSettings)
	suite.router.PUT("/settings", UpdateSettings)
	suite.router.POST("/settings/reset", ResetSettings)
}

func (suite *SettingsHandlerTestSuite) TearDownTest() {
	// Clean up database after each test
	suite.db.Exec("DELETE FROM user_settings")
}

func (suite *SettingsHandlerTestSuite) TestGetSettingsCreateDefault() {
	// Test getting settings when none exist (should create defaults)
	req := httptest.NewRequest("GET", "/settings", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response models.UserSettings
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	// Check default values
	assert.Equal(suite.T(), "Twin A", response.TwinAName)
	assert.Equal(suite.T(), "Twin B", response.TwinBName)
	assert.Equal(suite.T(), "blue", response.TwinAColor)
	assert.Equal(suite.T(), "pink", response.TwinBColor)
	assert.Equal(suite.T(), 100, response.DefaultTimerInterval)
	assert.Equal(suite.T(), "system", response.Theme)
	assert.NotZero(suite.T(), response.ID)

	// Verify settings were actually created in database
	var count int64
	suite.db.Model(&models.UserSettings{}).Count(&count)
	assert.Equal(suite.T(), int64(1), count)
}

func (suite *SettingsHandlerTestSuite) TestGetSettingsExisting() {
	// Create existing settings
	existingSettings := models.UserSettings{
		TwinAName:            "Alice",
		TwinBName:            "Bob",
		TwinAColor:           "red",
		TwinBColor:           "green",
		DefaultTimerInterval: 200,
		Theme:                "dark",
	}
	suite.db.Create(&existingSettings)

	req := httptest.NewRequest("GET", "/settings", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response models.UserSettings
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), "Alice", response.TwinAName)
	assert.Equal(suite.T(), "Bob", response.TwinBName)
	assert.Equal(suite.T(), "red", response.TwinAColor)
	assert.Equal(suite.T(), "green", response.TwinBColor)
	assert.Equal(suite.T(), 200, response.DefaultTimerInterval)
	assert.Equal(suite.T(), "dark", response.Theme)
}

func (suite *SettingsHandlerTestSuite) TestUpdateSettingsCreateNew() {
	// Test updating settings when none exist (should create new)
	updateData := models.UserSettings{
		TwinAName:            "Charlie",
		TwinBName:            "David",
		TwinAColor:           "yellow",
		TwinBColor:           "purple",
		DefaultTimerInterval: 150,
		Theme:                "light",
	}

	body, err := json.Marshal(updateData)
	suite.Require().NoError(err)

	req := httptest.NewRequest("PUT", "/settings", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response models.UserSettings
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), updateData.TwinAName, response.TwinAName)
	assert.Equal(suite.T(), updateData.TwinBName, response.TwinBName)
	assert.Equal(suite.T(), updateData.TwinAColor, response.TwinAColor)
	assert.Equal(suite.T(), updateData.TwinBColor, response.TwinBColor)
	assert.Equal(suite.T(), updateData.DefaultTimerInterval, response.DefaultTimerInterval)
	assert.Equal(suite.T(), updateData.Theme, response.Theme)
	assert.NotZero(suite.T(), response.ID)
}

func (suite *SettingsHandlerTestSuite) TestUpdateSettingsExisting() {
	// Create existing settings
	existingSettings := models.UserSettings{
		TwinAName:            "Alice",
		TwinBName:            "Bob",
		TwinAColor:           "red",
		TwinBColor:           "green",
		DefaultTimerInterval: 200,
		Theme:                "dark",
	}
	suite.db.Create(&existingSettings)

	// Update the settings
	updateData := models.UserSettings{
		TwinAName:            "Updated Alice",
		TwinBName:            "Updated Bob",
		TwinAColor:           "orange",
		TwinBColor:           "teal",
		DefaultTimerInterval: 300,
		Theme:                "light",
	}

	body, err := json.Marshal(updateData)
	suite.Require().NoError(err)

	req := httptest.NewRequest("PUT", "/settings", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response models.UserSettings
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), updateData.TwinAName, response.TwinAName)
	assert.Equal(suite.T(), updateData.TwinBName, response.TwinBName)
	assert.Equal(suite.T(), updateData.TwinAColor, response.TwinAColor)
	assert.Equal(suite.T(), updateData.TwinBColor, response.TwinBColor)
	assert.Equal(suite.T(), updateData.DefaultTimerInterval, response.DefaultTimerInterval)
	assert.Equal(suite.T(), updateData.Theme, response.Theme)
	assert.Equal(suite.T(), existingSettings.ID, response.ID) // ID should remain the same

	// Verify only one settings record exists
	var count int64
	suite.db.Model(&models.UserSettings{}).Count(&count)
	assert.Equal(suite.T(), int64(1), count)
}

func (suite *SettingsHandlerTestSuite) TestUpdateSettingsInvalidJSON() {
	req := httptest.NewRequest("PUT", "/settings", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
}

func (suite *SettingsHandlerTestSuite) TestResetSettingsCreateNew() {
	// Test resetting settings when none exist (should create defaults)
	req := httptest.NewRequest("POST", "/settings/reset", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response models.UserSettings
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	// Check default values
	assert.Equal(suite.T(), "Twin A", response.TwinAName)
	assert.Equal(suite.T(), "Twin B", response.TwinBName)
	assert.Equal(suite.T(), "blue", response.TwinAColor)
	assert.Equal(suite.T(), "pink", response.TwinBColor)
	assert.Equal(suite.T(), 100, response.DefaultTimerInterval)
	assert.Equal(suite.T(), "system", response.Theme)
	assert.NotZero(suite.T(), response.ID)
}

func (suite *SettingsHandlerTestSuite) TestResetSettingsExisting() {
	// Create existing custom settings
	existingSettings := models.UserSettings{
		TwinAName:            "Custom Name A",
		TwinBName:            "Custom Name B",
		TwinAColor:           "custom color",
		TwinBColor:           "another custom color",
		DefaultTimerInterval: 999,
		Theme:                "custom theme",
	}
	suite.db.Create(&existingSettings)

	req := httptest.NewRequest("POST", "/settings/reset", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response models.UserSettings
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	// Check that settings have been reset to defaults
	assert.Equal(suite.T(), "Twin A", response.TwinAName)
	assert.Equal(suite.T(), "Twin B", response.TwinBName)
	assert.Equal(suite.T(), "blue", response.TwinAColor)
	assert.Equal(suite.T(), "pink", response.TwinBColor)
	assert.Equal(suite.T(), 100, response.DefaultTimerInterval)
	assert.Equal(suite.T(), "system", response.Theme)
	assert.Equal(suite.T(), existingSettings.ID, response.ID) // ID should remain the same

	// Verify only one settings record exists
	var count int64
	suite.db.Model(&models.UserSettings{}).Count(&count)
	assert.Equal(suite.T(), int64(1), count)
}

func (suite *SettingsHandlerTestSuite) TestSettingsValidationEdgeCases() {
	tests := []struct {
		name         string
		settingsData map[string]interface{}
		expectStatus int
	}{
		{
			name: "empty twin names",
			settingsData: map[string]interface{}{
				"twin_a_name":            "",
				"twin_b_name":            "",
				"twin_a_color":           "blue",
				"twin_b_color":           "pink",
				"default_timer_interval": 100,
				"theme":                  "system",
			},
			expectStatus: http.StatusOK, // Empty names should be allowed
		},
		{
			name: "zero timer interval",
			settingsData: map[string]interface{}{
				"twin_a_name":            "Twin A",
				"twin_b_name":            "Twin B",
				"twin_a_color":           "blue",
				"twin_b_color":           "pink",
				"default_timer_interval": 0,
				"theme":                  "system",
			},
			expectStatus: http.StatusOK, // Should be allowed, validation can be done client-side
		},
		{
			name: "negative timer interval",
			settingsData: map[string]interface{}{
				"twin_a_name":            "Twin A",
				"twin_b_name":            "Twin B",
				"twin_a_color":           "blue",
				"twin_b_color":           "pink",
				"default_timer_interval": -100,
				"theme":                  "system",
			},
			expectStatus: http.StatusOK, // Should be allowed, validation can be done client-side
		},
	}

	for _, tt := range tests {
		suite.Run(tt.name, func() {
			body, err := json.Marshal(tt.settingsData)
			suite.Require().NoError(err)

			req := httptest.NewRequest("PUT", "/settings", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			suite.router.ServeHTTP(w, req)

			assert.Equal(suite.T(), tt.expectStatus, w.Code)
		})
	}
}

func TestSettingsHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(SettingsHandlerTestSuite))
}
