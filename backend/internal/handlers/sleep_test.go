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

type SleepHandlerTestSuite struct {
	suite.Suite
	db     *gorm.DB
	router *gin.Engine
}

func (suite *SleepHandlerTestSuite) SetupSuite() {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create in-memory SQLite database for testing with foreign keys enabled
	db, err := gorm.Open(sqlite.Open(":memory:?_fk=1"), &gorm.Config{})
	suite.Require().NoError(err)

	// Enable foreign key constraints for SQLite
	db.Exec("PRAGMA foreign_keys = ON")

	// Auto-migrate the schema with sleep models
	err = db.AutoMigrate(&models.SleepSession{}, &models.SleepEvent{}, &models.UserSettings{})
	suite.Require().NoError(err)

	suite.db = db

	// Set the database instance for handlers
	database.DB = db

	// Setup router with all endpoints
	suite.router = gin.New()

	// API v1 group
	v1 := suite.router.Group("/api/v1")
	{
		v1.POST("/sleep/sessions", CreateSleepSession)
		v1.POST("/sleep/events", AddSleepEvent)
		v1.PUT("/sleep/sessions/:id", UpdateSleepSession)
		v1.DELETE("/sleep/sessions/:id", DeleteSleepSession)
		v1.PUT("/sleep/events/:id", UpdateSleepEvent)
		v1.DELETE("/sleep/events/:id", DeleteSleepEvent)
		v1.GET("/sleep", GetSleep)
		v1.DELETE("/sleep", DeleteAllSleep)
	}
}

func (suite *SleepHandlerTestSuite) TearDownTest() {
	// Clean up database after each test
	suite.db.Exec("DELETE FROM sleep_events")
	suite.db.Exec("DELETE FROM sleep_sessions")
	suite.db.Exec("DELETE FROM user_settings")
}

func (suite *SleepHandlerTestSuite) TestCreateSleepSessionSuccess() {
	sessionRequest := CreateSleepSessionRequest{
		Twin: "A",
	}

	body, err := json.Marshal(sessionRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/api/v1/sleep/sessions", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusCreated, w.Code)

	var response models.SleepSession
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), sessionRequest.Twin, response.Twin)
	assert.Empty(suite.T(), response.Events) // New session should have no events
	assert.NotZero(suite.T(), response.ID)
}

func (suite *SleepHandlerTestSuite) TestCreateSleepSessionInvalidTwin() {
	sessionRequest := CreateSleepSessionRequest{
		Twin: "C", // Invalid twin
	}

	body, err := json.Marshal(sessionRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/api/v1/sleep/sessions", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
}

func (suite *SleepHandlerTestSuite) TestAddSleepEventSuccess() {
	// First create a session
	session := models.SleepSession{Twin: "A"}
	err := suite.db.Create(&session).Error
	suite.Require().NoError(err)

	// Add start event
	eventRequest := AddSleepEventRequest{
		SessionID: session.ID,
		EventType: "start",
		Timestamp: time.Now(),
	}

	body, err := json.Marshal(eventRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/api/v1/sleep/events", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusCreated, w.Code)

	var response models.SleepEvent
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), eventRequest.SessionID, response.SleepSessionID)
	assert.Equal(suite.T(), eventRequest.EventType, response.EventType)
	assert.NotZero(suite.T(), response.ID)
}

