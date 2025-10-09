# Build stage
FROM golang:1.23-bullseye AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libc6-dev \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Set build environment
ENV CGO_ENABLED=1
ENV GOOS=linux

WORKDIR /app

# Copy go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application with SQLite build tags
RUN go build -a -tags "sqlite_omit_load_extension sqlite_foreign_keys" -o main cmd/server/main.go

# Final stage
FROM debian:bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    sqlite3 \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Create data directory
RUN mkdir -p /data

# Set environment variables
ENV GIN_MODE=release
ENV DB_PATH=/data/twinfeed.db
ENV PORT=8080

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]