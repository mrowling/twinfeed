package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
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

	// Create in-memory SQLite database for testing with foreign keys enabled
	db, err := gorm.Open(sqlite.Open(":memory:?_fk=1"), &gorm.Config{})
	suite.Require().NoError(err)

	// Enable foreign key constraints for SQLite
	db.Exec("PRAGMA foreign_keys = ON")

	// Auto-migrate the schema with new models
	err = db.AutoMigrate(&models.FeedSession{}, &models.FeedEvent{}, &models.UserSettings{})
	suite.Require().NoError(err)

	suite.db = db

	// Set the database instance for handlers
	database.DB = db

	// Setup router with all endpoints
	suite.router = gin.New()
	
	// API v1 group
	v1 := suite.router.Group("/api/v1")
	{
		v1.POST("/sessions", CreateFeedSession)
		v1.POST("/events", AddFeedEvent)
		v1.PUT("/sessions/:id", UpdateFeedSession)
		v1.DELETE("/sessions/:id", DeleteFeedSession)
		v1.PUT("/events/:id", UpdateFeedEvent)
		v1.DELETE("/events/:id", DeleteFeedEvent)
		v1.GET("/feeds", GetFeeds)
		v1.DELETE("/feeds", DeleteAllFeeds)
		v1.GET("/health", HealthCheck)
	}
}

func (suite *FeedHandlerTestSuite) TearDownTest() {
	// Clean up database after each test
	suite.db.Exec("DELETE FROM feed_events")
	suite.db.Exec("DELETE FROM feed_sessions")
	suite.db.Exec("DELETE FROM user_settings")
}

func (suite *FeedHandlerTestSuite) TestCreateSessionSuccess() {
	sessionRequest := CreateFeedSessionRequest{
		Twin:     "A",
		IsBottle: false,
	}

	body, err := json.Marshal(sessionRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(body))
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

func (suite *FeedHandlerTestSuite) TestCreateBottleSessionSuccess() {
	bottleRequest := CreateFeedSessionRequest{
		Twin:         "A",
		IsBottle:     true,
		BottleAmount: &[]float64{120.0}[0], // 120 ml
		BottleType:   &[]string{"breastmilk"}[0],
	}

	body, err := json.Marshal(bottleRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusCreated, w.Code)

	var response models.FeedSession
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), bottleRequest.Twin, response.Twin)
	assert.True(suite.T(), response.IsBottle)
	assert.NotNil(suite.T(), response.BottleAmount)
	assert.Equal(suite.T(), 120.0, *response.BottleAmount)
	assert.NotNil(suite.T(), response.BottleType)
	assert.Equal(suite.T(), "breastmilk", *response.BottleType)
	assert.Empty(suite.T(), response.Events) // Bottle sessions should have no events
	assert.NotZero(suite.T(), response.ID)
}

func (suite *FeedHandlerTestSuite) TestCreateBottleSessionInvalidAmount() {
	bottleRequest := CreateFeedSessionRequest{
		Twin:         "A",
		IsBottle:     true,
		BottleAmount: &[]float64{0}[0], // Invalid amount
		BottleType:   &[]string{"breastmilk"}[0],
	}

	body, err := json.Marshal(bottleRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
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

	req := httptest.NewRequest("POST", "/api/v1/events", bytes.NewBuffer(body))
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

	req := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(body))
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

	req := httptest.NewRequest("POST", "/api/v1/events", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusNotFound, w.Code)
}

func (suite *FeedHandlerTestSuite) TestGetFeedsEmpty() {
	req := httptest.NewRequest("GET", "/api/v1/feeds", nil)
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

	req := httptest.NewRequest("GET", "/api/v1/feeds", nil)
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
	req := httptest.NewRequest("GET", "/api/v1/feeds?limit=2", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response FeedsResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), int64(5), response.Total)
	assert.Len(suite.T(), response.Feeds, 2)

	// Test with offset
	req = httptest.NewRequest("GET", "/api/v1/feeds?limit=2&offset=2", nil)
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), int64(5), response.Total)
	assert.Len(suite.T(), response.Feeds, 2)
}

