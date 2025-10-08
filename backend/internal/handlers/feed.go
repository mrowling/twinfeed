package handlers

import (
	"net/http"
	"strconv"
	"time"
	"twinfeed-backend/internal/database"
	"twinfeed-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// CreateFeedRequest represents the request body for creating a feed session
type CreateFeedRequest struct {
	Twin      string    `json:"twin" binding:"required,oneof=A B"`
	Side      string    `json:"side" binding:"required,oneof=Left Right"`
	Duration  int       `json:"duration" binding:"required,min=1"`
	StartTime time.Time `json:"start_time" binding:"required"`
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

// CreateFeed creates a new feeding session
func CreateFeed(c *gin.Context) {
	var req CreateFeedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create new feed session
	feed := models.FeedSession{
		Twin:      req.Twin,
		Side:      req.Side,
		Duration:  req.Duration,
		StartTime: req.StartTime,
	}

	db := database.GetDB()
	if err := db.Create(&feed).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create feed session"})
		return
	}

	c.JSON(http.StatusCreated, feed)
}

// GetFeeds retrieves all feeding sessions with optional pagination
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

	// Get feeds with pagination, ordered by start_time descending
	if err := db.Order("start_time DESC").
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

// DeleteAllFeeds deletes all feeding sessions
func DeleteAllFeeds(c *gin.Context) {
	db := database.GetDB()

	// Count existing records before deletion
	var count int64
	if err := db.Model(&models.FeedSession{}).Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count feed sessions"})
		return
	}

	// Delete all records
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
