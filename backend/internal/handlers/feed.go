package handlers

import (
	"log"
	"net/http"
	"strconv"
	"time"
	"twinfeed-backend/internal/database"
	"twinfeed-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// CreateFeedSessionRequest represents the request body for creating a feed session
type CreateFeedSessionRequest struct {
	Twin string `json:"twin" binding:"required,oneof=A B"`
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

// DeleteResponse represents the response for deleting feeds
type DeleteResponse struct {
	Message      string `json:"message"`
	DeletedCount int64  `json:"deleted_count"`
}

// CreateFeedSession creates a new feeding session
func CreateFeedSession(c *gin.Context) {
	var req CreateFeedSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create new feed session
	feed := models.FeedSession{
		Twin:   req.Twin,
		Events: []models.FeedEvent{}, // Initialize empty events slice
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
	if err := db.Preload("Events").
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

// HealthCheck returns the health status of the API
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
