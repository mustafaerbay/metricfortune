# MetricFortune

E-commerce analytics intelligence platform that transforms raw tracking data into actionable business insights.

## Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- PostgreSQL 15+ (managed service recommended: Supabase, Neon, or Railway)

## Technology Stack

- **Framework**: Next.js 16.0.1 with App Router
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS 4.x
- **Database**: PostgreSQL with Prisma ORM 6.17.0
- **Authentication**: NextAuth.js 5.0 (beta)
- **Testing**: Vitest 4.0 (unit/integration), Playwright 1.56.1 (E2E)
- **Deployment**: Vercel

## Getting Started

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd metricfortune
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Database - Replace with your PostgreSQL connection string
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth.js - Generate a secure secret
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

NODE_ENV="development"
```

**Generate NextAuth Secret:**
```bash
openssl rand -base64 32
```

### 3. Set Up Database

#### Option A: Use a Managed PostgreSQL Service (Recommended)

**Supabase:**
1. Create a project at https://supabase.com
2. Go to Settings > Database
3. Copy the connection string and update `DATABASE_URL` in `.env`

**Neon:**
1. Create a project at https://neon.tech
2. Copy the connection string
3. Update `DATABASE_URL` in `.env`

**Railway:**
1. Create a PostgreSQL database at https://railway.app
2. Copy the connection string
3. Update `DATABASE_URL` in `.env`

#### Option B: Local PostgreSQL

```bash
# Install PostgreSQL locally (macOS with Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb metricfortune

# Update .env with local connection string
DATABASE_URL="postgresql://localhost:5432/metricfortune"
```

### 4. Run Database Migrations

```bash
npx prisma migrate dev --name init
```

This creates the initial database schema with User, Business, and Session tables.

### 5. Generate Prisma Client

```bash
npx prisma generate
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Tracking API

The tracking API endpoint (`POST /api/track`) receives events from the tracking script and stores them in the database.

### Runtime Configuration

**Local Development:**
- Uses Node.js runtime (default) for direct database connection
- Prisma Client works without additional setup

**Production Deployment:**
- Can use Edge runtime for global low-latency (<100ms)
- Requires Prisma Accelerate or Driver Adapters
- Uncomment `export const runtime = 'edge'` in route files

### API Endpoints

- `POST /api/track` - Receive tracking events
- `GET /api/track/health` - Health check and monitoring

## Tracking Script

MetricFortune provides a lightweight JavaScript tracking snippet for e-commerce websites.

### Installation

Add the following code to your website, replacing `your-site-id` with your unique identifier:

```html
<!-- Place in <head> or before </body> -->
<script src="https://metricfortune.vercel.app/tracking.js" async></script>
<script>
  window.addEventListener('load', function() {
    window.MetricFortune.init({
      siteId: 'your-site-id'
    });
  });
</script>
```

### Features

- **Lightweight**: <3KB gzipped, <100ms page load impact
- **Automatic Tracking**: Pageviews, clicks, form interactions, scroll depth, time on page
- **Session Management**: 30-minute timeout, tab-scoped sessions
- **Error Handling**: Graceful degradation, no site breakage if tracking fails
- **CDN Distribution**: Global delivery via Vercel Edge Network

### Test Page

Visit `/demo/tracking-test` to see the tracking script in action:

```bash
npm run dev
# Open http://localhost:3000/demo/tracking-test
```

The test page demonstrates all tracking capabilities with real-time event logging.

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── (auth)/       # Authentication pages (login, signup)
│   ├── (dashboard)/  # Dashboard pages (future stories)
│   ├── demo/         # Demo and test pages
│   │   └── tracking-test/  # Tracking script test page
│   ├── api/          # API routes
│   │   └── auth/     # NextAuth.js routes
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Landing page
│   └── globals.css   # Global styles
├── lib/              # Shared libraries
│   ├── prisma.ts     # Prisma client singleton
│   └── auth.ts       # NextAuth configuration
├── components/       # React components (future stories)
├── actions/          # Server Actions (future stories)
├── services/         # Business logic (future stories)
├── types/            # TypeScript type definitions
└── middleware.ts     # Auth middleware

public/
└── tracking.js       # Tracking script (CDN-distributed)

prisma/
├── schema.prisma     # Database schema
└── migrations/       # Migration history

tests/
├── unit/             # Vitest unit tests
├── integration/      # Vitest integration tests
└── e2e/              # Playwright E2E tests
```

## Available Scripts

```bash
# Development
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Testing (to be configured in later stories)
npm run test         # Run unit/integration tests (Vitest)
npm run test:e2e     # Run E2E tests (Playwright)

