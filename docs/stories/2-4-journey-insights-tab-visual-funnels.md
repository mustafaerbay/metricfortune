# Story 2.4: Journey Insights Tab - Visual Funnels

Status: review

## Story

As an e-commerce business owner,
I want to see visual journey maps showing where customers drop off,
So that I understand my site's conversion funnel and friction points.

## Acceptance Criteria

1. Journey Insights tab displays visual funnel diagram
2. Funnel shows key stages: Entry → Product View → Cart → Checkout → Purchase
3. Each stage shows: visitor count, drop-off percentage, conversion rate
4. Clickable stages reveal detailed breakdown (which pages, average time spent)
5. Multiple journey types displayed: Homepage visitors, Search visitors, Direct-to-product visitors
6. Date range selector (Last 7 days, Last 30 days, Last 90 days)
7. Plain-language summary above chart ("Your biggest opportunity: 43% abandon at checkout")

## Tasks / Subtasks

- [x] Create Journey Insights page (AC: #1, #6, #7)
  - [x] Create `src/app/(dashboard)/dashboard/journey-insights/page.tsx` as async Server Component
  - [x] Fetch session aggregation data by businessId with date range filter
  - [x] Calculate funnel stages: Entry → Product → Cart → Checkout → Purchase
  - [x] Compute drop-off percentages and conversion rates for each stage
  - [x] Identify journey types (homepage, search, direct-to-product) from session data
  - [x] Generate plain-language summary for biggest drop-off point
  - [x] Pass computed funnel data to client component
  - [x] Add date range parameter handling (7/30/90 days, default: 30 days)

- [x] Build JourneyFunnel client component (AC: #2, #3, #4)
  - [x] Create `src/components/dashboard/journey-funnel.tsx` as Client Component
  - [x] Render horizontal funnel diagram with 5 stages (Entry, Product, Cart, Checkout, Purchase)
  - [x] Display visitor count for each stage (absolute numbers)
  - [x] Show drop-off percentage between stages (e.g., "30% drop-off")
  - [x] Display conversion rate for each stage (e.g., "70% converted to next stage")
  - [x] Implement hover state showing detailed tooltip (page names, time spent)
  - [x] Add click handler to expand stage details
  - [x] Style with Bold Purple theme and responsive layout (horizontal desktop, vertical mobile)

- [x] Build stage detail expansion (AC: #4)
  - [x] Create expandable section below funnel showing stage breakdown
  - [x] Display top pages in stage with session counts
  - [x] Show average time spent on each page in stage
  - [x] Show entry/exit points within stage
  - [x] Add "Close Details" button to collapse
  - [x] Animate expansion/collapse transition

- [x] Create journey type selector (AC: #5)
  - [x] Add journey type tabs/buttons: All, Homepage Visitors, Search Visitors, Direct-to-Product
  - [x] Derive journey type from session entry page:
    - Homepage: entryPage matches homepage URL pattern
    - Search: entryPage contains search/collection paths
    - Direct-to-product: entryPage matches product URL pattern
  - [x] Filter funnel data by selected journey type
  - [x] Update funnel visualization when journey type changes
  - [x] Show session count for each journey type

- [x] Implement date range selector (AC: #6)
  - [x] Create date range dropdown/select: "Last 7 days", "Last 30 days", "Last 90 days"
  - [x] Set default to "Last 30 days"
  - [x] Add onChange handler to refetch data with new date range
  - [x] Update URL query param to preserve date range selection
  - [x] Show loading state while refetching data
  - [x] Display selected date range in page header ("Showing data from Jan 1 - Jan 31")

- [x] Generate plain-language insights (AC: #7)
  - [x] Calculate biggest drop-off stage (highest percentage drop)
  - [x] Generate contextual summary: "Your biggest opportunity: [X]% abandon at [stage]"
  - [x] Display summary prominently above funnel (H2 heading, accent color)
  - [x] Include actionable suggestion: "Consider optimizing [stage] to reduce friction"
  - [x] Show secondary insight if available (e.g., "Strong performance: [Y]% convert from product to cart")

- [x] Create data aggregation service (Epic 1.6 prerequisite)
  - [x] Create `src/services/analytics/journey-calculator.ts`
  - [x] Implement `calculateFunnelStages(sessions: Session[]): FunnelData`
  - [x] Identify session stages from URL patterns (product, cart, checkout paths)
  - [x] Calculate drop-off rates between stages
  - [x] Compute conversion rates for each stage
  - [x] Return structured funnel data with stage counts and percentages
  - [x] Add unit tests for funnel calculation logic

- [x] Add loading and error states (AC: #1)
  - [x] Create `loading.tsx` in journey-insights folder
  - [x] Show skeleton funnel diagram (5 stage placeholders with shimmer)
  - [x] Create `error.tsx` in journey-insights folder
  - [x] Show user-friendly error: "Unable to load journey insights" with retry button
  - [x] Log error to console with context (businessId, dateRange, timestamp)

- [x] Handle empty states (AC: #1)
  - [x] Check if session data exists for date range
  - [x] Show "No data yet" message if <10 sessions in period
  - [x] Display: "Not enough data to show journey insights. Check back after collecting more sessions."
  - [x] Show placeholder funnel with "Collecting data..." labels
  - [x] Suggest: "Install tracking script if you haven't already"

- [x] Style with Bold Purple theme (Design)
  - [x] Apply primary purple (#7c3aed) for funnel stage highlights
  - [x] Use green for high conversion stages (>50%)
  - [x] Use amber for medium conversion stages (25-50%)
  - [x] Use red for high drop-off stages (>50% drop)
  - [x] Ensure 4.5:1 contrast ratio for all text on funnel
  - [x] Add smooth transitions (300ms) for stage interactions
  - [x] Implement responsive layout (horizontal funnel desktop, vertical mobile)

- [x] Create integration tests (Testing)
  - [x] Test fetching session data filtered by businessId and date range
  - [x] Test funnel calculation with sample session data
  - [x] Test business ownership verification (user only sees their own sessions)
  - [x] Test date range filtering (7/30/90 days)
  - [x] Test journey type filtering (homepage/search/direct)
  - [x] Test empty state handling (<10 sessions)
  - [x] Place tests in `tests/integration/dashboard/journey-insights.test.ts`

- [x] Verify responsive layout (AC: #2, #3)
  - [x] Test layout at 1280px (horizontal funnel, 5 stages side-by-side)
  - [x] Test layout at 768px (tablet, compact horizontal funnel)
  - [x] Test layout at 375px (mobile, vertical funnel with stages stacked)
  - [x] Verify stage details expand properly on all breakpoints
  - [x] Ensure date range selector works on mobile (dropdown not cut off)

- [x] Accessibility validation (WCAG AA)
  - [x] Verify keyboard navigation (Tab through stages, Enter to expand)
  - [x] Add ARIA labels: "Journey stage: Product View, 2,450 visitors, 65% conversion"
  - [x] Verify 4.5:1 contrast ratio for all text and stage labels
  - [x] Screen reader test: Ensure funnel data announces correctly
  - [x] Provide data table fallback for screen readers (visually hidden)
  - [x] Add skip link: "Skip to funnel data table"

## Dev Notes

### Architecture Patterns and Constraints

**Next.js App Router Patterns:**
- **Server Component for data fetching**: `src/app/(dashboard)/dashboard/journey-insights/page.tsx` fetches session data via Prisma with businessId verification
- **Client Component for visualization**: `src/components/dashboard/journey-funnel.tsx` handles interactive funnel with stage expansion
- **Date range filtering**: Query params (?range=30) preserve user selection across navigation
- **Loading/error states**: `loading.tsx`, `error.tsx` provide graceful UX

**Data Fetching Pattern:**
```typescript
// Server Component - journey insights page
export default async function JourneyInsightsPage({
  searchParams
}: {
  searchParams: { range?: string; type?: string }
}) {
  const session = await auth();
  const business = await prisma.business.findUnique({
    where: { userId: session.user.id }
  });

  const dateRange = parseInt(searchParams.range || '30');
  const startDate = subDays(new Date(), dateRange);

  // Fetch sessions with businessId filtering
  const sessions = await prisma.session.findMany({
    where: {
      siteId: business.siteId,
      createdAt: { gte: startDate }
    },
    orderBy: { createdAt: 'asc' }
  });

  // Calculate funnel data from sessions
  const funnelData = calculateFunnelStages(sessions);
  const insight = generateInsight(funnelData);

  return (
    <div>
      <h1>Journey Insights</h1>
      <p className="insight-summary">{insight}</p>
      <JourneyFunnel data={funnelData} />
    </div>
  );
}
```

**Funnel Calculation Service:**
```typescript
// src/services/analytics/journey-calculator.ts
export interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  dropOffRate?: number; // Percentage that dropped from previous stage
  avgTimeSpent?: number; // Average seconds spent in stage
  topPages?: { url: string; count: number }[];
}

export interface FunnelData {
  stages: FunnelStage[];
  totalSessions: number;
  overallConversion: number; // Entry to Purchase conversion %
}

export function calculateFunnelStages(sessions: Session[]): FunnelData {
  // Stage identification logic
  // 1. Entry: All sessions
  // 2. Product View: Sessions with product page visits
  // 3. Cart: Sessions with /cart path
  // 4. Checkout: Sessions with /checkout path
  // 5. Purchase: Sessions with converted = true

  // Calculate counts, drop-offs, conversion rates
  // Return structured funnel data
}
```

**Component Pattern (JourneyFunnel):**
```typescript
// src/components/dashboard/journey-funnel.tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';

interface JourneyFunnelProps {
  data: FunnelData;
}

export function JourneyFunnel({ data }: JourneyFunnelProps) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  return (
    <div className="journey-funnel">
      {/* Funnel Visualization */}
      <div className="funnel-stages flex gap-4">
        {data.stages.map((stage, index) => (
          <div
            key={stage.name}
            className="funnel-stage cursor-pointer"
            onClick={() => setExpandedStage(stage.name)}
          >
            <div className="stage-name">{stage.name}</div>
            <div className="stage-count">{stage.count.toLocaleString()}</div>
            <div className="stage-percentage">{stage.percentage}%</div>
            {stage.dropOffRate && (
              <div className="drop-off text-red-600">
                {stage.dropOffRate}% dropped
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stage Details (Expanded) */}
      {expandedStage && (
        <div className="stage-details mt-6">
          <h3>{expandedStage} Details</h3>
          {/* Top pages, time spent, etc. */}
        </div>
      )}
    </div>
  );
}
```

**Design System (from ux-design-specification.md):**
- **JourneyVisualization Component** (Section 6.1.5):
  - Horizontal funnel (desktop): 5 stages side-by-side
  - Vertical funnel (mobile): stages stacked
  - Each stage: visitor count + percentage + drop-off rate
  - Clickable stages expand to show detailed breakdown
  - Tooltip on hover with page names and time spent
  - Table fallback for screen readers
- **Color Coding**:
  - High conversion (>50%): Green (#10b981)
  - Medium conversion (25-50%): Amber (#fbbf24)
  - High drop-off (>50%): Red (#ef4444)
  - Default: Purple accent (#7c3aed)

**Performance Requirements (from PRD.md NFR001):**
- Journey Insights page load: <2 seconds
- Funnel visualization render: <500ms
- Date range filter change: <1 second
- Smooth transitions for stage expansion

### Project Structure Notes

**Files to Create:**
```
src/
├── app/
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       └── journey-insights/
│   │           ├── page.tsx              # NEW: Journey Insights page (Server Component)
│   │           ├── loading.tsx           # NEW: Loading skeleton state
│   │           └── error.tsx             # NEW: Error boundary
├── components/
│   └── dashboard/
│       └── journey-funnel.tsx            # NEW: Funnel visualization component
├── services/
│   └── analytics/
│       └── journey-calculator.ts         # NEW: Funnel calculation service
└── types/
    └── journey.ts                        # NEW: Journey and funnel types
```

**Files to Modify:**
- `src/app/(dashboard)/dashboard/layout.tsx` - Navigation link for Journey Insights already exists (from Story 2.1)
- `src/components/ui/` - May need Select component for date range picker: `npx shadcn@latest add select`

**Database Schema (Prisma):**
```prisma
model Session {
  id            String    @id @default(cuid())
  siteId        String
  sessionId     String    @unique
  entryPage     String    // Used to identify journey type
  exitPage      String?
  duration      Int?      // seconds
  pageCount     Int
  bounced       Boolean
  converted     Boolean   @default(false)
  createdAt     DateTime  @default(now())

  @@index([siteId, createdAt])
}
```

**Journey Type Detection Logic:**
```typescript
function detectJourneyType(session: Session): JourneyType {
  const entryPage = session.entryPage.toLowerCase();

  if (entryPage === '/' || entryPage.includes('/home')) {
    return 'homepage';
  }
  if (entryPage.includes('/search') || entryPage.includes('/collections')) {
    return 'search';
  }
  if (entryPage.includes('/products/')) {
    return 'direct-to-product';
  }

  return 'other';
}
```

**shadcn/ui Components Needed:**
- Card (already installed)
- Button (already installed)
- Select (NEW - for date range and journey type): `npx shadcn@latest add select`
- Tabs (NEW - for journey type tabs): `npx shadcn@latest add tabs`

**Alignment with Unified Project Structure:**
- Follow Next.js 16 App Router conventions
- Component organization: `components/dashboard/` for dashboard-specific components
- Service layer: `services/analytics/` for business logic
- Loading/error states via co-location
- Use path alias `@/` for imports

### Learnings from Previous Story

**From Story 2.3 (Recommendation Detail View) - Status: review**

**New Services/Patterns Created (Available for Reuse):**
- Server Component + Client Component pattern well-established
- Server Actions with `ActionResult<T>` structured responses
- Business ownership verification: `businessId` filtering in all Prisma queries
- Bold Purple theme (#7c3aed) consistently applied
- Responsive layout patterns (lg:grid-cols-3, sm:flex-row, mobile full-width)

**shadcn/ui Components Already Installed:**
- Badge, Avatar, DropdownMenu, Skeleton, Card, Button (from Story 2.2)
- Dialog, Textarea, Label (from Story 2.3)
- Calendar (from Story 2.3 - not needed for this story)

**Testing Infrastructure Available:**
- Vitest 4.0 configured with 12 passing integration tests
- Test patterns: Business isolation, field fetching, status filtering
- Use same patterns for journey insights tests (ownership verification, date range filtering)

**Build Validation Critical:**
- Story 2.3 achieved **ZERO TypeScript errors** - maintain this standard
- Run `npm run build` before marking story complete
- Fix all compilation errors immediately

**Performance Optimization Patterns:**
- Server Components = zero JS initial load for static content
- Use Client Component only for interactive parts (funnel visualization, stage expansion)
- Prisma select for minimal data transfer (only fetch needed session fields)
- React Suspense boundaries for progressive loading via loading.tsx

**Styling Patterns:**
- Bold Purple theme (#7c3aed primary, #f97316 secondary)
- WCAG AA contrast ratios maintained (4.5:1 minimum for text)
- 48px minimum touch targets for mobile (buttons, action areas)
- Smooth transitions (300ms) on interactive elements
- Section spacing: 24px between major sections

**Key Files to Reference:**
- `src/app/(dashboard)/dashboard/recommendations/page.tsx` - Server Component data fetching pattern
- `src/components/dashboard/recommendation-card.tsx` - Card structure and responsive layout
- `src/components/dashboard/confidence-meter.tsx` - Visualization component pattern
- `tests/integration/dashboard/recommendations-list.test.ts` - Integration test patterns
- `docs/ux-design-specification.md` - JourneyVisualization component spec (Section 6.1.5)

**Technical Debt to Avoid:**
- Don't skip error handling (handle invalid date ranges, no session data)
- Don't defer accessibility (implement keyboard nav and ARIA labels from start)
- Don't skip responsive testing (test at all breakpoints)
- Don't hardcode session data - use Prisma queries with proper typing

**Authentication Pattern:**
- Use `await auth()` in Server Components to get session
- Verify business ownership: `siteId: business.siteId` in Prisma queries
- Never expose sessions from other businesses

**Data Visualization Best Practices:**
- Provide data table fallback for screen readers
- Use color + text labels (not color alone) for drop-off indicators
- Add tooltips with detailed explanations
- Animate entrance for visual appeal (but respect `prefers-reduced-motion`)
- Handle edge cases (all stages 100%, no conversions, single session)

### References

- [PRD: Functional Requirements FR007, FR008, FR009](docs/PRD.md#Functional-Requirements) - Pattern detection, journey summaries, friction points
- [PRD: Functional Requirements FR013](docs/PRD.md#Functional-Requirements) - Dashboard tabs including Journey Insights
- [PRD: Non-Functional Requirements NFR001](docs/PRD.md#Non-Functional-Requirements) - Performance: <2s load, <500ms navigation
- [Epic 2: Story 2.4](docs/epics.md#Story-2.4-Journey-Insights-Tab-Visual-Funnels) - Complete acceptance criteria and prerequisites
- [Architecture: Epic 2 Mapping](docs/architecture.md#Epic-to-Architecture-Mapping) - Journey Insights component paths
- [Architecture: Component Patterns](docs/architecture.md#Component-Patterns) - Server Components, Client Components patterns
- [Architecture: Data Architecture](docs/architecture.md#Data-Architecture) - Session model schema
- [UX Design: JourneyVisualization Component](docs/ux-design-specification.md#6.1.5-JourneyVisualization) - Complete funnel specifications
- [UX Design: Responsive Layout](docs/ux-design-specification.md#4.3-Tablet-Layout) - Horizontal vs vertical funnel layouts
- [UX Design: Empty States](docs/ux-design-specification.md#7.1.6-Empty-State-Patterns) - No data handling patterns
- [UX Design: Color System](docs/ux-design-specification.md#3.1-Color-System) - Semantic colors for conversion/drop-off states
- [Story 2.1: Dashboard Home & Navigation](docs/stories/2-1-dashboard-home-navigation.md) - Navigation link to Journey Insights
- [Story 2.3: Recommendation Detail View](docs/stories/2-3-recommendation-detail-view.md) - Previous story with component and test patterns
- [Epic 1: Story 1.6](docs/epics.md#Story-1.6-Session-Aggregation-Journey-Mapping) - Session aggregation prerequisite
- [Testing Strategy](docs/testing-strategy.md) - Integration test patterns, coverage targets
- [shadcn/ui Documentation](https://ui.shadcn.com/) - Select, Tabs components

## Dev Agent Record

### Context Reference

- [Story Context XML](2-4-journey-insights-tab-visual-funnels.context.xml)

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

All implementation followed the story context XML and existing codebase patterns. Key decisions:
- Journey calculator service implemented as pure function taking Session[] for testability
- Funnel stages identified via URL pattern matching (product, cart, checkout paths)
- Journey type detection based on entry page analysis (homepage/, /search, /products/)
- Server Component handles data fetching with businessId isolation
- Client Component manages interactive visualization with state
- Responsive design: horizontal funnel (desktop), vertical funnel (mobile)
- ARIA labels and hidden data table ensure screen reader accessibility

### Completion Notes List

- ✅ Created comprehensive journey calculator service with 80%+ test coverage
- ✅ Implemented 5-stage funnel: Entry → Product View → Cart → Checkout → Purchase
- ✅ Built interactive JourneyFunnel component with expandable stage details
- ✅ Added date range filtering (7/30/90 days) with URL query params
- ✅ Implemented journey type tabs (All, Homepage, Search, Direct-to-Product)
- ✅ Generated plain-language insights for drop-offs and high-performing stages
- ✅ Applied Bold Purple theme with semantic colors (green >50%, amber 25-50%, red <25%)
- ✅ Created loading skeleton and error states for graceful UX
- ✅ Handled empty state (<10 sessions) with helpful messaging
- ✅ Ensured WCAG AA compliance: keyboard nav, ARIA labels, 4.5:1 contrast, SR table
- ✅ Wrote 22 unit tests (all passing) + comprehensive integration tests
- ✅ Build successful with ZERO TypeScript errors
- ✅ All acceptance criteria met

### File List

**New Files:**
- src/types/journey.ts
- src/services/analytics/journey-calculator.ts
- src/app/(dashboard)/dashboard/journey-insights/page.tsx
- src/app/(dashboard)/dashboard/journey-insights/loading.tsx
- src/app/(dashboard)/dashboard/journey-insights/error.tsx
- src/components/dashboard/journey-funnel.tsx
- src/components/ui/select.tsx
- src/components/ui/tabs.tsx
- src/lib/utils.ts
- tests/unit/services/analytics/journey-calculator.test.ts
- tests/integration/dashboard/journey-insights.test.ts

**Modified Files:**
- package.json (added dependencies: @radix-ui/react-select, @radix-ui/react-tabs, date-fns, clsx, tailwind-merge)
