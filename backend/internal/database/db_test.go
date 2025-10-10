package database

import (
	"os"
	"path/filepath"
	"testing"
	"time"
	"twinfeed-backend/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"
)

type DatabaseTestSuite struct {
	suite.Suite
	tempDir string
	dbPath  string
}

func (suite *DatabaseTestSuite) SetupTest() {
	// Create temporary directory for test database
	tempDir, err := os.MkdirTemp("", "twinfeed_test_")
	suite.Require().NoError(err)
	suite.tempDir = tempDir
	suite.dbPath = filepath.Join(tempDir, "test.db")

	// Set environment variable for test database
	os.Setenv("DB_PATH", suite.dbPath)
}

func (suite *DatabaseTestSuite) TearDownTest() {
	// Close database connection
	Close()

	// Clean up temporary directory
	os.RemoveAll(suite.tempDir)

	// Clear environment variable
	os.Unsetenv("DB_PATH")

	// Reset global DB variable
	DB = nil
}

func (suite *DatabaseTestSuite) TestInitializeSuccess() {
	err := Initialize()
	suite.Require().NoError(err)

	// Verify database instance is set
	assert.NotNil(suite.T(), DB)

	// Verify database file exists
	_, err = os.Stat(suite.dbPath)
	assert.NoError(suite.T(), err)

	// Verify GetDB returns the instance
	db := GetDB()
	assert.NotNil(suite.T(), db)
	assert.Equal(suite.T(), DB, db)
}

func (suite *DatabaseTestSuite) TestInitializeCreateDirectory() {
	// Set database path in non-existent directory
	nestedPath := filepath.Join(suite.tempDir, "nested", "dir", "test.db")
	os.Setenv("DB_PATH", nestedPath)

	err := Initialize()
	suite.Require().NoError(err)

	// Verify directory was created
	dir := filepath.Dir(nestedPath)
	_, err = os.Stat(dir)
	assert.NoError(suite.T(), err)

	// Verify database file exists
	_, err = os.Stat(nestedPath)
	assert.NoError(suite.T(), err)
}

func (suite *DatabaseTestSuite) TestInitializeDefaultPath() {
	// Don't set DB_PATH environment variable
	os.Unsetenv("DB_PATH")

	err := Initialize()
	suite.Require().NoError(err)

	// Verify database was created at default location
	defaultPath := "./data/twinfeed.db"
	_, err = os.Stat(defaultPath)
	assert.NoError(suite.T(), err)

	// Clean up default database
	os.RemoveAll("./data")
}

func (suite *DatabaseTestSuite) TestInitializeMigrations() {
	err := Initialize()
	suite.Require().NoError(err)

	db := GetDB()

	// Verify tables were created
	assert.True(suite.T(), db.Migrator().HasTable(&models.FeedSession{}))
	assert.True(suite.T(), db.Migrator().HasTable(&models.FeedEvent{}))
	assert.True(suite.T(), db.Migrator().HasTable(&models.UserSettings{}))

	// Test creating records to verify schema
	feedSession := models.FeedSession{
		Twin: "A",
	}
	err = db.Create(&feedSession).Error
	assert.NoError(suite.T(), err)
	assert.NotZero(suite.T(), feedSession.ID)

	// Test creating a feed event
	feedEvent := models.FeedEvent{
		FeedSessionID: feedSession.ID,
		EventType:     "start",
		Side:          "Left",
		Timestamp:     time.Now(),
	}
	err = db.Create(&feedEvent).Error
	assert.NoError(suite.T(), err)
	assert.NotZero(suite.T(), feedEvent.ID)

	userSettings := models.UserSettings{
		TwinAName:            "Test Twin A",
		TwinBName:            "Test Twin B",
		DefaultTimerInterval: 100,
	}
	err = db.Create(&userSettings).Error
	assert.NoError(suite.T(), err)
	assert.NotZero(suite.T(), userSettings.ID)
}

func (suite *DatabaseTestSuite) TestConnectionPoolSettings() {
	err := Initialize()
	suite.Require().NoError(err)

	db := GetDB()
	sqlDB, err := db.DB()
	suite.Require().NoError(err)

	// Verify connection pool settings for SQLite
	stats := sqlDB.Stats()
	assert.Equal(suite.T(), 1, stats.MaxOpenConnections)
}