# Database
npx prisma studio    # Open Prisma Studio (database GUI)
npx prisma migrate dev  # Create and apply migrations
npx prisma generate  # Generate Prisma Client
npx prisma db push   # Push schema changes (dev only)
```

## Running Tests

MetricFortune has a comprehensive testing infrastructure with **98%+ pass rate** across unit, integration, E2E, and performance tests.

### Test Status

**Current Statistics (2025-11-11)**:
- Total Tests: 276+
- Pass Rate: **98%+** ✅
- Test Files: 22+ across all layers
- All critical services validated

### Test Suite Overview

| Test Type | Count | Purpose | Framework |
|-----------|-------|---------|-----------|
| **Unit Tests** | 13 files | Service and component logic isolation | Vitest 4.0 |
| **Integration Tests** | 9 files | API endpoints, Server Actions, database operations | Vitest 4.0 |
| **E2E Tests** | 3 files | Complete user flows and pipeline validation | Playwright 1.56.1 |
| **Performance Tests** | 1 file | Load testing and performance benchmarks | Playwright 1.56.1 |

### Test Commands

```bash
# Run all tests (unit + integration)
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run end-to-end tests with Playwright
npm run test:e2e

# Run performance tests
npm run test:perf

# Run tests with UI (interactive mode)
npm run test:ui

# Generate test coverage report
npm run test:coverage
```

### Quick Start Testing

```bash
# 1. Set up test database (one-time setup)
createdb metricfortune_test
DATABASE_URL="postgresql://localhost:5432/metricfortune_test" npx prisma migrate deploy

# 2. Run all tests
npm test

# 3. View results
# Tests run sequentially for database safety
# Expected duration: ~2 minutes
```

### Test Database Setup

Integration and E2E tests require a separate test database to avoid polluting development data:

1. **Create a test database**:
   ```bash
   createdb metricfortune_test
   ```

2. **Set `TEST_DATABASE_URL` in `.env` or `.env.test`**:
   ```env
   TEST_DATABASE_URL="postgresql://localhost:5432/metricfortune_test"
   ```

3. **Run migrations on test database**:
   ```bash
   DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
   ```

4. **Verify setup**:
   ```bash
   npm test
   ```

### Test Coverage Areas

**Validated Components**:
- ✅ Tracking script (bundle size, initialization, session management, error handling)
- ✅ API endpoints (POST /api/track with 39+ test cases)
- ✅ Event processor (buffering, batch processing, all event types)
- ✅ Session aggregator (duration, page count, bounce/conversion detection)
- ✅ Pattern detector (abandonment, hesitation, low engagement patterns)
- ✅ Recommendation engine (generation, prioritization, filtering)
- ✅ Authentication (signup, login, email verification, token security)
- ✅ Business profile (creation, updates, validation)
- ✅ Peer matching (algorithm, criteria, recalculation)
- ✅ Shopify integration (OAuth, data sync, script injection)

**Test Data Generators**:
- Business data generator (5 industries, 4 revenue ranges, 3 platforms)
- Tracking data generator (5 user behavior scenarios)
- Sample data generator (Small/Medium/Large/XLarge volume configs)

### Testing Infrastructure

- **Unit/Integration Framework**: Vitest 4.0 with TypeScript support
- **E2E Framework**: Playwright 1.56.1 (Chromium, Firefox, WebKit)
- **Test Database**: PostgreSQL 15+ with Prisma 6.17.0
- **Coverage Provider**: V8 with 80%+ target for critical services
- **Execution**: Sequential (fileParallelism: false) for database safety
- **Timeout**: 30 seconds for database operations

### Performance Benchmarks

| Metric | Target | Status |
|--------|--------|--------|
| Tracking script (gzipped) | <50KB | ✅ 4.77KB |
| Tracking script (uncompressed) | <20KB | ✅ 17.9KB |
| Page load impact | <100ms | ✅ Minimal |
| API response time | <500ms | 📊 Measured in production |
| Session aggregation (10K) | <5 minutes | 📊 Measured in production |

### Continuous Integration

Tests are configured to run in CI/CD pipelines with:
- Automatic test database provisioning
- Parallel execution where safe
- Coverage reporting
- Test result artifacts

### Documentation

For detailed testing information:
- **Testing Strategy**: [docs/testing-strategy.md](docs/testing-strategy.md)
- **Test Results**: [docs/test-results-epic-1.md](docs/test-results-epic-1.md)
- **Test Fixtures**: [tests/fixtures/](tests/fixtures/)
- **Test Helpers**: [tests/helpers/](tests/helpers/)

## Development Workflow

1. Create a feature branch
2. Make changes and test locally
3. Run linting: `npm run lint`
4. Run tests: `npm test`
5. Build to check for errors: `npm run build`
6. Commit and push changes
7. Open pull request

## Database Schema

### User
- `id` - Unique identifier (CUID)
- `email` - Unique email address
- `passwordHash` - Bcrypt hashed password (10 rounds)
- `emailVerified` - Email verification status
- `createdAt` - Account creation timestamp
- Relations: One Business

### Business
- `id` - Unique identifier (CUID)
- `userId` - Foreign key to User
- `name` - Business name
- `industry` - Industry category
- `revenueRange` - Revenue bracket
- `productTypes` - Array of product categories
- `platform` - E-commerce platform
- `siteId` - Unique site identifier
- `peerGroupId` - Peer comparison group
- `createdAt` - Record creation timestamp

### Session
- `id` - Unique identifier (CUID)
- `siteId` - Site identifier
- `sessionId` - Unique session identifier
- `entryPage` - First page visited
- `exitPage` - Last page visited
- `duration` - Session duration in seconds
- `pageCount` - Number of pages viewed
- `bounced` - Bounce indicator
- `converted` - Conversion indicator
- `createdAt` - Session timestamp
- Indexes: (siteId, createdAt)

### TrackingEvent
- `id` - Unique identifier (CUID)
- `siteId` - Site identifier
- `sessionId` - Session identifier
- `eventType` - Event type (pageview, click, form, scroll, time)
- `timestamp` - Event timestamp
- `data` - JSON event data (extensible)
- `createdAt` - Record creation timestamp
- Indexes: (siteId, timestamp), (sessionId)
- **Note**: Table can be converted to TimescaleDB hypertable for time-series optimizations

## Data Retention Policy

MetricFortune implements a tiered data retention strategy to balance storage costs with analytical value:

### Raw Event Data
- **Retention Period**: 90 days
- **Purpose**: Real-time analytics, debugging, recent trend analysis
- **Storage**: TimescaleDB time-series tables with automatic partitioning
- **Cleanup**: Automated retention policy (configured via TimescaleDB)

### Aggregated Session Data
- **Retention Period**: Indefinite
- **Purpose**: Historical trend analysis, peer benchmarking, long-term insights
- **Storage**: Standard PostgreSQL tables
- **Aggregation**: Daily batch jobs compute session metrics from raw events

### Implementation Notes
- Raw event cleanup is managed by TimescaleDB retention policies
- Aggregation pipeline (Story 1.6) ensures no data loss before raw event deletion
- Aggregated data includes: session summaries, daily metrics, conversion funnels, user journeys
- GDPR/CCPA compliance: User data deletion requests cascade through all data tiers

### TimescaleDB Setup (Optional)

To enable time-series optimizations for TrackingEvent table:

```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert to hypertable
SELECT create_hypertable('TrackingEvent', 'timestamp', if_not_exists => TRUE);

