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

	// Auto-migrate the schema with new models
	err = db.AutoMigrate(&models.FeedSession{}, &models.FeedEvent{}, &models.UserSettings{})
	suite.Require().NoError(err)

	suite.db = db

	// Set the database instance for handlers
	database.DB = db

	// Setup router with all endpoints
	suite.router = gin.New()
	suite.router.POST("/sessions", CreateFeedSession) // New session endpoint
	suite.router.POST("/events", AddFeedEvent)        // New event endpoint
	suite.router.GET("/feeds", GetFeeds)
	suite.router.DELETE("/feeds", DeleteAllFeeds)
	suite.router.GET("/health", HealthCheck)
}

func (suite *FeedHandlerTestSuite) TearDownTest() {
	// Clean up database after each test
	suite.db.Exec("DELETE FROM feed_events")
	suite.db.Exec("DELETE FROM feed_sessions")
	suite.db.Exec("DELETE FROM user_settings")
}

func (suite *FeedHandlerTestSuite) TestCreateSessionSuccess() {
	sessionRequest := CreateFeedSessionRequest{
		Twin: "A",
	}

	body, err := json.Marshal(sessionRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/sessions", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusCreated, w.Code)

	var response models.FeedSession
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), sessionRequest.Twin, response.Twin)
	assert.Empty(suite.T(), response.Events) // New session should have no events
	assert.NotZero(suite.T(), response.ID)
}

func (suite *FeedHandlerTestSuite) TestAddEventSuccess() {
	// First create a session
	session := models.FeedSession{
		Twin: "A",
	}
	err := suite.db.Create(&session).Error
	suite.Require().NoError(err)

	// Now add an event
	eventRequest := AddFeedEventRequest{
		SessionID: session.ID,
		EventType: "start",
		Timestamp: time.Now().UTC(),
		Side:      "Left",
	}

	body, err := json.Marshal(eventRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/events", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusCreated, w.Code)

	var response models.FeedEvent
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), eventRequest.SessionID, response.FeedSessionID)
	assert.Equal(suite.T(), eventRequest.EventType, response.EventType)
	assert.NotZero(suite.T(), response.ID)
}

func (suite *FeedHandlerTestSuite) TestCreateSessionInvalidTwin() {
	sessionRequest := CreateFeedSessionRequest{
		Twin: "C", // Invalid twin
	}

	body, err := json.Marshal(sessionRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/sessions", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
}

func (suite *FeedHandlerTestSuite) TestAddEventInvalidSessionID() {
	eventRequest := AddFeedEventRequest{
		SessionID: 999, // Non-existent session
		EventType: "start",
		Timestamp: time.Now().UTC(),
		Side:      "Left",
	}

	body, err := json.Marshal(eventRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/events", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusNotFound, w.Code)
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
	// Create test sessions with events
	now := time.Now().UTC()

	session1 := models.FeedSession{
		Twin: "A",
	}
	suite.db.Create(&session1)

	// Add events to session1
	events1 := []models.FeedEvent{
		{FeedSessionID: session1.ID, EventType: "start", Timestamp: now.Add(-2 * time.Hour)},
		{FeedSessionID: session1.ID, EventType: "end", Timestamp: now.Add(-2*time.Hour + 5*time.Minute)},
	}
	for _, event := range events1 {
		suite.db.Create(&event)
	}

	session2 := models.FeedSession{
		Twin: "B",
	}
	suite.db.Create(&session2)

	// Add events to session2
	events2 := []models.FeedEvent{
		{FeedSessionID: session2.ID, EventType: "start", Timestamp: now.Add(-1 * time.Hour)},
		{FeedSessionID: session2.ID, EventType: "pause", Timestamp: now.Add(-1*time.Hour + 4*time.Minute)},
	}
	for _, event := range events2 {
		suite.db.Create(&event)
	}

	req := httptest.NewRequest("GET", "/feeds", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response FeedsResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), int64(2), response.Total)
	assert.Len(suite.T(), response.Feeds, 2)

	// Check that feeds have events
	for _, feed := range response.Feeds {
		assert.NotEmpty(suite.T(), feed.Events)
		// Check that events within each session are ordered by timestamp ASC
		for i := 1; i < len(feed.Events); i++ {
			assert.True(suite.T(), feed.Events[i-1].Timestamp.Before(feed.Events[i].Timestamp) ||
				feed.Events[i-1].Timestamp.Equal(feed.Events[i].Timestamp),
				"Events should be ordered by timestamp ASC")
		}
	}

	// Check feeds are ordered by created_at DESC (newest first)
	assert.True(suite.T(), response.Feeds[0].CreatedAt.After(response.Feeds[1].CreatedAt) ||
		response.Feeds[0].CreatedAt.Equal(response.Feeds[1].CreatedAt))
}

func (suite *FeedHandlerTestSuite) TestGetFeedsPagination() {
	// Create multiple test sessions
	for i := 0; i < 5; i++ {
		session := models.FeedSession{
			Twin: "A",
		}
		suite.db.Create(&session)

		// Add a start event to each session
		event := models.FeedEvent{
			FeedSessionID: session.ID,
			EventType:     "start",
			Side:          "Left",
			Timestamp:     time.Now().UTC().Add(-time.Duration(i) * time.Hour),
		}
		suite.db.Create(&event)
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
	// Create test sessions
	for i := 0; i < 3; i++ {
		session := models.FeedSession{
			Twin: "A",
		}
		suite.db.Create(&session)

		// Add an event to each session
		event := models.FeedEvent{
			FeedSessionID: session.ID,
			EventType:     "start",
			Side:          "Left",
			Timestamp:     time.Now().UTC(),
		}
		suite.db.Create(&event)
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
