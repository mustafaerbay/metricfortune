# metricfortune - Epic Breakdown

**Author:** mustafa
**Date:** 2025-10-31
**Project Level:** 2
**Target Scale:** Medium project - multiple epics, 5-15 stories total

---

## Overview

This document provides the detailed epic breakdown for metricfortune, expanding on the high-level epic list in the [PRD](./PRD.md).

Each epic includes:

- Expanded goal and value proposition
- Complete story breakdown with user stories
- Acceptance criteria for each story
- Story sequencing and dependencies

**Epic Sequencing Principles:**

- Epic 1 establishes foundational infrastructure and initial functionality
- Subsequent epics build progressively, each delivering significant end-to-end value
- Stories within epics are vertically sliced and sequentially ordered
- No forward dependencies - each story builds only on previous work

---

## Epic 1: Foundation & Core Analytics Engine

**Expanded Goal:** Establish the complete backend infrastructure and intelligence engine for MetricFortune. This epic delivers a working system that can track user behavior on e-commerce websites, process that data to detect behavioral patterns and friction points, match businesses with similar peers, and generate specific, actionable optimization recommendations. While there's no user-facing dashboard yet, the system will have a functional data pipeline from tracking through recommendation generation, with basic API endpoints for testing and validation.

**Value Delivery:** By the end of this epic, the core "brain" of MetricFortune is operational - collecting data, understanding behavior patterns, and producing the peer-validated recommendations that differentiate the platform.

---

**Story 1.1: Project Foundation & Development Environment**

As a developer,
I want a fully configured Next.js project with database, authentication, and deployment pipeline,
So that I have a solid foundation to build features rapidly.

**Acceptance Criteria:**
1. Next.js 16+ project initialized with TypeScript and Tailwind CSS
2. PostgreSQL database provisioned with initial schema (users, businesses, sessions tables)
3. Authentication system implemented (NextAuth.js with email/password)
4. Development environment documented (setup instructions, environment variables)
5. CI/CD pipeline configured for automated testing and deployment
6. Hosting environment live (Vercel for frontend, managed database service)

**Prerequisites:** None (foundational story)

---

**Story 1.2: Tracking Script Development**

As a developer,
I want a lightweight JavaScript tracking snippet that captures user behavior,
So that e-commerce businesses can install it and start collecting data.

**Acceptance Criteria:**
1. JavaScript tracking script (<50KB gzipped) that captures: page views, clicks, form interactions, scroll depth, time on page
2. Script initializes with unique site ID and sends data asynchronously
3. Session management implemented (client-side session IDs, timeout after 30 minutes inactivity)
4. Performance budget met: <100ms impact on page load time
5. Script handles errors gracefully (no site breakage if tracking fails)
6. CDN distribution setup for global delivery
7. Test page demonstrates tracking functionality with console logging

**Prerequisites:** 1.1 (needs hosting infrastructure)

---

**Story 1.3: Data Ingestion API**

As a backend system,
I want an API endpoint that receives tracking events and stores them efficiently,
So that user behavior data is captured and available for analysis.

**Acceptance Criteria:**
1. POST /api/track endpoint accepts tracking events with schema validation
2. Events written to time-series analytics database (ClickHouse or TimescaleDB)
3. Rate limiting implemented (per-site limits to prevent abuse)
4. Data retention policy configured (90 days raw data, indefinite aggregated data)
5. Event buffering and batch writes for performance
6. API authentication using site-specific API keys
7. Monitoring and error logging for data pipeline health

**Prerequisites:** 1.1 (needs database and API infrastructure)

---

**Story 1.4: User Registration & Business Profile**

As an e-commerce business owner,
I want to create an account and provide my business information,
So that the system can match me with similar businesses and start tracking my site.

**Acceptance Criteria:**
1. Registration flow: email, password, business name
2. Business profile form captures: industry, revenue range, product types, platform (Shopify/WooCommerce/Other)
3. Unique site ID generated upon profile completion
4. Tracking script installation instructions displayed with personalized snippet
5. User dashboard skeleton created (empty state with "Install tracking to begin")
6. Email verification flow implemented
7. Profile data stored and editable

**Prerequisites:** 1.1 (needs authentication system)

---

**Story 1.5: Business Matching Algorithm**

As the system,
I want to match businesses with similar peer groups based on their profile metadata,
So that recommendations can leverage collective intelligence from comparable businesses.

**Acceptance Criteria:**
1. Matching algorithm considers: industry (exact match), revenue range (±1 tier), product types (overlap), platform
2. Peer groups calculated on profile creation and updated when new businesses join
3. Minimum peer group size: 10 businesses (use broader criteria if needed)
4. Peer group composition stored and queryable via API
5. Algorithm performance: <500ms to calculate matches for new business
6. Test suite validates matching logic with sample business profiles
7. Admin endpoint to view peer group composition for debugging

