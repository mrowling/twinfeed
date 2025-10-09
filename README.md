# 🍼 TwinFeed

A mobile-friendly breastfeeding tracker designed specifically for parents of twins. TwinFeed helps you track feeding sessions with dual independent timers and simple session recording.

## Features

- **Dual Independent Timers**: Separate tracking for Twin A and Twin B
- **Session Recording**: Track feeding side (Left/Right), duration, and timestamps
- **Simple Reporting**: View historical feeding data grouped by date
- **Mobile-First Design**: Optimized for one-handed smartphone use
- **Offline Capable**: Local storage with backend synchronization
- **No Authentication**: Simplified for ease of use

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Zustand
- **Backend**: Go 1.23 + Gin + GORM + SQLite
- **Deployment**: Docker + Docker Compose
- **Build Tool**: Task (Taskfile)

## Quick Start

### Prerequisites

- [Task](https://taskfile.dev/) - Build automation tool
- [Go 1.23+](https://golang.org/dl/)
- [Node.js 18+](https://nodejs.org/)
- [pnpm](https://pnpm.io/) - Package manager (faster and more reliable than npm)
- [Docker](https://docker.com/) (optional)

### Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd feeding-tracker
   ```

2. **Initial setup**
   ```bash
   task setup
   ```

3. **Start development servers**
   ```bash
   task dev
   ```
   
   This will start:
   - Backend API on http://localhost:8080
   - Frontend app on http://localhost:3000

### Available Commands

```bash
# Development
task dev              # Run both frontend and backend
task dev:backend      # Run only backend
task dev:frontend     # Run only frontend

# Building
task build            # Build both projects
task build:backend    # Build backend binary
task build:frontend   # Build frontend for production

# Testing
task test             # Run all tests
task test:backend     # Run backend tests
task test:frontend    # Run frontend tests

# Docker
task docker           # Build all Docker images
task docker:backend   # Build backend Docker image
task docker:frontend  # Build frontend Docker image

# Utilities
task clean            # Clean build artifacts
task format           # Format code
task lint             # Run linters
```

### Using Docker

1. **Local Development (Build from source)**
   ```bash
   docker compose up --build
   ```

2. **Production Deployment (Using published images)**
   ```bash
   # Run latest version
   docker compose -f docker-compose.prod.yml up
   
   # Run specific release version
   RELEASE_TAG=v1.0.0 docker compose -f docker-compose.prod.yml up
   ```

3. **Using Task commands**
   ```bash
   # Run latest
   task start:prod
   
   # Run specific version
   task docker:run:version VERSION=v1.0.0
   ```

### Using Helm (Kubernetes)

1. **Add the Helm repository**
   ```bash
   helm repo add twinfeed https://mrowling.github.io/feeding-tracker
   helm repo update
   ```

2. **Install TwinFeed**
   ```bash
   # Basic installation
   helm install twinfeed twinfeed/twinfeed

   # Install with custom namespace
   helm install twinfeed twinfeed/twinfeed --create-namespace --namespace twinfeed

   # Production installation with ingress
   helm install twinfeed twinfeed/twinfeed \
     --set global.imageTag=v1.0.0 \
     --set ingress.enabled=true \
     --set ingress.hosts[0].host=twinfeed.example.com
   ```

3. **Using Task commands**
   ```bash
   # Local development
   task helm:install:dev
   
   # Specific version
   task helm:install:version VERSION=v1.0.0
   
   # Validate chart before installing
   task helm:validate
   ```

4. **Access the application**
   - **With Ingress**: https://your-domain.com
   - **Port Forward**: `kubectl port-forward svc/twinfeed-frontend 3000:80`
   - **NodePort**: Check service external IP/port

### Deployment Options Summary

| Method | Use Case | Command |
|--------|----------|---------|
| **Docker Compose** | Local development, simple deployments | `docker compose up` |
| **Docker (Production)** | Container platforms, manual deployment | `docker compose -f docker-compose.prod.yml up` |
| **Helm Chart** | Kubernetes clusters, enterprise deployment | `helm install twinfeed twinfeed/twinfeed` |
| **Task Automation** | Developer workflows, CI/CD integration | `task start:prod` |

### Published Docker Images

The project uses two workflows for Docker image publishing:

#### CI Workflow (Development)
Publishes images on every push to development branches and validates all components:
- **Backend**: `ghcr.io/mrowling/feeding-tracker-backend`
- **Frontend**: `ghcr.io/mrowling/feeding-tracker-frontend`
- **Helm Chart**: Validates chart syntax, templates, and packaging

Development tags:
- `latest` - Latest version from main branch
- `pr-<number>` - Images from pull requests  
- `<branch>-<sha>` - Images tagged with branch and commit SHA

**CI Pipeline includes:**
- Backend unit tests with coverage reporting
- Frontend unit tests with coverage reporting  
- Build validation for both services
- Helm chart linting and template validation
- Docker image building and publishing

#### Release Workflow (Production)
Publishes versioned images and Helm charts when you create a GitHub release:
- Multi-platform Docker images (linux/amd64, linux/arm64)
- Semantic version tags: `v1.0.0`, `v1.0`, `v1`
- Updates `latest` tag to point to the new release
- Publishes Helm chart to GitHub Pages repository
- Automatically updates release notes with Docker and Helm information

### Creating a Release

To publish a new release with Docker images:

1. **Create a release on GitHub:**
   ```bash
   # Tag your commit
   git tag v1.0.0
   git push origin v1.0.0
   
   # Or create release via GitHub UI
   ```

2. **The release workflow will automatically:**
   - Build multi-platform Docker images
   - Push images with semantic version tags
   - Update the `latest` tag
   - Add Docker pull commands to release notes

3. **Deploy the release:**
   ```bash
   # Deploy specific version
   RELEASE_TAG=v1.0.0 docker compose -f docker-compose.prod.yml up -d
   
   # Or use task command
   task docker:run:version VERSION=v1.0.0
   ```
- `latest` - Latest version from main branch
- `pr-<number>` - Images from pull requests
- `<branch>-<sha>` - Images tagged with branch and commit SHA

## Project Structure

```
feeding-tracker/
├── backend/                 # Go API server
│   ├── cmd/server/         # Application entrypoint
│   ├── internal/
│   │   ├── handlers/       # HTTP handlers
│   │   ├── models/         # Data models
│   │   ├── database/       # Database setup
│   │   └── middleware/     # HTTP middleware
│   ├── Dockerfile
│   └── go.mod
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Zustand store
│   │   ├── services/       # API services
│   │   ├── hooks/          # Custom hooks
│   │   └── types/          # TypeScript types
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.js
├── Taskfile.yml           # Task definitions
├── docker-compose.yml     # Docker Compose config
├── SPEC.md               # Technical specifications
└── README.md
```

## API Endpoints

### Base URL: `/api/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/feed`  | Create a new feeding session |
| GET    | `/feeds` | Get all feeding sessions |
| DELETE | `/feeds` | Delete all feeding sessions |
| GET    | `/health` | Health check |

### Example API Usage

**Create a feeding session:**
```bash
curl -X POST http://localhost:8080/api/v1/feed \
  -H "Content-Type: application/json" \
  -d '{
    "twin": "A",
    "side": "Left", 
    "duration": 300,
    "start_time": "2025-10-08T10:32:00Z"
  }'
```

**Get all sessions:**
```bash
curl http://localhost:8080/api/v1/feeds
```

## Database Schema

### FeedSession
```sql
CREATE TABLE feed_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    twin TEXT NOT NULL,           -- "A" or "B"
    side TEXT NOT NULL,           -- "Left" or "Right"
    duration INTEGER NOT NULL,    -- seconds
    start_time DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Environment Variables

### Backend
- `DB_PATH`: SQLite database file path (default: `./data/twinfeed.db`)
- `PORT`: Server port (default: `8080`)
- `GIN_MODE`: Gin mode (`debug` or `release`)

### Frontend
- `VITE_API_URL`: Backend API base URL (default: `http://localhost:8080/api/v1`)

## Design System

The app uses a soft, neutral color palette optimized for mobile use:

- **Primary Blue**: `#0EA5E9` (accent color)
- **Neutral Gray**: `#F8FAFC` (background)
- **Text Dark**: `#1E293B` (primary text)
- **Success Green**: `#10B981` (save actions)

Components feature:
- Rounded corners and soft shadows
- Large, touch-friendly buttons
- Readable typography
- High contrast for accessibility

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Tips

- **Hot Reload**: Both frontend and backend support hot reload in development
- **Database**: SQLite database is created automatically on first run
- **CORS**: Backend is configured to accept requests from `localhost:3000`
- **Mobile Testing**: Use browser dev tools to test mobile responsiveness
- **State Persistence**: Timer state persists in localStorage

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill processes on ports 3000 and 8080
   lsof -ti:3000 | xargs kill -9
   lsof -ti:8080 | xargs kill -9
   ```

2. **Database permission errors**
   ```bash
   # Ensure data directory has proper permissions
   mkdir -p backend/data
   chmod 755 backend/data
   ```

3. **Node modules issues**
   ```bash
   # Clean and reinstall dependencies
   task clean
   task setup
   ```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue on the GitHub repository or contact the development team.