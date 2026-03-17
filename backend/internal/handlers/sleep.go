package handlers

import (
	"log"
	"net/http"
	"strconv"
	"time"
	"twinfeed-backend/internal/database"
	"twinfeed-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CreateSleepSessionRequest represents the request body for creating a sleep session
type CreateSleepSessionRequest struct {
	Twin string `json:"twin" binding:"required,oneof=A B"`
}

// AddSleepEventRequest represents the request body for adding an event to a session
type AddSleepEventRequest struct {
	SessionID uint      `json:"session_id" binding:"required"`
	EventType string    `json:"event_type" binding:"required,oneof=start pause end"`
	Timestamp time.Time `json:"timestamp" binding:"required"`
}

// SleepResponse represents the response for fetching sleep sessions
type SleepResponse struct {
	Sleep []models.SleepSession `json:"sleep"`
	Total int64                 `json:"total"`
}

// CreateSleepSession creates a new sleep session
func CreateSleepSession(c *gin.Context) {
	var req CreateSleepSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create new sleep session
	sleep := models.SleepSession{
		Twin:   req.Twin,
		Events: []models.SleepEvent{}, // Initialize empty events slice
	}

	db := database.GetDB()
	if err := db.Create(&sleep).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create sleep session"})
		return
	}

	c.JSON(http.StatusCreated, sleep)
}

// AddSleepEvent adds an event (start/pause/end) to an existing session
func AddSleepEvent(c *gin.Context) {
	var req AddSleepEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()

	// Verify session exists
	var session models.SleepSession
	if err := db.First(&session, req.SessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sleep session not found"})
		return
	}

	// Create new event
	event := models.SleepEvent{
		SleepSessionID: req.SessionID,
		EventType:      req.EventType,
		Timestamp:      req.Timestamp,
	}

	if err := db.Create(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create sleep event"})
		return
	}

	// Log event in debug mode
	if gin.IsDebugging() {
		log.Printf("💤 SLEEP EVENT RECORDED: SessionID=%d | EventType='%s' | Timestamp=%s",
			req.SessionID, req.EventType, req.Timestamp.Format(time.RFC3339))
	}

	// Update session's updated_at timestamp
	if err := db.Model(&session).Update("updated_at", time.Now()).Error; err != nil {
		// Log error but don't fail the request
		// The event was created successfully
	}

	c.JSON(http.StatusCreated, event)
}

// GetSleep retrieves all sleep sessions with their events and optional pagination
func GetSleep(c *gin.Context) {
	db := database.GetDB()

	// Parse query parameters
	limitStr := c.DefaultQuery("limit", "100")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 100
	}
	if limit > 1000 {
		limit = 1000 // Maximum limit
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	var sleep []models.SleepSession
	var total int64

	// Get total count
	if err := db.Model(&models.SleepSession{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count sleep sessions"})
		return
	}

	// Get sleep sessions with events, ordered by created_at descending
	// Events within each session are ordered by timestamp ascending
	if err := db.Preload("Events", func(db *gorm.DB) *gorm.DB {
		return db.Order("timestamp ASC")
	}).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&sleep).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sleep sessions"})
		return
	}

	response := SleepResponse{
		Sleep: sleep,
		Total: total,
	}

	c.JSON(http.StatusOK, response)
}

// DeleteAllSleep deletes all sleep sessions and their events
func DeleteAllSleep(c *gin.Context) {
	db := database.GetDB()

	// Count existing records before deletion
	var count int64
	if err := db.Model(&models.SleepSession{}).Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count sleep sessions"})
		return
	}

	// Delete all records (CASCADE will handle events)
	result := db.Unscoped().Delete(&models.SleepSession{}, "1=1")
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete sleep sessions"})
		return
	}

	response := DeleteResponse{
		Message:      "All sleep sessions deleted",
		DeletedCount: count,
	}

	c.JSON(http.StatusOK, response)
}

// UpdateSleepSessionRequest represents the request body for updating a sleep session
type UpdateSleepSessionRequest struct {
	Twin      string     `json:"twin" binding:"required,oneof=A B"`
	CreatedAt *time.Time `json:"created_at,omitempty"`
}

// UpdateSleepEventRequest represents the request body for updating a sleep event
type UpdateSleepEventRequest struct {
	EventType string    `json:"event_type" binding:"required,oneof=start pause end"`
	Timestamp time.Time `json:"timestamp" binding:"required"`
}

// UpdateSleepSession updates an existing sleep session
func UpdateSleepSession(c *gin.Context) {
	sessionIDStr := c.Param("id")
	sessionID, err := strconv.ParseUint(sessionIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session ID"})
		return
	}

	var req UpdateSleepSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var session models.SleepSession
	if err := database.DB.First(&session, sessionID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
			return
		}
		log.Printf("Error finding session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find session"})
		return
	}

	// Update the session
	session.Twin = req.Twin
	if req.CreatedAt != nil {
		session.CreatedAt = *req.CreatedAt
	}
	session.UpdatedAt = time.Now()

	if err := database.DB.Save(&session).Error; err != nil {
		log.Printf("Error updating session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update session"})
		return
	}

	c.JSON(http.StatusOK, session)
}

// UpdateSleepEvent updates an existing sleep event
func UpdateSleepEvent(c *gin.Context) {
	eventIDStr := c.Param("id")
	eventID, err := strconv.ParseUint(eventIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid event ID"})
		return
	}

	var req UpdateSleepEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var event models.SleepEvent
	if err := database.DB.First(&event, eventID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
			return
		}
		log.Printf("Error finding event: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find event"})
		return
	}

	// Update the event
	event.EventType = req.EventType
	event.Timestamp = req.Timestamp

	if err := database.DB.Save(&event).Error; err != nil {
		log.Printf("Error updating event: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update event"})
		return
	}

	c.JSON(http.StatusOK, event)
}

// DeleteSleepSession deletes a specific sleep session
func DeleteSleepSession(c *gin.Context) {
	sessionIDStr := c.Param("id")
	sessionID, err := strconv.ParseUint(sessionIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session ID"})
		return
	}

	var session models.SleepSession
	if err := database.DB.First(&session, sessionID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
			return
		}
		log.Printf("Error finding session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find session"})
		return
	}

	// Delete the session (this will cascade delete events due to foreign key)
	if err := database.DB.Delete(&session).Error; err != nil {
		log.Printf("Error deleting session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "session deleted successfully"})
}

// DeleteSleepEvent deletes a specific sleep event
func DeleteSleepEvent(c *gin.Context) {
	eventIDStr := c.Param("id")
	eventID, err := strconv.ParseUint(eventIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid event ID"})
		return
	}

	var event models.SleepEvent
	if err := database.DB.First(&event, eventID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
			return
		}
		log.Printf("Error finding event: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find event"})
		return
	}

	// Delete the event
	if err := database.DB.Delete(&event).Error; err != nil {
		log.Printf("Error deleting event: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "event deleted successfully"})
}