**Prerequisites:** 1.4 (needs business profile data)

---

**Story 1.6: Session Aggregation & Journey Mapping**

As the analytics engine,
I want to aggregate raw tracking events into user sessions and journey sequences,
So that behavior patterns can be analyzed at the journey level.

**Acceptance Criteria:**
1. Background job processes raw events into sessions (grouped by session ID)
2. Journey sequences extracted: entry page → navigation path → exit/conversion
3. Session metadata calculated: duration, page count, bounce status, conversion status
4. Aggregation runs every 4-6 hours on new data
5. Session data stored in operational database (PostgreSQL)
6. Journey visualization data prepared (funnel stages with drop-off rates)
7. Performance: processes 10K sessions in <5 minutes

**Prerequisites:** 1.3 (needs raw tracking data)

---

**Story 1.7: Pattern Detection Engine**

As the analytics engine,
I want to identify statistically significant behavior patterns and friction points,
So that I can generate data-driven recommendations.

**Acceptance Criteria:**
1. Pattern detection algorithm analyzes sessions to identify:
   - High abandonment steps in user journeys (>30% drop-off)
   - Form fields with high re-entry rates (hesitation indicators)
   - Pages with below-average time-on-page (engagement issues)
2. Statistical significance thresholds applied (minimum 100 sessions for pattern confidence)
3. Patterns ranked by severity (abandonment rate × session volume)
4. Human-readable pattern summaries generated ("40% abandon at shipping form")
5. Pattern detection runs daily on aggregated session data
6. Detected patterns stored with confidence scores
7. Unit tests validate pattern detection logic with sample datasets

**Prerequisites:** 1.6 (needs aggregated session data)

---

**Story 1.8: Recommendation Generation Engine**

As the system,
I want to generate specific, actionable recommendations from detected patterns,
So that business owners receive clear guidance on what to optimize.

**Acceptance Criteria:**
1. Rule-based recommendation engine maps patterns to specific actions:
   - High form abandonment → "Make field X optional" or "Add helper text"
   - Shipping step drop-off → "Show estimated shipping earlier"
   - Product page bounces → "Improve product descriptions" or "Add more images"
2. Each recommendation includes: problem statement, specific action, expected impact range, confidence level
3. Peer data integration: if similar businesses solved this problem, include success rate
4. Recommendations prioritized by potential impact (abandonment rate × conversion value)
5. Generate 3-5 recommendations per business per week
6. Recommendations stored with generation timestamp and status (new/viewed/dismissed/implemented)
7. API endpoint to retrieve recommendations for a business

**Prerequisites:** 1.7 (needs detected patterns), 1.5 (for peer data)

---

**Story 1.9: Shopify Integration**

As an e-commerce business owner using Shopify,
I want to install MetricFortune with one click through the Shopify App Store,
So that tracking is automatically configured without manual script installation.

**Acceptance Criteria:**
1. Shopify app configuration created with required scopes (read orders, read products)
2. OAuth flow implemented for Shopify app installation
3. Tracking script automatically injected into Shopify store theme
4. Conversion events automatically tracked (add to cart, checkout started, purchase completed)
5. Product and order metadata captured for richer analysis
6. Uninstall flow removes tracking script cleanly
7. App listed in Shopify development store for testing

**Prerequisites:** 1.2 (needs tracking script), 1.3 (needs data ingestion API), 1.4 (needs user accounts)

---

**Story 1.10: System Testing & Validation**

As a developer,
I want comprehensive end-to-end testing of the entire data pipeline,
So that I can verify the system works correctly before building the dashboard.

**Acceptance Criteria:**
1. Test harness creates sample tracking data for multiple simulated businesses
2. End-to-end test validates: tracking → ingestion → aggregation → pattern detection → recommendation generation
3. Test verifies recommendations are generated within 24 hours of data collection
4. API integration tests for all endpoints (track, business profile, recommendations)
5. Performance tests validate system handles 1M sessions/month load
6. Data accuracy validated (session counts, pattern detection, peer matching)
7. Documentation of test results and system capabilities

**Prerequisites:** 1.1-1.9 (requires complete system)

---

## Epic 2: Dashboard & User Experience

**Expanded Goal:** Build the complete user-facing dashboard that transforms the backend intelligence (from Epic 1) into an intuitive, action-oriented interface. Business owners can log in to view prioritized recommendations, explore behavior insights through visual journey maps, compare their performance against similar businesses, mark recommendations as implemented, and track results over time. The dashboard embodies the "action-first" UX principle—every screen guides users toward clear next steps rather than overwhelming them with data.