func (suite *SleepHandlerTestSuite) TestAddSleepEventInvalidType() {
	// First create a session
	session := models.SleepSession{Twin: "A"}
	err := suite.db.Create(&session).Error
	suite.Require().NoError(err)

	// Add invalid event type
	eventRequest := AddSleepEventRequest{
		SessionID: session.ID,
		EventType: "invalid",
		Timestamp: time.Now(),
	}

	body, err := json.Marshal(eventRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/api/v1/sleep/events", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
}

func (suite *SleepHandlerTestSuite) TestAddSleepEventNonexistentSession() {
	eventRequest := AddSleepEventRequest{
		SessionID: 99999, // Non-existent session
		EventType: "start",
		Timestamp: time.Now(),
	}

	body, err := json.Marshal(eventRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/api/v1/sleep/events", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusNotFound, w.Code)
}

func (suite *SleepHandlerTestSuite) TestGetSleepSuccess() {
	// Create test sessions with events
	session1 := models.SleepSession{Twin: "A"}
	err := suite.db.Create(&session1).Error
	suite.Require().NoError(err)

	event1 := models.SleepEvent{
		SleepSessionID: session1.ID,
		EventType:      "start",
		Timestamp:      time.Now().Add(-10 * time.Minute),
	}
	err = suite.db.Create(&event1).Error
	suite.Require().NoError(err)

	event2 := models.SleepEvent{
		SleepSessionID: session1.ID,
		EventType:      "end",
		Timestamp:      time.Now().Add(-5 * time.Minute),
	}
	err = suite.db.Create(&event2).Error
	suite.Require().NoError(err)

	req := httptest.NewRequest("GET", "/api/v1/sleep", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response SleepResponse
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), int64(1), response.Total)
	assert.Len(suite.T(), response.Sleep, 1)
	assert.Equal(suite.T(), session1.ID, response.Sleep[0].ID)
	assert.Len(suite.T(), response.Sleep[0].Events, 2)
}

func (suite *SleepHandlerTestSuite) TestGetSleepWithPagination() {
	// Create multiple sessions
	for i := 0; i < 15; i++ {
		twin := "A"
		if i%2 == 0 {
			twin = "B"
		}
		session := models.SleepSession{Twin: twin}
		err := suite.db.Create(&session).Error
		suite.Require().NoError(err)
	}

	// Test pagination - page 2 with page_size 5 means offset 5, limit 5
	req := httptest.NewRequest("GET", "/api/v1/sleep?offset=5&limit=5", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response SleepResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), int64(15), response.Total)
	assert.Len(suite.T(), response.Sleep, 5)
}

func (suite *SleepHandlerTestSuite) TestGetSleepMultipleTwins() {
	// Create sessions for both twins
	sessionA := models.SleepSession{Twin: "A"}
	err := suite.db.Create(&sessionA).Error
	suite.Require().NoError(err)

	sessionB := models.SleepSession{Twin: "B"}
	err = suite.db.Create(&sessionB).Error
	suite.Require().NoError(err)

	// Get all sessions
	req := httptest.NewRequest("GET", "/api/v1/sleep", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response SleepResponse
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), int64(2), response.Total)
	assert.Len(suite.T(), response.Sleep, 2)
}

func (suite *SleepHandlerTestSuite) TestUpdateSleepSessionSuccess() {
	// Create a session
	session := models.SleepSession{Twin: "A"}
	err := suite.db.Create(&session).Error
	suite.Require().NoError(err)

	// Update session
	updateRequest := UpdateSleepSessionRequest{
		Twin: "B",
	}

	body, err := json.Marshal(updateRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("PUT", "/api/v1/sleep/sessions/"+strconv.Itoa(int(session.ID)), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response models.SleepSession
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), "B", response.Twin)
}