func (suite *FeedHandlerTestSuite) TestDeleteAllFeedsEmpty() {
	req := httptest.NewRequest("DELETE", "/api/v1/feeds", nil)
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

	req := httptest.NewRequest("DELETE", "/api/v1/feeds", nil)
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

func (suite *FeedHandlerTestSuite) TestUpdateFeedSessionSuccess() {
	// Create a test session
	session := models.FeedSession{
		Twin: "A",
	}
	err := suite.db.Create(&session).Error
	suite.Require().NoError(err)

	// Update the session
	updateRequest := UpdateFeedSessionRequest{
		Twin: "B",
	}

	body, err := json.Marshal(updateRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("PUT", "/api/v1/sessions/"+strconv.Itoa(int(session.ID)), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response models.FeedSession
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), "B", response.Twin)
	assert.Equal(suite.T(), session.ID, response.ID)
}

func (suite *FeedHandlerTestSuite) TestUpdateFeedSessionNotFound() {
	updateRequest := UpdateFeedSessionRequest{
		Twin: "B",
	}

	body, err := json.Marshal(updateRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("PUT", "/api/v1/sessions/999", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusNotFound, w.Code)
}

func (suite *FeedHandlerTestSuite) TestUpdateFeedEventSuccess() {
	// Create a test session and event
	session := models.FeedSession{
		Twin: "A",
	}
	err := suite.db.Create(&session).Error
	suite.Require().NoError(err)

	event := models.FeedEvent{
		FeedSessionID: session.ID,
		EventType:     "start",
		Side:          "Left",
		Timestamp:     time.Now().UTC(),
	}
	err = suite.db.Create(&event).Error
	suite.Require().NoError(err)

	// Update the event
	newTimestamp := time.Now().UTC().Add(1 * time.Hour)
	updateRequest := UpdateFeedEventRequest{
		EventType: "end",
		Timestamp: newTimestamp,
		Side:      "Right",
	}

	body, err := json.Marshal(updateRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("PUT", "/api/v1/events/"+strconv.Itoa(int(event.ID)), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response models.FeedEvent
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), "end", response.EventType)
	assert.Equal(suite.T(), "Right", response.Side)
	assert.True(suite.T(), response.Timestamp.Equal(newTimestamp))
}

func (suite *FeedHandlerTestSuite) TestUpdateFeedEventNotFound() {
	updateRequest := UpdateFeedEventRequest{
		EventType: "end",
		Timestamp: time.Now().UTC(),
		Side:      "Right",
	}

	body, err := json.Marshal(updateRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("PUT", "/api/v1/events/999", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusNotFound, w.Code)
}

func (suite *FeedHandlerTestSuite) TestDeleteFeedSessionSuccess() {
	// Create a test session with events
	session := models.FeedSession{
		Twin: "A",
	}
	err := suite.db.Create(&session).Error
	suite.Require().NoError(err)

	// Add an event
	event := models.FeedEvent{
		FeedSessionID: session.ID,
		EventType:     "start",
		Side:          "Left",
		Timestamp:     time.Now().UTC(),
	}
	err = suite.db.Create(&event).Error
	suite.Require().NoError(err)

	// Delete the session
	req := httptest.NewRequest("DELETE", "/api/v1/sessions/"+strconv.Itoa(int(session.ID)), nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]string
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), "session deleted successfully", response["message"])

	// Verify session and events are deleted
	var deletedSession models.FeedSession
	err = suite.db.First(&deletedSession, session.ID).Error
	assert.Equal(suite.T(), gorm.ErrRecordNotFound, err)

	// Check that events are also deleted
	var eventCount int64
	suite.db.Model(&models.FeedEvent{}).Where("feed_session_id = ?", session.ID).Count(&eventCount)
	assert.Equal(suite.T(), int64(0), eventCount)
}

func (suite *FeedHandlerTestSuite) TestDeleteFeedSessionNotFound() {
	req := httptest.NewRequest("DELETE", "/api/v1/sessions/999", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusNotFound, w.Code)
}

func (suite *FeedHandlerTestSuite) TestDeleteFeedEventSuccess() {
	// Create a test session and event
	session := models.FeedSession{
		Twin: "A",
	}
	err := suite.db.Create(&session).Error
	suite.Require().NoError(err)

	event := models.FeedEvent{
		FeedSessionID: session.ID,
		EventType:     "start",
		Side:          "Left",
		Timestamp:     time.Now().UTC(),
	}
	err = suite.db.Create(&event).Error
	suite.Require().NoError(err)

	// Delete the event
	req := httptest.NewRequest("DELETE", "/api/v1/events/"+strconv.Itoa(int(event.ID)), nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]string
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), "event deleted successfully", response["message"])

	// Verify event is deleted but session remains
	var count int64
	suite.db.Model(&models.FeedEvent{}).Where("id = ?", event.ID).Count(&count)
	assert.Equal(suite.T(), int64(0), count)

	suite.db.Model(&models.FeedSession{}).Where("id = ?", session.ID).Count(&count)
	assert.Equal(suite.T(), int64(1), count)
}

func (suite *FeedHandlerTestSuite) TestDeleteFeedEventNotFound() {
	req := httptest.NewRequest("DELETE", "/api/v1/events/999", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusNotFound, w.Code)
}

func (suite *FeedHandlerTestSuite) TestHealthCheck() {
	req := httptest.NewRequest("GET", "/api/v1/health", nil)
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
