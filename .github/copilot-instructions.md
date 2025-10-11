# TwinFeed - GitHub Copilot Instructions

## Project Overview
TwinFeed is a dual-timer breastfeeding tracker for parents of twins, built with Go backend + React frontend. The app emphasizes simplicity, offline capability, and mobile-first design without authentication.

## Architecture & Key Patterns

### Backend (Go)
- **Structure**: `cmd/server/main.go` → `internal/{handlers,models,database,middleware}`
- **Framework**: Gin HTTP router + GORM + SQLite
- **Data Flow**: Handlers validate → Models interact → Database persists
- **Database**: Single SQLite file with automatic migrations, WAL mode for concurrency
- **Key Models**: `FeedSession` (twin, side, duration, timestamps), `UserSettings` (names, colors, preferences)

### Frontend (React + TypeScript)
- **State**: Zustand store with localStorage persistence (`src/store/timerStore.ts`)
- **Architecture**: Pages → Components → Store → Services → API
- **Key Pattern**: Dual independent timers (twinA/twinB) with real-time updates
- **Offline-First**: LocalStorage persistence, API sync when available
- **Types**: Shared TypeScript interfaces in `src/types/index.ts`

### Development Workflow
Use **Task** (not npm scripts) for all commands:
```bash
task dev              # Starts both servers (backend:8080, frontend:3000)
task test             # Runs all tests with coverage
task build            # Production builds
task docker           # Container builds
```

## Critical Patterns & Conventions

### Testing Requirements (MANDATORY)
Every code change MUST include tests per `AGENTS.md`:
- **Backend**: Use `testify/suite` pattern with `SetupTest`/`TearDownTest`
- **Frontend**: Use Vitest + Testing Library with mocked hooks/services
- **Coverage**: 80% minimum threshold enforced
- **Structure**: Tests alongside source files (`filename_test.go`, `Component.test.tsx`)

### API Design
- **Endpoints**: `/api/v1/{feed,feeds,settings,health}`
- **Validation**: Gin binding tags (`binding:"required,oneof=A B"`)
- **Responses**: Consistent JSON with error handling
- **CORS**: Configured for localhost development

### State Management
- **Timer Logic**: Real-time updates via `useRealtimeTimer` hook
- **Persistence**: Zustand middleware auto-syncs to localStorage
- **API Sync**: Background sync with `useApiSync` hook when online
- **Sessions**: Immutable operations with optimistic updates

### Database Patterns
- **Migrations**: Automatic GORM migrations in `database.Initialize()`
- **Connection**: Single global instance with proper cleanup
- **Testing**: In-memory SQLite for test isolation
- **Performance**: Connection pooling, prepared statements

### Component Patterns
- **Timer Cards**: Accept callbacks (`onStart`, `onPause`, `onSave`, `onReset`)
- **Side Selection**: Visual feedback for current/suggested sides
- **Mobile-First**: Touch-friendly buttons, responsive design
- **Theme Support**: Dark/light mode via `next-themes`

## Key Dependencies & Integration Points

### Backend Dependencies
- `gin-gonic/gin`: HTTP routing and middleware
- `gorm.io/gorm`: ORM with SQLite driver
- `stretchr/testify`: Testing assertions and suites

### Frontend Dependencies
- `zustand`: State management with persistence
- `axios`: HTTP client with timeout/retry logic
- `@radix-ui/*`: Accessible UI components
- `vitest`: Testing framework with coverage

### Build & Deployment
- **Docker**: Multi-stage builds for production images
- **GitHub Actions**: CI/CD with test coverage and multi-arch builds
- **Helm**: Kubernetes deployment with configurable values
- **Task**: Build automation replacing make/npm scripts

## Development Guidelines

### File Organization
```
backend/internal/
├── handlers/     # HTTP request handlers
├── models/       # GORM models and validation
├── database/     # DB connection and migrations
└── middleware/   # HTTP middleware (CORS, logging)

frontend/src/
├── components/   # Reusable UI components
├── pages/        # Route-level components
├── store/        # Zustand state management
├── services/     # API client functions
├── hooks/        # Custom React hooks
└── types/        # TypeScript type definitions
```

### Environment Variables
- **Backend**: `DB_PATH` (default: `./data/twinfeed.db`), `PORT` (8080), `GIN_MODE`
- **Frontend**: `VITE_APP_VERSION` (set during Docker build for version display)

### Common Commands
```bash
# Development
task dev                    # Start both services
task dev:backend           # Backend only (port 8080)
task dev:frontend          # Frontend only (port 3000)

# Testing
task test                  # All tests with coverage
task test:backend:watch    # Backend tests in watch mode
task test:frontend         # Frontend tests with coverage

# Building
task build                 # Production builds
task docker               # Docker images
task helm:validate        # Validate Helm charts
```

### Mobile Testing
Use browser dev tools mobile emulation - the app is designed for one-handed smartphone use with large touch targets and persistent state.

## Essential Context for AI Agents

- **No Authentication**: Simplified UX means no user management complexity
- **Dual Timers**: Core feature requires understanding twin A/B state independence  
- **Offline Capability**: LocalStorage is primary store, API is sync mechanism
- **SQLite Choice**: Single-file database simplifies deployment and backup
- **Task Tool**: Replaces traditional make/npm scripts across entire project
- **Test-First**: All changes require corresponding test updates per project policy