**Value Delivery:** By the end of this epic, MetricFortune delivers its complete MVP value proposition—business owners receive specific, peer-validated optimization recommendations through an elegant interface that eliminates analysis paralysis and drives measurable conversion improvements.

---

**Story 2.1: Dashboard Home & Navigation**

As an e-commerce business owner,
I want a clean dashboard home that shows my top priority and key metrics at a glance,
So that I immediately understand what needs my attention.

**Acceptance Criteria:**
1. Dashboard home page with hero section displaying top-priority recommendation
2. Quick stats cards showing: current conversion rate, peer benchmark comparison, active recommendations count
3. Main navigation with tabs: Home, Recommendations, Journey Insights, Peer Benchmarks
4. Responsive layout works on desktop and tablet (mobile-phone deferred)
5. Empty states displayed when no data available yet ("Collecting data - check back in 24 hours")
6. User profile menu with: settings, business profile, logout
7. Dashboard loads in <2 seconds

**Prerequisites:** 1.4 (user authentication system), 1.8 (recommendations API available)

---

**Story 2.2: Recommendations Tab - List View**

As an e-commerce business owner,
I want to see all my optimization recommendations in a prioritized list,
So that I can review what changes to make to my site.

**Acceptance Criteria:**
1. Card-based layout displaying 3-5 recommendations per business
2. Each card shows: recommendation title, impact level badge (High/Medium/Low), confidence indicator, one-line summary
3. Recommendations sorted by priority (impact × confidence)
4. Filter options: status (New, Planned, Implemented, Dismissed), impact level
5. Click card to open detailed view (modal or side panel)
6. Visual indicators for new recommendations (badge or highlight)
7. Empty state when all recommendations addressed ("Great work! Check back next week for new insights")

**Prerequisites:** 1.8 (recommendations data), 2.1 (dashboard navigation)

---

**Story 2.3: Recommendation Detail View**

As an e-commerce business owner,
I want to see detailed information about each recommendation including the problem, solution, and peer proof,
So that I understand why this matters and feel confident implementing it.

**Acceptance Criteria:**
1. Detail view displays:
   - Problem statement with supporting data ("43% of users abandon at shipping form")
   - Specific action steps to implement the fix
   - Expected impact range ("15-20% reduction in abandonment")
   - Confidence level explanation (Medium: based on 100+ sessions)
   - Peer success data if available ("12 similar stores saw 18% average improvement")
2. Action buttons: "Mark as Planned", "Mark as Implemented", "Dismiss"
3. Implementation date picker when marking as implemented
4. Notes field for user to add context
5. Visual journey snippet showing where the problem occurs
6. Close/back action returns to recommendations list
7. Recommendation status changes reflected immediately in list view

**Prerequisites:** 2.2 (recommendations list), 1.8 (full recommendation data)

---

**Story 2.4: Journey Insights Tab - Visual Funnels**

As an e-commerce business owner,
I want to see visual journey maps showing where customers drop off,
So that I understand my site's conversion funnel and friction points.

**Acceptance Criteria:**
1. Journey Insights tab displays visual funnel diagram
2. Funnel shows key stages: Entry → Product View → Cart → Checkout → Purchase
3. Each stage shows: visitor count, drop-off percentage, conversion rate
4. Clickable stages reveal detailed breakdown (which pages, average time spent)
5. Multiple journey types displayed: Homepage visitors, Search visitors, Direct-to-product visitors
6. Date range selector (Last 7 days, Last 30 days, Last 90 days)
7. Plain-language summary above chart ("Your biggest opportunity: 43% abandon at checkout")

**Prerequisites:** 1.6 (journey aggregation data), 2.1 (dashboard navigation)

---

**Story 2.5: Peer Benchmarks Tab**

As an e-commerce business owner,
I want to see how my site performance compares to similar businesses,
So that I understand if I'm competitive and where I need to improve.

**Acceptance Criteria:**
1. Peer Benchmarks tab displays comparative metrics table
2. Key metrics shown: Conversion rate, Average order value, Cart abandonment rate, Bounce rate
3. Each metric shows: Your value, Peer average, Your percentile (top 25%, median, bottom 25%)
4. Visual indicators (colored badges or charts) for at-a-glance comparison
5. Peer group composition displayed ("Compared to 47 fashion e-commerce stores, $1-5M revenue")
6. Contextual explanations ("Your 3.2% conversion rate is in the bottom 40% of peers")
7. Link to relevant recommendations for underperforming metrics

**Prerequisites:** 1.5 (business matching), 2.1 (dashboard navigation)

---

**Story 2.6: Implementation Tracking & Results**

As an e-commerce business owner,
I want to track before/after metrics for recommendations I've implemented,
So that I can see if changes actually improved my conversion rates.

