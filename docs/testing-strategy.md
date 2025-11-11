# Testing Strategy

## Overview

This document outlines the comprehensive testing approach for the MetricFortune analytics platform. Our testing strategy follows the testing pyramid model, emphasizing automated testing at multiple levels to ensure system reliability, performance, and correctness.

## Testing Pyramid

```
          /\
         /E2E\
        /------\
       /Integration\
      /--------------\
     /      Unit      \
    /------------------\
```

### Unit Tests (Base Layer)
- **Purpose**: Test individual functions, classes, and modules in isolation
- **Coverage Target**: 80%+ for critical services
- **Tools**: Vitest 4.0
- **Location**: `tests/unit/**/*.test.ts`
- **Scope**: Business logic, algorithms, data transformations

### Integration Tests (Middle Layer)
- **Purpose**: Test interactions between components, services, and database
- **Tools**: Vitest 4.0 with test database
- **Location**: `tests/integration/**/*.test.ts`
- **Scope**:
  - API endpoints (`/api/track`)
  - Server Actions (auth, business profile, recommendations)
  - Service layer integration
  - Database operations

### End-to-End Tests (Top Layer)
- **Purpose**: Test complete user journeys and system workflows
- **Tools**: Playwright 1.56.1
- **Location**: `tests/e2e/**/*.spec.ts`
- **Scope**:
  - Complete data pipeline (tracking → aggregation → patterns → recommendations)
  - User workflows
  - Cross-browser compatibility (Chromium, Firefox, WebKit)

### Performance Tests
- **Purpose**: Validate system performance under load
- **Tools**: Playwright with custom load testing
- **Location**: `tests/performance/**/*.spec.ts`
- **Scope**:
  - Throughput testing (100+ events/second)
  - Session aggregation performance (10K sessions in <5 minutes)
  - Database query performance (<500ms)
  - Memory leak detection

## Testing Tools and Frameworks

### Vitest 4.0 (Unit & Integration Testing)
- **Why Vitest**: Fast, TypeScript-native, modern API, built for Vite ecosystem
- **Features**:
  - Native ES modules support
  - Built-in mocking utilities
  - Watch mode for rapid feedback
  - Coverage reporting with v8 provider

### Playwright 1.56.1 (E2E Testing)
- **Why Playwright**: Reliable browser automation, cross-browser support, modern API
- **Features**:
  - Chromium, Firefox, WebKit support
  - Automatic server startup
  - Screenshot and video recording
  - Network interception
  - Parallel execution

### Testing Library (@testing-library/react)
- **Purpose**: Component testing utilities
- **Philosophy**: Test components like users interact with them

## Test Database Setup

### Separate Test Database
- **Purpose**: Isolate test data from development data
- **Configuration**: `TEST_DATABASE_URL` environment variable
- **Database**: PostgreSQL 15+ with TimescaleDB extension
- **Migrations**: Applied automatically in global setup

### Test Data Management
- **Fixtures**: Reusable test data generators in `tests/fixtures/`
- **Helpers**: Database utilities in `tests/helpers/database.ts`
- **Cleanup**: Database cleared before each test via `clearDatabase()`

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### End-to-End Tests
```bash
npm run test:e2e
```

### Performance Tests
```bash
npm run test:perf
```

### Test Coverage Report
```bash
npm run test:coverage
```

### Interactive Test UI
```bash
npm run test:ui          # Vitest UI
npm run test:e2e:ui      # Playwright UI
```

## Test Coverage Targets

### Critical Services (80%+ Coverage Required)
- `src/services/analytics/session-aggregator.ts`
- `src/services/analytics/pattern-detector.ts`
- `src/services/analytics/recommendation-engine.ts`
- `src/actions/*.ts` (Server Actions)
- `src/app/api/track/route.ts` (Tracking endpoint)

### General Coverage
- Overall project: 70%+
- New features: 80%+
- Bug fixes: Test cases for regression prevention

## Testing Best Practices

### Test Structure (Arrange-Act-Assert)
```typescript
it('should do something', async () => {
  // Arrange: Set up test data
  const input = generateTestData();

  // Act: Execute the function
  const result = await functionUnderTest(input);

  // Assert: Verify expectations
  expect(result).toBe(expectedValue);
});
```

### Test Organization
- Use `describe` blocks to group related tests
- Map tests to acceptance criteria with comments (`// AC #1: ...`)
- One assertion per test when possible
- Clear, descriptive test names

### Mocking Strategy
- **Unit Tests**: Mock external dependencies (Prisma, Inngest, Resend)
- **Integration Tests**: Use real implementations with test database
- **E2E Tests**: Real services in test environment

### Test Data
- Use fixtures for consistent test data (`tests/fixtures/`)
- Generate realistic data with `business-generator.ts` and `tracking-data-generator.ts`
- Clean database between tests for isolation

## Continuous Integration

### CI/CD Pipeline
- **Trigger**: Every pull request and commit to main
- **Steps**:
  1. Install dependencies
  2. Run linter (ESLint)
  3. Run unit tests
  4. Run integration tests
  5. Run E2E tests (on staging environment)
  6. Generate coverage report
  7. Build project

### Quality Gates
- All tests must pass
- Coverage must meet minimum thresholds
- No TypeScript compilation errors
- Linter passes with no errors

## Background Job Testing (Inngest)

### Testing Approach
- **Unit Tests**: Mock Inngest client, test job logic in isolation
- **Integration Tests**: Use Inngest dev server for local testing
- **E2E Tests**: Trigger jobs programmatically, wait for completion

### Running Inngest Dev Server
```bash
npx inngest-cli@latest dev
```

### Job Testing Pattern
```typescript
// Trigger job
await inngest.send({ name: 'event-name', data: {...} });

// Wait for completion
await waitForJobCompletion(async () => {
  const result = await checkDatabaseState();
  return result.isComplete;
});

// Verify results
const sessions = await prisma.session.findMany({ where: { siteId } });
expect(sessions.length).toBeGreaterThan(0);
```

## Performance Testing

### Load Testing Targets
- **Tracking Endpoint**: 100+ events/second sustained throughput
- **Session Aggregation**: Process 10K sessions in <5 minutes
- **Pattern Detection**: Analyze 10K sessions in reasonable time
- **Recommendation Generation**: Generate recommendations in <30 seconds
- **Database Queries**: All queries <500ms
- **Memory**: No memory leaks in background jobs

### Performance Monitoring
- Measure baseline metrics for future comparison
- Track trends over time
- Alert on regressions (>10% slowdown)

## Test Documentation

### Test Results Reports
- **Location**: `docs/test-results-epic-1.md`
- **Contents**: Pass rates, coverage, performance metrics, known issues

### Test Plan
- **Location**: Story files in `docs/stories/`
- **Contents**: Acceptance criteria, test scenarios, expected outcomes

## Troubleshooting

### Common Issues

**Tests failing due to database connection:**
```bash
# Verify TEST_DATABASE_URL is set in .env.test
# Ensure PostgreSQL is running
# Run migrations: npx prisma migrate deploy
```

**Playwright tests timing out:**
```bash
# Ensure Next.js dev server is running
# Check PLAYWRIGHT_BASE_URL is correct
# Increase timeout in playwright.config.ts if needed
```

**Test database not cleaning up:**
```bash
# Verify vitest-setup.ts is configured correctly
# Check clearDatabase() is called in beforeEach
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Testing Library](https://testing-library.com/)
- [Test-Driven Development (TDD)](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
