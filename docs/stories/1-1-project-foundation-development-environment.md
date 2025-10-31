# Story 1.1: Project Foundation & Development Environment

Status: drafted

## Story

As a developer,
I want a fully configured Next.js project with database, authentication, and deployment pipeline,
so that I have a solid foundation to build features rapidly.

## Acceptance Criteria

1. Next.js 16+ project initialized with TypeScript and Tailwind CSS
2. PostgreSQL database provisioned with initial schema (users, businesses, sessions tables)
3. Authentication system implemented (NextAuth.js with email/password)
4. Development environment documented (setup instructions, environment variables)
5. CI/CD pipeline configured for automated testing and deployment
6. Hosting environment live (Vercel for frontend, managed database service)

## Tasks / Subtasks

- [ ] Initialize Next.js project with required configuration (AC: #1)
  - [ ] Run `npx create-next-app@latest metricfortune --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --no-git` (already completed per architecture)
  - [ ] Verify TypeScript 5.x, Tailwind CSS 4.x, and ESLint configuration
  - [ ] Confirm src/ directory structure with App Router
  - [ ] Test development server startup

- [ ] Set up PostgreSQL database with Prisma ORM (AC: #2)
  - [ ] Choose and provision managed PostgreSQL service (Supabase, Neon, or Railway recommended)
  - [ ] Install Prisma: `npm install prisma @prisma/client`
  - [ ] Initialize Prisma: `npx prisma init`
  - [ ] Define initial schema in `prisma/schema.prisma` with models: User, Business, Session (initial tables)
  - [ ] Create and run first migration: `npx prisma migrate dev --name init`
  - [ ] Generate Prisma Client: `npx prisma generate`
  - [ ] Create Prisma client singleton at `src/lib/prisma.ts`

- [ ] Implement NextAuth.js authentication (AC: #3)
  - [ ] Install NextAuth.js: `npm install next-auth`
  - [ ] Create auth configuration at `src/lib/auth.ts`
  - [ ] Set up API route at `src/app/api/auth/[...nextauth]/route.ts`
  - [ ] Configure email/password credentials provider
  - [ ] Implement password hashing with bcrypt
  - [ ] Add authentication middleware at `src/middleware.ts`
  - [ ] Create basic login/signup pages in `src/app/(auth)/`

- [ ] Document development environment (AC: #4)
  - [ ] Create `.env.example` with all required environment variables
  - [ ] Document setup instructions in README.md
  - [ ] List required Node.js version (20.x+)
  - [ ] Document database connection setup
  - [ ] Add instructions for running development server
  - [ ] Document testing commands

- [ ] Configure CI/CD pipeline (AC: #5)
  - [ ] Set up GitHub repository (if not already done)
  - [ ] Configure Vercel project and link to repository
  - [ ] Set up automatic deployments on push to main branch
  - [ ] Add environment variables to Vercel project settings
  - [ ] Configure build command and output directory
  - [ ] Test automated deployment flow

- [ ] Deploy to Vercel hosting (AC: #6)
  - [ ] Connect Vercel project to managed database
  - [ ] Configure DATABASE_URL environment variable
  - [ ] Run Prisma migrations in production: `npx prisma migrate deploy`
  - [ ] Verify deployment is live and accessible
  - [ ] Test basic functionality on production URL
  - [ ] Document production URL

- [ ] Set up testing framework (AC: implicit from architecture)
  - [ ] Install Vitest: `npm install -D vitest @vitest/ui`
  - [ ] Install Playwright: `npm install -D @playwright/test`
  - [ ] Create `vitest.config.ts` configuration
  - [ ] Create `playwright.config.ts` configuration
  - [ ] Add test scripts to `package.json`
  - [ ] Create example unit test in `tests/unit/example.test.ts`
  - [ ] Create example E2E test in `tests/e2e/example.spec.ts`
  - [ ] Verify tests run successfully

## Dev Notes

### Architecture Decisions Applied

**Technology Stack (from architecture.md):**
- Next.js 16.0.1 with React 19.2.0 and App Router
- TypeScript 5.x with strict mode
- Tailwind CSS 4.x for styling
- PostgreSQL 15/16/17 for operational database
- Prisma 6.17.0 as ORM
- NextAuth.js for authentication
- Vitest 4.0 for unit/integration testing
- Playwright 1.56.1 for E2E testing
- Vercel for deployment

**Project Structure (from architecture.md#Project-Structure):**
```
src/
├── app/              # Next.js App Router pages
│   ├── (auth)/       # Authentication pages (login, signup)
│   ├── (dashboard)/  # Dashboard pages (future stories)
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

prisma/
├── schema.prisma     # Database schema
├── migrations/       # Migration history
└── seed.ts           # Seed data (optional)

tests/
├── unit/             # Vitest unit tests
├── integration/      # Vitest integration tests
└── e2e/              # Playwright E2E tests
```

**Initial Prisma Schema (from architecture.md#Data-Architecture):**
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
  peerGroupId       String?
  createdAt         DateTime  @default(now())
}

model Session {
  id            String    @id @default(cuid())
  siteId        String
  sessionId     String    @unique
  entryPage     String
  exitPage      String?
  duration      Int?
  pageCount     Int
  bounced       Boolean
  converted     Boolean   @default(false)
  createdAt     DateTime  @default(now())

  @@index([siteId, createdAt])
}
```

**Environment Variables Required:**
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://metricfortune.vercel.app
NODE_ENV=development
```

**Security & Compliance (from architecture.md#Security-Architecture):**
- Password hashing: bcrypt with 10+ rounds
- TLS 1.3 for data in transit (handled by Vercel)
- Environment variables for secrets (never commit)
- NextAuth.js CSRF protection enabled

**Performance Requirements (from PRD NFR001):**
- Dashboard load: <2 seconds (to be validated in future stories)
- 99.9% uptime target (to be monitored)

### Project Structure Notes

**Path Alignment:**
- All TypeScript files use `@/*` alias pointing to `src/*`
- Next.js App Router structure in `src/app/`
- Prisma schema at project root `prisma/schema.prisma`
- Tests organized by type: unit, integration, e2e

**Naming Conventions (from architecture.md#Implementation-Patterns):**
- React components: PascalCase (`LoginForm.tsx`)
- Utilities/services: kebab-case (future stories)
- API routes: kebab-case (`/api/auth`)
- Database tables: snake_case (Prisma converts automatically)
- Functions/variables: camelCase
- Types/Interfaces: PascalCase

### References

- [Architecture: Project Initialization](docs/architecture.md#Project-Initialization)
- [Architecture: Decision Summary](docs/architecture.md#Decision-Summary)
- [Architecture: Project Structure](docs/architecture.md#Project-Structure)
- [Architecture: Data Architecture](docs/architecture.md#Data-Architecture)
- [Architecture: Security Architecture](docs/architecture.md#Security-Architecture)
- [Architecture: Implementation Patterns](docs/architecture.md#Implementation-Patterns)
- [Epic 1: Story 1.1](docs/epics/epic-1-foundation-core-analytics-engine.md)
- [PRD: NFR001 Performance](docs/PRD.md#Non-Functional-Requirements)

### Testing Strategy

**Unit Tests (Vitest):**
- Test Prisma schema validation
- Test auth configuration
- Test utility functions

**Integration Tests (Vitest):**
- Test database connections
- Test authentication flow
- Test API routes

**E2E Tests (Playwright):**
- Test signup flow
- Test login flow
- Test basic navigation

### First Story Notes

This is the foundational story for the entire project. All subsequent stories depend on this infrastructure being properly established. Focus on:

1. **Correctness over speed** - Ensure database schema, auth, and deployment are solid
2. **Documentation** - Clear setup instructions are critical for future development
3. **Testing framework** - Establish patterns that subsequent stories will follow
4. **Environment consistency** - Ensure dev, staging, and production environments match

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

To be filled by implementing agent

### Debug Log References

To be filled during implementation

### Completion Notes List

To be filled during implementation

### File List

To be filled during implementation
