package handlers

// DeleteResponse represents the response for delete operations
type DeleteResponse struct {
	Message      string `json:"message"`
	DeletedCount int64  `json:"deleted_count"`
}