**Acceptance Criteria:**
1. "Implemented" tab/filter shows all implemented recommendations with status
2. Each implemented recommendation displays:
   - Implementation date
   - Before metrics (conversion rate, abandonment rate from pre-implementation period)
   - After metrics (same metrics from post-implementation period)
   - Change percentage (with positive/negative indicators)
   - Time since implementation
3. Automatic calculation of before/after periods (7 days before vs 7 days after implementation)
4. Visual charts showing metric trends over time
5. Status indicators: "Too early to measure" (<7 days), "Positive trend", "No change detected", "Negative trend"
6. Success celebrations for positive results (visual feedback, optional share)
7. Ability to add notes about implementation experience

**Prerequisites:** 1.8 (recommendations with status tracking), 1.6 (metrics calculation)

---

**Story 2.7: Email Notifications & Digests**

As an e-commerce business owner,
I want to receive weekly email notifications with new recommendations,
So that I'm proactively informed without needing to check the dashboard daily.

**Acceptance Criteria:**
1. Weekly digest email sent every Monday morning (user timezone)
2. Email contains: Top 2-3 new recommendations with one-sentence summaries
3. One-click deep links to view full recommendation details in dashboard
4. Email also includes: Quick stats (conversion rate trend), implementation wins (if any)
5. Email preferences manageable in user settings (frequency, types of notifications)
6. Transactional emails for: Account verification, password reset, significant metric changes
7. Email templates mobile-responsive and accessible
8. Unsubscribe functionality compliant with email regulations

**Prerequisites:** 1.8 (recommendations generation), 2.3 (recommendation detail links)

---

**Story 2.8: Business Profile Management**

As an e-commerce business owner,
I want to update my business profile information,
So that peer matching and recommendations remain relevant as my business evolves.

**Acceptance Criteria:**
1. Settings page with editable business profile form
2. Editable fields: Business name, industry, revenue range, product types, platform
3. Display current tracking script snippet with copy button
4. Option to regenerate site ID if needed (with warning about data impact)
5. Profile changes trigger peer group recalculation
6. Visual confirmation when changes saved successfully
7. Form validation prevents invalid data

**Prerequisites:** 1.4 (business profile data model), 2.1 (settings navigation)

---

**Story 2.9: Onboarding Flow Polish & First-Run Experience**

As a new user,
I want a smooth onboarding experience that guides me from signup to seeing my first insights,
So that I quickly understand the value and become engaged with the product.

**Acceptance Criteria:**
1. Post-registration onboarding flow: Business profile → Install tracking → Confirmation
2. Installation instructions page with:
   - Platform-specific tabs (Shopify, WooCommerce, Manual)
   - Copy-paste tracking snippet with syntax highlighting
   - Verification button to test if tracking is working
3. Success confirmation page: "Tracking active! First insights arriving in 24 hours"
4. Follow-up email 24 hours after installation: "Your first recommendations are ready"
5. In-dashboard tooltips on first login explaining key features (dismissible)
6. Progress indicators showing onboarding completion status
7. Optional quick tour highlighting: Recommendations tab, Journey Insights, Peer Benchmarks

**Prerequisites:** 1.4 (business profile), 1.2 (tracking script), 2.1-2.5 (core dashboard features)

---

**Story 2.10: Performance Optimization & Launch Preparation**

As a developer,
I want the dashboard to meet all performance and quality requirements for production launch,
So that users have a fast, reliable, and polished experience.

**Acceptance Criteria:**
1. Dashboard loads in <2 seconds (initial page load)
2. Navigation between tabs <500ms
3. All API calls optimized with caching strategies
4. Error boundaries implemented for graceful error handling
5. Loading states for all async operations (skeletons, spinners)
6. Accessibility audit passed (WCAG 2.1 AA: keyboard navigation, screen reader support, color contrast)
7. Cross-browser testing completed (Chrome, Firefox, Safari, Edge)
8. Mobile tablet responsiveness verified (iPad, Android tablets)
9. Analytics tracking added for user behavior (dogfooding MetricFortune)
10. Production deployment checklist completed and system live

**Prerequisites:** 2.1-2.9 (all dashboard features complete)

---

## Story Guidelines Reference

**Story Format:**

```
**Story [EPIC.N]: [Story Title]**

As a [user type],
I want [goal/desire],
So that [benefit/value].

**Acceptance Criteria:**
1. [Specific testable criterion]
2. [Another specific criterion]
3. [etc.]

**Prerequisites:** [Dependencies on previous stories, if any]
```

**Story Requirements:**

- **Vertical slices** - Complete, testable functionality delivery
- **Sequential ordering** - Logical progression within epic
- **No forward dependencies** - Only depend on previous work
- **AI-agent sized** - Completable in 2-4 hour focused session
- **Value-focused** - Integrate technical enablers into value-delivering stories

---

**For implementation:** Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown.
