# Decision Architecture

## Executive Summary

MetricFortune is an action-oriented e-commerce analytics platform with 2 epics and 20 stories. The architecture supports a data pipeline from tracking → pattern detection → recommendation generation, with collective intelligence from peer matching. Key technical challenges include high-volume time-series data processing, statistical pattern detection, and before/after impact measurement.

## Project Initialization

**First implementation story should execute:**

```bash
# Project already initialized with:
npx create-next-app@latest metricfortune --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --no-git
```

This establishes the base architecture with these decisions:

| Decision | Provided by Starter |
|----------|-------------------|
| **Language** | TypeScript 5.x with strict mode |
| **Styling** | Tailwind CSS 4.x with PostCSS |
| **Testing** | Not provided (manual decision needed) |
| **Linting** | ESLint with Next.js config |
| **Build Tooling** | Turbopack (dev), Webpack (prod) |
| **Project Structure** | src/ directory with App Router |
| **Path Aliases** | @/* → src/* configured |
| **Framework** | Next.js 16.0.1 + React 19.2.0 |

## Decision Summary

| Category | Decision | Version | Affects Epics | Rationale |
| -------- | -------- | ------- | ------------- | --------- |
| Framework | Next.js | 16.0.1 | All | App Router, React 19, TypeScript support |
| Language | TypeScript | 5.x | All | Type safety, developer experience |
| Styling | Tailwind CSS | 4.x | Epic 2 | Utility-first CSS, rapid UI development |
| Linting | ESLint | 9.x | All | Code quality, Next.js config included |
| Database (Operational) | PostgreSQL | 15/16/17 | All | Relational data, ACID compliance |
| Database (Time-Series) | TimescaleDB | 2.22.1 | Epic 1 (1.3, 1.6, 1.7) | High-volume tracking data, PostgreSQL extension |
| ORM | Prisma | 6.17.0 | All | Type-safe database client, migrations |
| Authentication | NextAuth.js (Auth.js) | 5.0.0-beta.25 | Epic 1 (1.1, 1.4), Epic 2 | Next.js integration, email/password auth |
| API Pattern | Next.js Server Actions | Built-in | All | Type-safe, simplest for internal APIs |
| Background Jobs | Inngest | 3.44.3 | Epic 1 (1.6, 1.7, 1.8), Epic 2 (2.7) | Scheduled jobs, async workflows, Next.js integration |
| Email Service | Resend + React Email | 6.2.0 + 4.2.3 | Epic 1 (1.4), Epic 2 (2.7) | Modern email API, React templates |
| Testing (Unit/Integration) | Vitest | 4.0 | All | Fast, TypeScript support, modern API |
| Testing (E2E) | Playwright | 1.56.1 | Epic 1 (1.10), Epic 2 (2.10) | Browser automation, user journey testing |
| CDN | Vercel Edge Network | Included | Epic 1 (1.2) | Global edge distribution, zero setup |
| Deployment | Vercel (CLI 48.6.4) | Platform | All | Next.js optimized, serverless functions |

**Version Verification:** All versions verified via WebSearch on 2025-10-31. NextAuth.js v5 is currently in beta (stable release pending); using latest beta for Next.js 15 compatibility.

## Project Structure

```
metricfortune/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── signup/
│   │   │   │   └── page.tsx
│   │   │   └── verify-email/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx                    # Dashboard home
│   │   │   │   ├── recommendations/
│   │   │   │   │   └── page.tsx                # Recommendations list
│   │   │   │   ├── journey-insights/
│   │   │   │   │   └── page.tsx                # Journey visualizations
│   │   │   │   ├── peer-benchmarks/
│   │   │   │   │   └── page.tsx                # Peer comparison
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx                # Business profile settings
│   │   │   └── layout.tsx                      # Dashboard layout with nav
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts                # NextAuth.js handler
│   │   │   ├── track/
│   │   │   │   └── route.ts                    # POST /api/track - tracking endpoint
│   │   │   └── inngest/
│   │   │       └── route.ts                    # Inngest webhook handler
│   │   ├── layout.tsx                          # Root layout
│   │   ├── page.tsx                            # Landing page
│   │   └── globals.css                         # Global styles
│   ├── lib/
│   │   ├── prisma.ts                           # Prisma client singleton
│   │   ├── auth.ts                             # NextAuth configuration
│   │   ├── inngest.ts                          # Inngest client
│   │   └── utils.ts                            # Shared utilities
│   ├── components/
│   │   ├── ui/                                 # Reusable UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── toast.tsx
│   │   ├── dashboard/                          # Dashboard-specific components
│   │   │   ├── recommendation-card.tsx
│   │   │   ├── journey-funnel.tsx
│   │   │   ├── peer-comparison-table.tsx
│   │   │   └── stats-card.tsx
│   │   └── tracking/
│   │       └── installation-guide.tsx
│   ├── actions/                                # Server Actions
│   │   ├── auth.ts                             # Login, signup, verify
│   │   ├── recommendations.ts                  # Mark implemented, dismiss
│   │   ├── business-profile.ts                 # Update profile
│   │   └── onboarding.ts                       # Setup business
│   ├── services/                               # Business logic
│   │   ├── analytics/
│   │   │   ├── session-aggregator.ts           # Story 1.6
│   │   │   ├── pattern-detector.ts             # Story 1.7
│   │   │   └── recommendation-engine.ts        # Story 1.8
│   │   ├── matching/
│   │   │   └── business-matcher.ts             # Story 1.5
│   │   └── tracking/
│   │       └── event-processor.ts              # Story 1.3
│   ├── inngest/                                # Inngest functions
│   │   ├── session-aggregation.ts              # Runs every 4-6 hours
│   │   ├── pattern-detection.ts                # Runs daily
│   │   ├── recommendation-generation.ts        # Runs after pattern detection
│   │   └── email-digest.ts                     # Runs weekly
│   ├── emails/                                 # React Email templates
│   │   ├── welcome.tsx
│   │   ├── verify-email.tsx
│   │   ├── weekly-digest.tsx
│   │   └── implementation-results.tsx
│   ├── types/                                  # TypeScript types
│   │   ├── recommendation.ts
│   │   ├── session.ts
│   │   └── business.ts
│   └── middleware.ts                           # Auth middleware
├── prisma/
│   ├── schema.prisma                           # Database schema
│   ├── migrations/                             # Migration history
│   └── seed.ts                                 # Seed data
├── public/
│   ├── tracking.js                             # Client-side tracking script
│   └── images/
├── tests/
│   ├── unit/                                   # Vitest unit tests
│   │   ├── pattern-detector.test.ts
│   │   └── recommendation-engine.test.ts
│   ├── integration/                            # Vitest integration tests
│   │   ├── api/
│   │   └── actions/
│   └── e2e/                                    # Playwright E2E tests
│       ├── user-journey.spec.ts
│       └── recommendation-flow.spec.ts
├── .env                                        # Environment variables
├── .env.example                                # Example env file
├── next.config.ts                              # Next.js configuration
├── tailwind.config.ts                          # Tailwind configuration
├── tsconfig.json                               # TypeScript configuration
├── vitest.config.ts                            # Vitest configuration
├── playwright.config.ts                        # Playwright configuration
├── package.json
└── README.md
```

## Epic to Architecture Mapping

| Epic | Stories | Architecture Components |
|------|---------|------------------------|
| **Epic 1: Foundation & Core Analytics Engine** | 1.1-1.10 | Backend infrastructure, data pipeline, intelligence engine |
| Story 1.1 | Project Foundation | `package.json`, `prisma/schema.prisma`, `src/lib/auth.ts`, Vercel deployment |
| Story 1.2 | Tracking Script | `public/tracking.js`, Vercel Edge CDN |
| Story 1.3 | Data Ingestion API | `src/app/api/track/route.ts`, `src/services/tracking/event-processor.ts` |
| Story 1.4 | User Registration | `src/app/(auth)/`, `src/actions/auth.ts`, NextAuth.js routes |
| Story 1.5 | Business Matching | `src/services/matching/business-matcher.ts`, Prisma queries |
| Story 1.6 | Session Aggregation | `src/services/analytics/session-aggregator.ts`, `src/inngest/session-aggregation.ts`, TimescaleDB |
| Story 1.7 | Pattern Detection | `src/services/analytics/pattern-detector.ts`, `src/inngest/pattern-detection.ts` |
| Story 1.8 | Recommendation Engine | `src/services/analytics/recommendation-engine.ts`, `src/inngest/recommendation-generation.ts` |
| Story 1.9 | Shopify Integration | `src/app/api/shopify/`, OAuth flow, tracking auto-injection |
| Story 1.10 | System Testing | `tests/unit/`, `tests/integration/`, `tests/e2e/`, Vitest + Playwright |
| **Epic 2: Dashboard & User Experience** | 2.1-2.10 | User-facing interface, visualization, interaction |
| Story 2.1 | Dashboard Home | `src/app/(dashboard)/dashboard/page.tsx`, `src/components/dashboard/stats-card.tsx` |
| Story 2.2 | Recommendations List | `src/app/(dashboard)/dashboard/recommendations/page.tsx`, `src/components/dashboard/recommendation-card.tsx` |
| Story 2.3 | Recommendation Detail | Modal/side panel component, `src/actions/recommendations.ts` |
| Story 2.4 | Journey Insights | `src/app/(dashboard)/dashboard/journey-insights/page.tsx`, `src/components/dashboard/journey-funnel.tsx` |
| Story 2.5 | Peer Benchmarks | `src/app/(dashboard)/dashboard/peer-benchmarks/page.tsx`, `src/components/dashboard/peer-comparison-table.tsx` |
| Story 2.6 | Implementation Tracking | Before/after metrics calculation, trend visualization components |
| Story 2.7 | Email Notifications | `src/inngest/email-digest.ts`, `src/emails/weekly-digest.tsx`, Resend API |
| Story 2.8 | Business Profile | `src/app/(dashboard)/dashboard/settings/page.tsx`, `src/actions/business-profile.ts` |
| Story 2.9 | Onboarding Flow | `src/actions/onboarding.ts`, `src/components/tracking/installation-guide.tsx` |
| Story 2.10 | Performance & Launch | Performance optimization, accessibility audit, production deployment |

## Technology Stack Details

### Core Technologies

**Frontend:**
- Next.js 16.0.1 (React 19.2.0) - App Router with Server Components
- TypeScript 5.x - Strict mode enabled
- Tailwind CSS 4.x - Utility-first styling
- date-fns - Date formatting and manipulation

**Backend:**
- Next.js API Routes - External endpoints (tracking)
- Next.js Server Actions - Internal data mutations
- Prisma 6.17.0 - Type-safe database client
- NextAuth.js (Auth.js) 5.0.0-beta.25 - Authentication and session management

**Databases:**
- PostgreSQL 15/16/17 - Primary operational database
- TimescaleDB 2.22.1 - Time-series data (tracking events)

**Background Processing:**
- Inngest 3.44.3 - Scheduled jobs and async workflows

**Email:**
- Resend 6.2.0 - Email delivery API
- React Email 4.2.3 - Email templates as React components

**Testing:**
- Vitest 4.0 - Unit and integration tests
- Playwright 1.56.1 - End-to-end tests
- @testing-library/react - Component testing utilities

**Deployment:**
- Vercel (Platform) - Hosting and serverless functions
- Vercel CLI 48.6.4 - Local development and deployment tooling
- Vercel Edge Network - CDN for static assets and tracking script

### Integration Points

**Frontend ↔ Backend:**
- Server Actions for mutations (mark recommendation, update profile)
- Server Components for data fetching (fetch recommendations, sessions)
- API Route for external tracking endpoint (`POST /api/track`)

**Application ↔ Database:**
- Prisma Client for all database operations
- Connection pooling managed by Prisma
- Migrations via Prisma Migrate

**Application ↔ Background Jobs:**
- Inngest webhook at `/api/inngest` receives job triggers
- Jobs execute on Inngest infrastructure
- Jobs call back to application via internal functions

**Application ↔ External Services:**
- Resend API for sending emails
- Shopify OAuth for app installation (Story 1.9)
- NextAuth.js providers for authentication

**Data Flow:**
1. Tracking script → POST `/api/track` → TimescaleDB (raw events)
2. Inngest scheduled job → Session Aggregator → PostgreSQL (sessions)
3. Inngest daily job → Pattern Detector → PostgreSQL (patterns)
4. Inngest job → Recommendation Engine → PostgreSQL (recommendations)
5. Server Components → Prisma → PostgreSQL → Dashboard UI
6. User action → Server Action → Prisma → PostgreSQL → UI update

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents:

### Naming Conventions

**Files and Directories:**
- React components: PascalCase (`RecommendationCard.tsx`)
- Utilities/services: kebab-case (`session-aggregator.ts`)
- Server Actions files: kebab-case (`business-profile.ts`)
- API routes: kebab-case (`/api/track/route.ts`)

**Code:**
- React components: PascalCase (`RecommendationCard`)
- Functions/variables: camelCase (`getUserRecommendations`)
- Types/Interfaces: PascalCase (`Recommendation`, `SessionData`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- Database tables: snake_case (Prisma converts automatically)

**API/Routes:**
- REST endpoints: kebab-case (`/api/track`, `/dashboard/peer-benchmarks`)
- Query params: camelCase (`?userId=123&startDate=2025-01-01`)

### Database Conventions

**Prisma Schema:**
- Model names: PascalCase singular (`User`, `Recommendation`, `Session`)
- Field names: camelCase (`userId`, `createdAt`, `businessName`)
- Relations: camelCase (`user`, `recommendations`)
- Enums: PascalCase (`RecommendationStatus`)

**Example:**
```prisma
model Recommendation {
  id            String   @id @default(cuid())
  businessId    String
  business      Business @relation(fields: [businessId], references: [id])
  title         String
  status        RecommendationStatus
  createdAt     DateTime @default(now())
}

enum RecommendationStatus {
  NEW
  PLANNED
  IMPLEMENTED
  DISMISSED
}
```

## Consistency Rules

### API Response Format

**Server Actions:**
```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Usage
export async function markImplemented(id: string): Promise<ActionResult<Recommendation>> {
  try {
    const rec = await prisma.recommendation.update({...});
    return { success: true, data: rec };
  } catch (error) {
    return { success: false, error: 'Failed to update recommendation' };
  }
}
```

**API Routes (External):**
```typescript
// Success
{ success: true, data: {...} }

// Error
{ success: false, error: "Error message" }

// Tracking endpoint accepts:
{
  siteId: string;
  sessionId: string;
  event: {
    type: 'pageview' | 'click' | 'form' | 'scroll';
    timestamp: number;
    data: Record<string, any>;
  };
}
```

### Component Patterns

**Server Components (default):**
```typescript
// Async data fetching in Server Component
export default async function DashboardPage() {
  const recommendations = await prisma.recommendation.findMany({...});
  return <RecommendationList recommendations={recommendations} />;
}
```

**Client Components:**
```typescript
'use client';

// Interactive components only
export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [isExpanded, setIsExpanded] = useState(false);
  // ...
}
```

**Server Actions in Client Components:**
```typescript
'use client';

import { markImplemented } from '@/actions/recommendations';

export function ImplementButton({ id }: { id: string }) {
  const handleClick = async () => {
    const result = await markImplemented(id);
    if (result.success) {
      toast.success('Marked as implemented!');
    } else {
      toast.error(result.error);
    }
  };

  return <button onClick={handleClick}>Mark Implemented</button>;
}
```

### Code Organization

**Feature-based organization in `/actions` and `/services`:**
- Group related functionality together
- `/services` contains pure business logic (no Next.js dependencies)
- `/actions` contains Server Actions (uses Next.js features)

**Import order:**
1. External dependencies (`react`, `next`, etc.)
2. Internal aliases (`@/lib`, `@/components`)
3. Relative imports (`./utils`)
4. Types (`import type`)

**Example:**
```typescript
import { useState } from 'react';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';

import { calculateMetrics } from './utils';

import type { Recommendation } from '@/types/recommendation';
```

### Error Handling

**Server Actions & API:**
- Use try-catch blocks in all Server Actions
- Return structured responses: `{ success: boolean, data?: T, error?: string }`
- Log errors server-side with context (user ID, action, timestamp)

**Frontend:**
- Display user-friendly error messages (no stack traces)
- Use toast notifications for transient errors
- Show inline validation errors for forms

**Database:**
- Let Prisma handle connection errors
- Wrap transactions in try-catch with rollback
- Use Prisma error codes for specific handling

**Background Jobs (Inngest):**
- Inngest handles retries automatically (up to 3 retries with exponential backoff)
- Log failures to monitoring
- Send alerts for critical job failures

**Example Pattern:**
```typescript
export async function markRecommendationImplemented(id: string) {
  try {
    const result = await prisma.recommendation.update({...});
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to update recommendation:', error);
    return { success: false, error: 'Unable to update recommendation' };
  }
}
```

### Logging Strategy

**Development:**
- Use `console.log`, `console.error`, `console.warn`
- Structured logging with context: `console.log('[Action]', { userId, action, timestamp })`

**Production:**
- Vercel automatically captures console output
- Structured logging for key events: user actions, background jobs, API errors, performance metrics

**Log Levels:**
- `ERROR` - Failures requiring attention
- `WARN` - Issues that don't break functionality
- `INFO` - Important business events
- `DEBUG` - Detailed diagnostic information (dev only)

**Pattern:**
```typescript
function log(level: 'info' | 'warn' | 'error', message: string, context?: object) {
  console[level](`[${level.toUpperCase()}] ${message}`, context);
}
```

**Date/Time Handling:**

**Storage:**
- Store all timestamps as UTC in PostgreSQL (Prisma defaults)
- Use ISO 8601 format in JSON responses

**Display:**
- Convert to user timezone in frontend
- Use relative times ("2 hours ago") and full dates ("Oct 31, 2025")
- Library: `date-fns` for formatting and manipulation

**Pattern:**
```typescript
import { formatDistanceToNow, format } from 'date-fns';
formatDistanceToNow(date) // "2 hours ago"
format(date, 'MMM dd, yyyy') // "Oct 31, 2025"
```

## Data Architecture

### Core Data Models

**User & Business:**
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  emailVerified Boolean   @default(false)
  business      Business?
  createdAt     DateTime  @default(now())
}

model Business {
  id                String    @id @default(cuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id])
  name              String
  industry          String
  revenueRange      String
  productTypes      String[]
  platform          String
  siteId            String    @unique
  recommendations   Recommendation[]
  peerGroupId       String?
  createdAt         DateTime  @default(now())
}
```

**Tracking & Analytics (TimescaleDB hypertables):**
```prisma
model TrackingEvent {
  id          String   @id @default(cuid())
  siteId      String
  sessionId   String
  eventType   String   // 'pageview' | 'click' | 'form' | 'scroll'
  timestamp   DateTime
  data        Json

  @@index([siteId, timestamp])
  @@index([sessionId])
  // Convert to hypertable: SELECT create_hypertable('TrackingEvent', 'timestamp');
}

model Session {
  id            String    @id @default(cuid())
  siteId        String
  sessionId     String    @unique
  entryPage     String
  exitPage      String?
  duration      Int?      // seconds
  pageCount     Int
  bounced       Boolean
  converted     Boolean   @default(false)
  createdAt     DateTime  @default(now())

  @@index([siteId, createdAt])
}
```

**Recommendations:**
```prisma
model Recommendation {
  id                  String                 @id @default(cuid())
  businessId          String
  business            Business               @relation(fields: [businessId], references: [id])
  title               String
  problemStatement    String
  actionSteps         String[]
  expectedImpact      String
  confidenceLevel     ConfidenceLevel
  status              RecommendationStatus   @default(NEW)
  impactLevel         ImpactLevel
  peerSuccessData     String?
  implementedAt       DateTime?
  dismissedAt         DateTime?
  createdAt           DateTime               @default(now())

  @@index([businessId, status])
}

enum RecommendationStatus {
  NEW
  PLANNED
  IMPLEMENTED
  DISMISSED
}

enum ImpactLevel {
  HIGH
  MEDIUM
  LOW
}

enum ConfidenceLevel {
  HIGH
  MEDIUM
  LOW
}
```

**Patterns:**
```prisma
model Pattern {
  id              String   @id @default(cuid())
  siteId          String
  patternType     String   // 'abandonment' | 'hesitation' | 'low_engagement'
  description     String
  severity        Float    // 0.0 - 1.0
  sessionCount    Int
  detectedAt      DateTime @default(now())

  @@index([siteId, detectedAt])
}
```

## API Contracts

### External API (Tracking Endpoint)

**POST /api/track**
```typescript
// Request
{
  siteId: string;
  sessionId: string;
  event: {
    type: 'pageview' | 'click' | 'form' | 'scroll';
    timestamp: number;
    data: {
      url?: string;
      selector?: string;
      formId?: string;
      scrollDepth?: number;
      [key: string]: any;
    };
  };
}

// Response (Success)
{ success: true }

// Response (Error)
{ success: false, error: string }
```

### Internal Server Actions

**recommendations.ts:**
```typescript
markImplemented(id: string, implementedAt: Date): Promise<ActionResult<Recommendation>>
dismissRecommendation(id: string): Promise<ActionResult<Recommendation>>
planRecommendation(id: string): Promise<ActionResult<Recommendation>>
```

**business-profile.ts:**
```typescript
updateBusinessProfile(data: BusinessProfileUpdate): Promise<ActionResult<Business>>
regenerateSiteId(): Promise<ActionResult<{ siteId: string }>>
```

**auth.ts:**
```typescript
signUp(email: string, password: string, businessName: string): Promise<ActionResult<User>>
signIn(email: string, password: string): Promise<ActionResult<Session>>
verifyEmail(token: string): Promise<ActionResult<void>>
```

## Security Architecture

### Authentication & Authorization

- **NextAuth.js** with email/password credentials provider
- Session stored in JWT (stateless)
- Password hashing with bcrypt (10 rounds minimum)
- Email verification required before full access
- Middleware protects dashboard routes

**Example middleware:**
```typescript
export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/dashboard/:path*']
};
```

### Data Protection

**Encryption:**
- TLS 1.3 for all data in transit (enforced by Vercel)
- AES-256 encryption at rest for database (managed database provider)
- Environment variables for secrets (not committed to git)

**Privacy:**
- GDPR/CCPA compliant tracking (anonymous session IDs)
- Peer data aggregated and anonymized
- No PII in tracking events
- Cookie consent for tracking script

**API Security:**
- Rate limiting on tracking endpoint (per-site limits)
- API authentication via site-specific keys
- CORS configured for tracking endpoint
- NextAuth.js CSRF protection

### Database Security

- Row-level security via Prisma (business isolation)
- Prepared statements prevent SQL injection (Prisma default)
- Connection pooling with limited pool size
- Database credentials in environment variables

## Performance Considerations

### Frontend Performance (NFR001: <2s load, <500ms navigation)

**Optimization strategies:**
- Server Components for initial page loads (zero JS by default)
- Dynamic imports for heavy client components
- Image optimization via Next.js Image component
- Tailwind CSS tree-shaking (production builds)
- Route prefetching on link hover

**Monitoring:**
- Vercel Analytics for Web Vitals (LCP, FID, CLS)
- Performance budgets enforced in CI

### Backend Performance

**Database optimization:**
- Indexes on frequently queried fields (siteId, sessionId, timestamps)
- TimescaleDB automatic partitioning by time
- Prisma query optimization (select only needed fields)
- Connection pooling (Prisma default: 10 connections)

**Caching strategy:**
- Server Components cache by default (Next.js)
- revalidate tags for time-based invalidation
- Peer benchmark data cached for 1 hour
- Recommendation list cached until new recommendations generated

**Background job optimization:**
- Batch processing for session aggregation (process 1000 sessions at a time)
- Incremental processing (only new data since last run)
- Inngest automatic retries with exponential backoff

### Tracking Script Performance (NFR001: <100ms impact)

- <50KB gzipped bundle size
- Async loading (non-blocking)
- Event buffering (batch send every 5 seconds or 10 events)
- Graceful degradation if tracking fails

## Deployment Architecture

### Vercel Deployment

**Serverless Functions:**
- API routes deployed as Edge Functions (low latency)
- Server Actions bundled with pages
- Automatic scaling based on traffic

**Database:**
- Managed PostgreSQL + TimescaleDB (Supabase, Neon, or Railway)
- Connection via DATABASE_URL environment variable
- Prisma connection pooling

**Environment Variables:**
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://metricfortune.vercel.app
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
RESEND_API_KEY=...
```

**Monitoring:**
- Vercel Analytics for performance
- Vercel Logs for errors
- Inngest Dashboard for background jobs

### CI/CD Pipeline

1. Push to main branch
2. Vercel builds Next.js app
3. Runs type checking (TypeScript)
4. Runs linting (ESLint)
5. Runs tests (Vitest unit tests)
6. Deploys to production
7. Runs E2E tests (Playwright) post-deployment

## Development Environment

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- PostgreSQL 15+ with TimescaleDB extension (or use managed service)
- Git

### Setup Commands

```bash
# Clone repository
git clone <repo-url>
cd metricfortune

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Set up database
npx prisma migrate dev
npx prisma db seed

# Run development server
npm run dev

# Run tests
npm test                    # Vitest unit tests
npm run test:e2e           # Playwright E2E tests

# Other commands
npm run lint               # ESLint
npm run build              # Production build
npx prisma studio          # Database GUI
```

### Local Development Database Setup

**Option 1: Managed Service (Recommended)**
- Sign up for Supabase, Neon, or Railway
- Create PostgreSQL database
- Enable TimescaleDB extension
- Copy connection string to DATABASE_URL

**Option 2: Local PostgreSQL + TimescaleDB**
```bash
# Install PostgreSQL and TimescaleDB
brew install postgresql timescaledb

# Start PostgreSQL
brew services start postgresql

# Create database
createdb metricfortune

# Connect and enable TimescaleDB
psql metricfortune
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

## Architecture Decision Records (ADRs)

### ADR-001: Next.js with App Router
**Decision:** Use Next.js 16 with App Router (not Pages Router)
**Rationale:** App Router provides Server Components for better performance, improved data fetching patterns, and built-in streaming. Aligns with Next.js future direction.
**Alternatives considered:** Pages Router (older pattern), Remix (different framework)

### ADR-002: TimescaleDB for Time-Series Data
**Decision:** Use TimescaleDB extension for PostgreSQL instead of separate time-series database
**Rationale:** Handles 1M-10M sessions/month comfortably, integrates seamlessly with existing PostgreSQL, simpler operational model than running ClickHouse, allows joining time-series and relational data easily
**Alternatives considered:** ClickHouse (more complex), PostgreSQL alone (less optimized for time-series)

### ADR-003: NextAuth.js v5 (Auth.js) for Authentication
**Decision:** Use NextAuth.js 5.0.0-beta.25 (Auth.js) for authentication
**Rationale:** NextAuth.js v5 is required for Next.js 15 compatibility. While still in beta, it's production-ready and widely used. Provides seamless Next.js integration, simplified API with universal `auth()` function, and improved environment variable handling with `AUTH_*` prefix pattern.
**Alternatives considered:** Clerk (vendor lock-in), Auth0 (complex pricing), custom auth (reinventing the wheel)
**Note:** Version 5 is in beta but stable; monitor for official release and upgrade path.

### ADR-004: Server Actions over REST API
**Decision:** Use Next.js Server Actions for internal data mutations instead of building REST API
**Rationale:** Built-in type safety, simplest pattern, no separate API layer needed, works seamlessly with React
**Alternatives considered:** tRPC (extra dependency), traditional REST (more boilerplate), GraphQL (overkill)

### ADR-005: Inngest for Background Jobs
**Decision:** Use Inngest 3.44.3 for scheduled jobs and async workflows
**Rationale:** Built for Next.js/Vercel, handles scheduling + retries + monitoring, excellent local dev experience, visual dashboard
**Alternatives considered:** BullMQ (requires Redis), Vercel Cron (limited to scheduled only)

### ADR-006: Prisma as ORM
**Decision:** Use Prisma 6.17.0 for all database operations
**Rationale:** Excellent TypeScript integration, type-safe queries, migration management, works perfectly with TimescaleDB (PostgreSQL under the hood)
**Alternatives considered:** Drizzle (newer, less mature), raw SQL (no type safety)

### ADR-007: Resend for Email
**Decision:** Use Resend 6.2.0 with React Email 4.2.3 for transactional emails
**Rationale:** Best DX for Next.js developers, React-based templates, affordable, great deliverability
**Alternatives considered:** SendGrid (more complex), Amazon SES (poor DX)

### ADR-008: Vitest + Playwright Testing Stack
**Decision:** Use Vitest 4.0 for unit/integration tests and Playwright 1.56.1 for E2E tests
**Rationale:** Modern tooling matching TypeScript-first stack, Vitest is fast with great DX, Playwright handles E2E perfectly
**Alternatives considered:** Jest (slower), Cypress (older E2E tool)

### ADR-009: Vercel Edge for CDN
**Decision:** Use Vercel's built-in edge network for tracking script CDN
**Rationale:** Zero additional setup, automatic with Vercel deployment, global distribution, simple versioning
**Alternatives considered:** Cloudflare CDN (separate service), CloudFront (AWS complexity)

---

_Generated by BMAD Decision Architecture Workflow v1.3.2_
_Date: 2025-10-31_
_For: mustafa_
_Project: metricfortune_
