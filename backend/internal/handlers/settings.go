package handlers

import (
	"net/http"
	"twinfeed-backend/internal/database"
	"twinfeed-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetSettings retrieves user settings
func GetSettings(c *gin.Context) {
	db := database.GetDB()

	var settings models.UserSettings

	// Try to find existing settings (assuming single user for now)
	result := db.First(&settings)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// Create default settings if none exist
			settings = models.UserSettings{
				TwinAName:            "Twin A",
				TwinBName:            "Twin B",
				TwinAColor:           "blue",
				TwinBColor:           "pink",
				DefaultTimerInterval: 100,
				Theme:                "system",
			}

			if err := db.Create(&settings).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create default settings"})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve settings"})
			return
		}
	}

	c.JSON(http.StatusOK, settings)
}

// UpdateSettings updates user settings
func UpdateSettings(c *gin.Context) {
	db := database.GetDB()

	var updateData models.UserSettings
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var settings models.UserSettings

	// Try to find existing settings
	result := db.First(&settings)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// Create new settings if none exist
			settings = models.UserSettings{
				TwinAName:            updateData.TwinAName,
				TwinBName:            updateData.TwinBName,
				TwinAColor:           updateData.TwinAColor,
				TwinBColor:           updateData.TwinBColor,
				DefaultTimerInterval: updateData.DefaultTimerInterval,
				Theme:                updateData.Theme,
			}

			if err := db.Create(&settings).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create settings"})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve settings"})
			return
		}
	} else {
		// Update existing settings
		settings.TwinAName = updateData.TwinAName
		settings.TwinBName = updateData.TwinBName
		settings.TwinAColor = updateData.TwinAColor
		settings.TwinBColor = updateData.TwinBColor
		settings.DefaultTimerInterval = updateData.DefaultTimerInterval
		settings.Theme = updateData.Theme

		if err := db.Save(&settings).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
			return
		}
	}

	c.JSON(http.StatusOK, settings)
}

// ResetSettings resets settings to defaults
func ResetSettings(c *gin.Context) {
	db := database.GetDB()

	var settings models.UserSettings

	// Try to find existing settings
	result := db.First(&settings)

	if result.Error != nil && result.Error != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve settings"})
		return
	}

	// Set to defaults
	settings.TwinAName = "Twin A"
	settings.TwinBName = "Twin B"
	settings.TwinAColor = "blue"
	settings.TwinBColor = "pink"
	settings.DefaultTimerInterval = 100
	settings.Theme = "system"

	if result.Error == gorm.ErrRecordNotFound {
		// Create new record
		if err := db.Create(&settings).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create settings"})
			return
		}
	} else {
		// Update existing record
		if err := db.Save(&settings).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset settings"})
			return
		}
	}

	c.JSON(http.StatusOK, settings)
}