func (suite *DatabaseTestSuite) TestGetDBNil() {
	// Test GetDB when DB is nil
	DB = nil
	db := GetDB()
	assert.Nil(suite.T(), db)
}

func (suite *DatabaseTestSuite) TestCloseSuccess() {
	err := Initialize()
	suite.Require().NoError(err)

	// Verify database is open
	db := GetDB()
	assert.NotNil(suite.T(), db)

	// Close database
	err = Close()
	assert.NoError(suite.T(), err)
}

func (suite *DatabaseTestSuite) TestCloseNilDB() {
	// Test closing when DB is nil
	DB = nil
	err := Close()
	assert.NoError(suite.T(), err)
}

func (suite *DatabaseTestSuite) TestDatabaseOperations() {
	err := Initialize()
	suite.Require().NoError(err)

	db := GetDB()

	// Test CRUD operations
	feedSession := models.FeedSession{
		Twin: "A",
	}

	// Create session
	err = db.Create(&feedSession).Error
	assert.NoError(suite.T(), err)
	assert.NotZero(suite.T(), feedSession.ID)

	// Create events for the session
	startEvent := models.FeedEvent{
		FeedSessionID: feedSession.ID,
		EventType:     "start",
		Side:          "Left",
		Timestamp:     time.Now(),
	}
	err = db.Create(&startEvent).Error
	assert.NoError(suite.T(), err)
	assert.NotZero(suite.T(), startEvent.ID)

	endEvent := models.FeedEvent{
		FeedSessionID: feedSession.ID,
		EventType:     "end",
		Side:          "Left",
		Timestamp:     time.Now().Add(5 * time.Minute),
	}
	err = db.Create(&endEvent).Error
	assert.NoError(suite.T(), err)
	assert.NotZero(suite.T(), endEvent.ID)

	// Read session with events
	var retrievedSession models.FeedSession
	err = db.Preload("Events").First(&retrievedSession, feedSession.ID).Error
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), feedSession.Twin, retrievedSession.Twin)
	assert.Len(suite.T(), retrievedSession.Events, 2)

	// Delete session (should cascade delete events)
	err = db.Delete(&retrievedSession).Error
	assert.NoError(suite.T(), err)

	// Verify session deletion
	var deletedSession models.FeedSession
	err = db.First(&deletedSession, feedSession.ID).Error
	assert.Error(suite.T(), err)
	assert.Equal(suite.T(), gorm.ErrRecordNotFound, err)

	// Verify events were cascade deleted
	var remainingEvents []models.FeedEvent
	err = db.Where("feed_session_id = ?", feedSession.ID).Find(&remainingEvents).Error
	assert.NoError(suite.T(), err)
	assert.Len(suite.T(), remainingEvents, 0)
}

func (suite *DatabaseTestSuite) TestConcurrentAccess() {
	err := Initialize()
	suite.Require().NoError(err)

	db := GetDB()

	// Test that multiple goroutines can access the database
	// This is important for SQLite with WAL mode
	done := make(chan bool)
	errors := make(chan error, 2)

	for i := 0; i < 2; i++ {
		go func(id int) {
			defer func() { done <- true }()

			feedSession := models.FeedSession{
				Twin: "A",
			}

			if err := db.Create(&feedSession).Error; err != nil {
				errors <- err
				return
			}

			var count int64
			if err := db.Model(&models.FeedSession{}).Count(&count).Error; err != nil {
				errors <- err
				return
			}
		}(i)
	}

	// Wait for both goroutines to complete
	for i := 0; i < 2; i++ {
		<-done
	}

	// Check for errors
	select {
	case err := <-errors:
		suite.T().Errorf("Concurrent access error: %v", err)
	default:
		// No errors
	}

	// Verify records were created
	var count int64
	err = db.Model(&models.FeedSession{}).Count(&count).Error
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), int64(2), count)
}

func TestDatabaseTestSuite(t *testing.T) {
	suite.Run(t, new(DatabaseTestSuite))
}
