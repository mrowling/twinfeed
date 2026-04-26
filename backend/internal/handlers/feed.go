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

// CreateFeedSessionRequest represents the request body for creating a feed session
type CreateFeedSessionRequest struct {
	Twin         string     `json:"twin" binding:"required,oneof=A B"`
	IsBottle     bool       `json:"is_bottle"`
	BottleAmount *float64   `json:"bottle_amount,omitempty"`
	BottleType   *string    `json:"bottle_type,omitempty"`
	CreatedAt    *time.Time `json:"created_at,omitempty"`
}

// AddFeedEventRequest represents the request body for adding an event to a session
type AddFeedEventRequest struct {
	SessionID uint      `json:"session_id" binding:"required"`
	EventType string    `json:"event_type" binding:"required,oneof=start pause end side_change"`
	Timestamp time.Time `json:"timestamp" binding:"required"`
	Side      string    `json:"side" binding:"required,oneof=Left Right"`
}

// FeedsResponse represents the response for fetching feeds
type FeedsResponse struct {
	Feeds []models.FeedSession `json:"feeds"`
	Total int64                `json:"total"`
}

// CreateFeedSession creates a new feeding session
func CreateFeedSession(c *gin.Context) {
	var req CreateFeedSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate bottle fields
	if req.IsBottle {
		if req.BottleAmount == nil || *req.BottleAmount <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Bottle amount is required and must be positive for bottle feeds"})
			return
		}
		if req.BottleType == nil || (*req.BottleType != "breastmilk" && *req.BottleType != "formula") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Bottle type must be 'breastmilk' or 'formula' for bottle feeds"})
			return
		}
	} else {
		// For timer feeds, bottle fields should not be set
		if req.BottleAmount != nil || req.BottleType != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Bottle fields should not be set for timer feeds"})
			return
		}
	}

	// Create new feed session
	feed := models.FeedSession{
		Twin:         req.Twin,
		IsBottle:     req.IsBottle,
		BottleAmount: req.BottleAmount,
		BottleType:   req.BottleType,
		Events:       []models.FeedEvent{}, // Initialize empty events slice
	}
	if req.CreatedAt != nil {
		feed.CreatedAt = *req.CreatedAt
		feed.UpdatedAt = *req.CreatedAt
	}

	db := database.GetDB()
	if err := db.Create(&feed).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create feed session"})
		return
	}

	c.JSON(http.StatusCreated, feed)
}

// AddFeedEvent adds an event (start/pause/end) to an existing session
func AddFeedEvent(c *gin.Context) {
	var req AddFeedEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()

	// Verify session exists
	var session models.FeedSession
	if err := db.First(&session, req.SessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Feed session not found"})
		return
	}

	// Create new event
	event := models.FeedEvent{
		FeedSessionID: req.SessionID,
		EventType:     req.EventType,
		Side:          req.Side,
		Timestamp:     req.Timestamp,
	}

	if err := db.Create(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create feed event"})
		return
	}

	// Log event in debug mode
	if gin.IsDebugging() {
		log.Printf("🎯 FEED EVENT RECORDED: SessionID=%d | EventType='%s' | Timestamp=%s | Side=%s",
			req.SessionID, req.EventType, req.Timestamp.Format(time.RFC3339), req.Side)
	}

	// Update session's updated_at timestamp
	if err := db.Model(&session).Update("updated_at", time.Now()).Error; err != nil {
		// Log error but don't fail the request
		// The event was created successfully
	}

	c.JSON(http.StatusCreated, event)
}

// GetFeeds retrieves all feeding sessions with their events and optional pagination
func GetFeeds(c *gin.Context) {
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

	var feeds []models.FeedSession
	var total int64

	// Get total count
	if err := db.Model(&models.FeedSession{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count feed sessions"})
		return
	}

	// Get feeds with events, ordered by created_at descending
	// Events within each session are ordered by timestamp ascending
	if err := db.Preload("Events", func(db *gorm.DB) *gorm.DB {
		return db.Order("timestamp ASC")
	}).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&feeds).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch feed sessions"})
		return
	}

	response := FeedsResponse{
		Feeds: feeds,
		Total: total,
	}

	c.JSON(http.StatusOK, response)
}

