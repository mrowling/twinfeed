package database

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"twinfeed-backend/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Initialize sets up the database connection and runs migrations
func Initialize() error {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/twinfeed.db"
	}

	// Ensure the directory exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create database directory: %v", err)
	}

	// Configure GORM logger
	logLevel := logger.Silent
	if os.Getenv("GIN_MODE") != "release" {
		logLevel = logger.Info
	}

	// Open database connection
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %v", err)
	}

	// Set connection pool settings
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("failed to get sql.DB: %v", err)
	}

	sqlDB.SetMaxOpenConns(1) // SQLite only supports one writer
	sqlDB.SetMaxIdleConns(1)

	// Run migrations
	if err := db.AutoMigrate(&models.FeedSession{}, &models.UserSettings{}); err != nil {
		return fmt.Errorf("failed to migrate database: %v", err)
	}

	DB = db
	log.Printf("Database initialized successfully at %s", dbPath)
	return nil
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}

// Close closes the database connection
func Close() error {
	if DB != nil {
		sqlDB, err := DB.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}
	return nil
}
