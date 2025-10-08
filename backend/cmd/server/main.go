package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	"twinfeed-backend/internal/database"
	"twinfeed-backend/internal/handlers"
	"twinfeed-backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	log.Println("Starting TwinFeed backend...")

	// Initialize database
	log.Println("Initializing database...")
	if err := database.Initialize(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()
	log.Println("Database initialized successfully")

	// Set Gin mode
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		log.Println("Running in debug mode")
	}

	// Create Gin router
	log.Println("Setting up router and middleware...")
	router := gin.Default()

	// Add middleware
	router.Use(middleware.CORS())
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// Health check endpoint
	router.GET("/health", handlers.HealthCheck)

	// API routes
	v1 := router.Group("/api/v1")
	{
		v1.POST("/feed", handlers.CreateFeed)
		v1.GET("/feeds", handlers.GetFeeds)
		v1.DELETE("/feeds", handlers.DeleteAllFeeds)

		// Settings routes
		v1.GET("/settings", handlers.GetSettings)
		v1.PUT("/settings", handlers.UpdateSettings)
		v1.POST("/settings/reset", handlers.ResetSettings)
	}
	log.Println("Routes configured")

	// Get port from environment or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server will start on port %s", port)

	// Create HTTP server
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Starting TwinFeed backend server on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Give outstanding requests 30 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	} else {
		log.Println("Server shutdown complete")
	}
}