// DeleteAllFeeds deletes all feeding sessions and their events
func DeleteAllFeeds(c *gin.Context) {
	db := database.GetDB()

	// Count existing records before deletion
	var count int64
	if err := db.Model(&models.FeedSession{}).Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count feed sessions"})
		return
	}

	// Delete all records (CASCADE will handle events)
	result := db.Unscoped().Delete(&models.FeedSession{}, "1=1")
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete feed sessions"})
		return
	}

	response := DeleteResponse{
		Message:      "All feeding sessions deleted",
		DeletedCount: count,
	}

	c.JSON(http.StatusOK, response)
}

// UpdateFeedSessionRequest represents the request body for updating a feed session
type UpdateFeedSessionRequest struct {
	Twin         string     `json:"twin" binding:"required,oneof=A B"`
	BottleAmount *float64   `json:"bottle_amount,omitempty"`
	BottleType   *string    `json:"bottle_type,omitempty"`
	CreatedAt    *time.Time `json:"created_at,omitempty"`
}

// UpdateFeedEventRequest represents the request body for updating a feed event
type UpdateFeedEventRequest struct {
	EventType string    `json:"event_type" binding:"required,oneof=start pause end side_change"`
	Timestamp time.Time `json:"timestamp" binding:"required"`
	Side      string    `json:"side" binding:"required,oneof=Left Right"`
}

// UpdateFeedSession updates an existing feeding session
func UpdateFeedSession(c *gin.Context) {
	sessionIDStr := c.Param("id")
	sessionID, err := strconv.ParseUint(sessionIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session ID"})
		return
	}

	var req UpdateFeedSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var session models.FeedSession
	if err := database.DB.First(&session, sessionID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
			return
		}
		log.Printf("Error finding session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find session"})
		return
	}

	// Validate bottle fields if provided
	if req.BottleAmount != nil || req.BottleType != nil {
		// If any bottle field is provided, validate all bottle fields
		if req.BottleAmount == nil || *req.BottleAmount <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Bottle amount is required and must be positive when updating bottle fields"})
			return
		}
		if req.BottleType == nil || (*req.BottleType != "breastmilk" && *req.BottleType != "formula") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Bottle type must be 'breastmilk' or 'formula' when updating bottle fields"})
			return
		}
		// Mark as bottle feed if bottle fields are provided
		session.IsBottle = true
		session.BottleAmount = req.BottleAmount
		session.BottleType = req.BottleType
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

// UpdateFeedEvent updates an existing feed event
func UpdateFeedEvent(c *gin.Context) {
	eventIDStr := c.Param("id")
	eventID, err := strconv.ParseUint(eventIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid event ID"})
		return
	}

	var req UpdateFeedEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var event models.FeedEvent
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
	event.Side = req.Side

	if err := database.DB.Save(&event).Error; err != nil {
		log.Printf("Error updating event: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update event"})
		return
	}

	c.JSON(http.StatusOK, event)
}

// DeleteFeedSession deletes a specific feeding session
func DeleteFeedSession(c *gin.Context) {
	sessionIDStr := c.Param("id")
	sessionID, err := strconv.ParseUint(sessionIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session ID"})
		return
	}

	var session models.FeedSession
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

// DeleteFeedEvent deletes a specific feed event
func DeleteFeedEvent(c *gin.Context) {
	eventIDStr := c.Param("id")
	eventID, err := strconv.ParseUint(eventIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid event ID"})
		return
	}

	var event models.FeedEvent
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

// HealthCheck provides a health check endpoint
func HealthCheck(c *gin.Context) {
	db := database.GetDB()

	// Test database connection
	sqlDB, err := db.DB()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "unhealthy",
			"error":  "database connection failed",
		})
		return
	}

	if err := sqlDB.Ping(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "unhealthy",
			"error":  "database ping failed",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"timestamp": time.Now().UTC(),
		"service":   "twinfeed-backend",
	})
}