func (suite *SleepHandlerTestSuite) TestUpdateSleepEventSuccess() {
	// Create session and event
	session := models.SleepSession{Twin: "A"}
	err := suite.db.Create(&session).Error
	suite.Require().NoError(err)

	event := models.SleepEvent{
		SleepSessionID: session.ID,
		EventType:      "start",
		Timestamp:      time.Now().Add(-10 * time.Minute),
	}
	err = suite.db.Create(&event).Error
	suite.Require().NoError(err)

	// Update event
	newTimestamp := time.Now().Add(-5 * time.Minute)
	updateRequest := UpdateSleepEventRequest{
		EventType: "pause",
		Timestamp: newTimestamp,
	}

	body, err := json.Marshal(updateRequest)
	suite.Require().NoError(err)

	req := httptest.NewRequest("PUT", "/api/v1/sleep/events/"+strconv.Itoa(int(event.ID)), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response models.SleepEvent
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	assert.Equal(suite.T(), "pause", response.EventType)
}

func (suite *SleepHandlerTestSuite) TestDeleteSleepSessionSuccess() {
	// Create session with events
	session := models.SleepSession{Twin: "A"}
	err := suite.db.Create(&session).Error
	suite.Require().NoError(err)

	event := models.SleepEvent{
		SleepSessionID: session.ID,
		EventType:      "start",
		Timestamp:      time.Now(),
	}
	err = suite.db.Create(&event).Error
	suite.Require().NoError(err)

	// Delete session
	req := httptest.NewRequest("DELETE", "/api/v1/sleep/sessions/"+strconv.Itoa(int(session.ID)), nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	// Verify session is deleted
	var count int64
	suite.db.Model(&models.SleepSession{}).Where("id = ?", session.ID).Count(&count)
	assert.Equal(suite.T(), int64(0), count)

	// Verify events are cascaded deleted
	suite.db.Model(&models.SleepEvent{}).Where("sleep_session_id = ?", session.ID).Count(&count)
	assert.Equal(suite.T(), int64(0), count)
}

func (suite *SleepHandlerTestSuite) TestDeleteSleepEventSuccess() {
	// Create session and event
	session := models.SleepSession{Twin: "A"}
	err := suite.db.Create(&session).Error
	suite.Require().NoError(err)

	event := models.SleepEvent{
		SleepSessionID: session.ID,
		EventType:      "start",
		Timestamp:      time.Now(),
	}
	err = suite.db.Create(&event).Error
	suite.Require().NoError(err)

	// Delete event
	req := httptest.NewRequest("DELETE", "/api/v1/sleep/events/"+strconv.Itoa(int(event.ID)), nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	// Verify event is deleted
	var count int64
	suite.db.Model(&models.SleepEvent{}).Where("id = ?", event.ID).Count(&count)
	assert.Equal(suite.T(), int64(0), count)

	// Verify session still exists
	suite.db.Model(&models.SleepSession{}).Where("id = ?", session.ID).Count(&count)
	assert.Equal(suite.T(), int64(1), count)
}

func (suite *SleepHandlerTestSuite) TestDeleteAllSleepSuccess() {
	// Create multiple sessions
	for i := 0; i < 5; i++ {
		session := models.SleepSession{Twin: "A"}
		err := suite.db.Create(&session).Error
		suite.Require().NoError(err)

		event := models.SleepEvent{
			SleepSessionID: session.ID,
			EventType:      "start",
			Timestamp:      time.Now(),
		}
		err = suite.db.Create(&event).Error
		suite.Require().NoError(err)
	}

	// Delete all
	req := httptest.NewRequest("DELETE", "/api/v1/sleep", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	// Verify all sessions are deleted
	var count int64
	suite.db.Model(&models.SleepSession{}).Count(&count)
	assert.Equal(suite.T(), int64(0), count)

	// Verify all events are deleted
	suite.db.Model(&models.SleepEvent{}).Count(&count)
	assert.Equal(suite.T(), int64(0), count)
}

func (suite *SleepHandlerTestSuite) TestDurationCalculation() {
	// Create session with multiple events
	session := models.SleepSession{Twin: "A"}
	err := suite.db.Create(&session).Error
	suite.Require().NoError(err)

	now := time.Now()

	// Add events: start, pause (10 min), start, end (5 min) = 15 min total
	events := []models.SleepEvent{
		{
			SleepSessionID: session.ID,
			EventType:      "start",
			Timestamp:      now.Add(-15 * time.Minute),
		},
		{
			SleepSessionID: session.ID,
			EventType:      "pause",
			Timestamp:      now.Add(-5 * time.Minute),
		},
		{
			SleepSessionID: session.ID,
			EventType:      "start",
			Timestamp:      now.Add(-5 * time.Minute),
		},
		{
			SleepSessionID: session.ID,
			EventType:      "end",
			Timestamp:      now,
		},
	}

	for _, event := range events {
		err = suite.db.Create(&event).Error
		suite.Require().NoError(err)
	}

	// Fetch session and verify duration
	var fetchedSession models.SleepSession
	err = suite.db.Preload("Events").First(&fetchedSession, session.ID).Error
	suite.Require().NoError(err)

	duration := fetchedSession.GetTotalDuration()
	expectedDuration := 15 * 60 // 15 minutes in seconds

	// Allow 1 second tolerance for timing differences
	assert.InDelta(suite.T(), float64(expectedDuration), float64(duration), 1.0)
}

func TestSleepHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(SleepHandlerTestSuite))
}
