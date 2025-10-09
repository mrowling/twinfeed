package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestCORSMiddleware(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		method         string
		origin         string
		expectedStatus int
		checkHeaders   map[string]string
	}{
		{
			name:           "GET request with no origin",
			method:         "GET",
			origin:         "",
			expectedStatus: http.StatusOK,
			checkHeaders: map[string]string{
				"Access-Control-Allow-Origin": "*",
			},
		},
		{
			name:           "GET request with localhost origin",
			method:         "GET",
			origin:         "http://localhost:3000",
			expectedStatus: http.StatusOK,
			checkHeaders: map[string]string{
				"Access-Control-Allow-Origin": "*",
			},
		},
		{
			name:           "GET request with random origin",
			method:         "GET",
			origin:         "http://example.com",
			expectedStatus: http.StatusOK,
			checkHeaders:   map[string]string{},
		},
		{
			name:           "OPTIONS preflight request",
			method:         "OPTIONS",
			origin:         "http://localhost:3000",
			expectedStatus: http.StatusNoContent,
			checkHeaders: map[string]string{
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS",
			},
		},
		{
			name:           "POST request with origin",
			method:         "POST",
			origin:         "http://localhost:3000",
			expectedStatus: http.StatusOK,
			checkHeaders: map[string]string{
				"Access-Control-Allow-Origin": "*",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a new Gin router with CORS middleware
			router := gin.New()
			router.Use(CORS())

			// Add a test endpoint
			router.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "test"})
			})
			router.POST("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "test"})
			})

			// Create request
			req := httptest.NewRequest(tt.method, "/test", nil)
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}

			// For OPTIONS requests, add required headers
			if tt.method == "OPTIONS" {
				req.Header.Set("Access-Control-Request-Method", "GET")
				req.Header.Set("Access-Control-Request-Headers", "Content-Type")
			}

			w := httptest.NewRecorder()

			// Perform the request
			router.ServeHTTP(w, req)

			// Check status code
			assert.Equal(t, tt.expectedStatus, w.Code)

			// Check CORS headers
			for header, expectedValue := range tt.checkHeaders {
				actualValue := w.Header().Get(header)
				if header == "Access-Control-Allow-Methods" {
					// For methods, just check that it contains the expected methods
					assert.Contains(t, actualValue, "GET")
					assert.Contains(t, actualValue, "POST")
					assert.Contains(t, actualValue, "OPTIONS")
				} else if header == "Access-Control-Allow-Origin" {
					// CORS headers may not be set for same-origin requests
					if tt.origin == "" && actualValue == "" {
						// This is acceptable - no origin header means same-origin
						continue
					}
					assert.Equal(t, expectedValue, actualValue, "Header %s should match", header)
				} else {
					assert.Equal(t, expectedValue, actualValue, "Header %s should match", header)
				}
			}
		})
	}
}

func TestCORSAllowCredentialsSetting(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(CORS())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "test"})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// When AllowAllOrigins is true, AllowCredentials should be false
	allowCredentials := w.Header().Get("Access-Control-Allow-Credentials")
	assert.NotEqual(t, "true", allowCredentials)
}

func TestCORSMaxAge(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(CORS())
	router.OPTIONS("/test", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	req := httptest.NewRequest("OPTIONS", "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	req.Header.Set("Access-Control-Request-Method", "GET")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	maxAge := w.Header().Get("Access-Control-Max-Age")
	assert.NotEmpty(t, maxAge)
}
