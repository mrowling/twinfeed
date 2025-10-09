package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"twinfeed-backend/internal/database"
	"twinfeed-backend/internal/models"
)

type FeedHandlerTestSuite struct {
	suite.Suite
	db     *gorm.DB
	router *gin.Engine
}

func (suite *FeedHandlerTestSuite) SetupSuite() {
	// Set Gin to test mode
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
	suite.router.POST("/feed", CreateFeed)
	suite.router.GET("/feeds", GetFeeds)
	suite.router.DELETE("/feeds", DeleteAllFeeds)
	suite.router.GET("/health", HealthCheck)
}

func (suite *FeedHandlerTestSuite) TearDownTest() {
	// Clean up database after each test
	suite.db.Exec("DELETE FROM feed_sessions")
	suite.db.Exec("DELETE FROM user_settings")
}

func (suite *FeedHandlerTestSuite) TestCreateFeedSuccess() {
	feedRequest := CreateFeedRequest{
		Twin:      "A",
		Side:      "Left",
		Duration:  300,
		StartTime: time.Now().UTC(),
	}

	body, err := json.Marshal(feedRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/feed", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusCreated, w.Code)

	var response models.FeedSession
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), feedRequest.Twin, response.Twin)
	assert.Equal(suite.T(), feedRequest.Side, response.Side)
	assert.Equal(suite.T(), feedRequest.Duration, response.Duration)
	assert.NotZero(suite.T(), response.ID)
}

func (suite *FeedHandlerTestSuite) TestCreateFeedInvalidTwin() {
	feedRequest := CreateFeedRequest{
		Twin:      "C", // Invalid twin
		Side:      "Left",
		Duration:  300,
		StartTime: time.Now().UTC(),
	}

	body, err := json.Marshal(feedRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/feed", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
}

func (suite *FeedHandlerTestSuite) TestCreateFeedInvalidSide() {
	feedRequest := CreateFeedRequest{
		Twin:      "A",
		Side:      "Middle", // Invalid side
		Duration:  300,
		StartTime: time.Now().UTC(),
	}

	body, err := json.Marshal(feedRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/feed", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
}

func (suite *FeedHandlerTestSuite) TestCreateFeedInvalidDuration() {
	feedRequest := CreateFeedRequest{
		Twin:      "A",
		Side:      "Left",
		Duration:  0, // Invalid duration
		StartTime: time.Now().UTC(),
	}

	body, err := json.Marshal(feedRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/feed", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
}

func (suite *FeedHandlerTestSuite) TestCreateFeedMissingFields() {
	// Test with missing required fields
	invalidRequest := map[string]interface{}{
		"twin": "A",
		// Missing side, duration, start_time
	}

	body, err := json.Marshal(invalidRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/feed", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
}

func (suite *FeedHandlerTestSuite) TestGetFeedsEmpty() {
	req := httptest.NewRequest("GET", "/feeds", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response FeedsResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), int64(0), response.Total)
	assert.Empty(suite.T(), response.Feeds)
}

func (suite *FeedHandlerTestSuite) TestGetFeedsWithData() {
	// Create test feeds
	feeds := []models.FeedSession{
		{
			Twin:      "A",
			Side:      "Left",
			Duration:  300,
			StartTime: time.Now().UTC().Add(-2 * time.Hour),
		},
		{
			Twin:      "B",
			Side:      "Right",
			Duration:  250,
			StartTime: time.Now().UTC().Add(-1 * time.Hour),
		},
		{
			Twin:      "A",
			Side:      "Right",
			Duration:  400,
			StartTime: time.Now().UTC(),
		},
	}

	for _, feed := range feeds {
		suite.db.Create(&feed)
	}

	req := httptest.NewRequest("GET", "/feeds", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response FeedsResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), int64(3), response.Total)
	assert.Len(suite.T(), response.Feeds, 3)

	// Check that feeds are ordered by start_time DESC (newest first)
	assert.True(suite.T(), response.Feeds[0].StartTime.After(response.Feeds[1].StartTime))
	assert.True(suite.T(), response.Feeds[1].StartTime.After(response.Feeds[2].StartTime))
}

func (suite *FeedHandlerTestSuite) TestGetFeedsPagination() {
	// Create multiple test feeds
	for i := 0; i < 5; i++ {
		feed := models.FeedSession{
			Twin:      "A",
			Side:      "Left",
			Duration:  300 + i,
			StartTime: time.Now().UTC().Add(-time.Duration(i) * time.Hour),
		}
		suite.db.Create(&feed)
	}

	// Test with limit
	req := httptest.NewRequest("GET", "/feeds?limit=2", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response FeedsResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), int64(5), response.Total)
	assert.Len(suite.T(), response.Feeds, 2)

	// Test with offset
	req = httptest.NewRequest("GET", "/feeds?limit=2&offset=2", nil)
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), int64(5), response.Total)
	assert.Len(suite.T(), response.Feeds, 2)
}

func (suite *FeedHandlerTestSuite) TestDeleteAllFeedsEmpty() {
	req := httptest.NewRequest("DELETE", "/feeds", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response DeleteResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), int64(0), response.DeletedCount)
	assert.Equal(suite.T(), "All feeding sessions deleted", response.Message)
}

func (suite *FeedHandlerTestSuite) TestDeleteAllFeedsWithData() {
	// Create test feeds
	for i := 0; i < 3; i++ {
		feed := models.FeedSession{
			Twin:      "A",
			Side:      "Left",
			Duration:  300,
			StartTime: time.Now().UTC(),
		}
		suite.db.Create(&feed)
	}

	req := httptest.NewRequest("DELETE", "/feeds", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response DeleteResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), int64(3), response.DeletedCount)
	assert.Equal(suite.T(), "All feeding sessions deleted", response.Message)

	// Verify feeds are actually deleted
	var count int64
	suite.db.Model(&models.FeedSession{}).Count(&count)
	assert.Equal(suite.T(), int64(0), count)
}

func (suite *FeedHandlerTestSuite) TestHealthCheck() {
	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), "healthy", response["status"])
	assert.Equal(suite.T(), "twinfeed-backend", response["service"])
	assert.Contains(suite.T(), response, "timestamp")
}

func TestFeedHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(FeedHandlerTestSuite))
}