-- Add retention policy (90 days)
SELECT add_retention_policy('TrackingEvent', INTERVAL '90 days');

-- Optional: Enable compression for older data
ALTER TABLE "TrackingEvent" SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'siteId'
);
SELECT add_compression_policy('TrackingEvent', INTERVAL '7 days');
```

See `prisma/migrations/*/timescaledb.sql` for complete setup script.

## Authentication

The application uses NextAuth.js with email/password credentials:

- **Sign Up**: `/signup` - Create new account
- **Login**: `/login` - Authenticate existing user
- **Protected Routes**: Dashboard routes require authentication
- **Password Security**: Bcrypt with 10 rounds minimum
- **Session**: JWT-based sessions

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_SECRET` | NextAuth.js encryption secret | Yes |
| `NEXTAUTH_URL` | Application base URL | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Configure environment variables
4. Deploy

Vercel will automatically:
- Build the Next.js application
- Deploy to edge network
- Set up continuous deployment

### Environment Variables for Production

Set these in your Vercel project settings:
- `DATABASE_URL` - Production database connection string
- `NEXTAUTH_SECRET` - Strong random secret (different from dev)
- `NEXTAUTH_URL` - Production URL (e.g., https://metricfortune.vercel.app)
- `NODE_ENV` - Set to "production"

## Troubleshooting

### Database Connection Issues
```bash
# Test database connection
npx prisma db pull
```

### Prisma Client Issues
```bash
# Regenerate Prisma Client
rm -rf node_modules/.prisma
npx prisma generate
```

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

## Support

For issues and questions:
- Check the [documentation](docs/)
- Review existing GitHub issues
- Create a new issue with reproduction steps

## License

Private project - All rights reserved
