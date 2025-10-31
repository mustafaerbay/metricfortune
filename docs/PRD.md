# metricfortune Product Requirements Document (PRD)

**Author:** mustafa
**Date:** 2025-10-31
**Project Level:** 2
**Target Scale:** Medium project - multiple epics, 5-15 stories total

---

## Goals and Background Context

### Goals

- **Transform analytics from passive to actionable**: Deliver specific, implementable optimization recommendations rather than raw behavioral data
- **Achieve product-market fit with SMB e-commerce**: Acquire 500 paying customers within 12 months of launch, demonstrating the optimization advisor model resonates with the target market
- **Build collective intelligence moat**: Establish a network effect through peer-validated recommendations that improve as more businesses join the platform

### Background Context

MetricFortune addresses a critical gap in the e-commerce analytics market. While tools like Google Analytics excel at showing what happened (40% cart abandonment, 2.5-minute sessions), they fail to answer the essential questions: why did customers behave this way, and what specific actions should businesses take to improve conversions?

Small-to-mid-size e-commerce businesses ($500K-$10M revenue) spend 5-10 hours weekly analyzing dashboards without clear guidance, often resorting to expensive consultants ($5K-20K per engagement) for insights that software should automate. MetricFortune bridges this "Why Gap" through three core innovations: Journey-to-Action Translation (converting behavior patterns into specific recommendations), Collective Intelligence Engine (peer-validated proof from similar businesses), and "Why Detection" Analytics (diagnosing friction points, not just symptoms). The platform creates a defensible network effect moat—each new customer improves recommendations for all users—while directly serving the end goal of increasing conversions rather than just understanding data.

---

## Requirements

### Functional Requirements

**Data Collection & Tracking**
- FR001: System shall provide a JavaScript tracking snippet (<50KB) that captures user interactions including page views, clicks, form interactions, scroll behavior, and time on page
- FR002: System shall integrate with Shopify and WooCommerce platforms to automatically track conversion events and e-commerce specific actions
- FR003: System shall capture complete user journey sequences from entry through navigation to conversion or exit

**Business Matching & Segmentation**
- FR004: System shall collect business metadata through onboarding questionnaire (industry, business size, product types, revenue range)
- FR005: System shall automatically match users with similar businesses based on industry, size, product type, and detected tech stack
- FR006: System shall display peer group composition to users (e.g., "matched with 47 similar e-commerce businesses")

**Pattern Detection & Analysis**
- FR007: System shall automatically analyze customer behavior patterns across sessions and identify statistically significant friction points
- FR008: System shall generate human-readable journey summaries (e.g., "3 out of 5 customers abandon at checkout step 2")
- FR009: System shall detect user hesitation, data re-entry, and abandonment patterns with minimum session thresholds for statistical confidence

**Recommendation Engine**
- FR010: System shall generate 3-5 specific, actionable recommendations per week prioritized by potential impact
- FR011: System shall format recommendations with: Problem → Specific Action → Expected Impact → Confidence Level
- FR012: System shall incorporate peer success data when available (e.g., "Sites like yours tried X and saw Y% improvement")

**Dashboard & Reporting**
- FR013: System shall provide a dashboard with three core tabs: Recommendations (priority-ranked), Journey Insights (behavior patterns), and Peer Benchmarks (comparative metrics)
- FR014: System shall send weekly email digest with top 2-3 recommendations with one-click view access
- FR015: System shall allow users to mark recommendations as "Implemented," "Dismissed," or "Planned" and track before/after metrics for implemented changes

### Non-Functional Requirements

- NFR001: **Performance** - Dashboard shall load in <2 seconds for initial load and <500ms for navigation; tracking script shall add <100ms to customer page load times; system shall achieve 99.9% uptime
- NFR002: **Scalability** - System shall support 100 customers tracking 1M sessions/month at MVP launch, scaling to 500 customers with 10M sessions/month by Year 1
- NFR003: **Privacy & Security** - System shall comply with GDPR and CCPA requirements, anonymize all peer data aggregation, use TLS 1.3 for data in transit and AES-256 for data at rest, and provide cookie-less tracking options

---

## User Journeys

**User Journey: E-commerce Owner Receives and Implements First Recommendation**

**Persona:** Sarah, owner of a mid-size fashion e-commerce store ($2M annual revenue), currently uses Google Analytics but struggles to know what optimizations to make.

**Journey Steps:**

1. **Discovery & Signup**
   - Sarah finds MetricFortune through a Shopify App Store search for "conversion optimization"
   - Reviews the value proposition: "Get specific recommendations, not just data"
   - Signs up for 14-day free trial with email and password

2. **Onboarding & Setup**
   - Completes business profile questionnaire (industry: fashion, revenue range: $1-5M, platform: Shopify)
   - Installs MetricFortune via one-click Shopify integration
   - Tracking begins automatically; sees confirmation: "Tracking active - first insights in 24 hours"

3. **Peer Matching Notification**
   - Receives email after 6 hours: "You've been matched with 52 similar fashion e-commerce businesses"
   - Logs into dashboard, reviews peer group composition
   - Sees initial benchmark: "Your 3.2% conversion rate vs 3.8% peer average"

4. **First Recommendations Arrive**
   - Day 2: Receives email digest: "3 optimization opportunities detected"
   - Logs in to view detailed recommendations tab
   - Top recommendation flagged as "High Impact":
     - **Problem:** "43% of users abandon at shipping calculator step"
     - **Action:** "Display estimated shipping cost earlier in checkout flow"
     - **Expected Impact:** "15-20% reduction in cart abandonment (Medium confidence)"
     - **Peer Proof:** "12 similar stores implemented this change and saw 18% average improvement"

5. **Implementation Decision**
   - Reviews journey insights showing exactly where users drop off
   - Sees visual journey map: Product Page (100%) → Cart (78%) → Shipping (57%) → Payment (54%)
   - Decides to implement recommendation, marks as "Planned" in system
   - Makes change to Shopify theme to show shipping estimate on cart page

6. **Tracking Results**
   - Marks recommendation as "Implemented" with implementation date
   - System begins tracking before/after metrics automatically
   - After 7 days, receives email: "Your implemented change is showing positive results"
   - Dashboard shows: Cart abandonment decreased from 43% to 28% (35% improvement)

7. **Continued Engagement**
   - Feels validated by measurable success with first recommendation
   - Reviews 2 additional recommendations from weekly digest
   - Becomes regular user, checking dashboard 2x per week for new insights
   - Considers upgrading to paid plan before trial expires

**Success Criteria:**
- Time from signup to first recommendation: <24 hours ✓
- Recommendation relevance: Sarah finds it immediately actionable ✓
- Implementation friction: Low - made change in <30 minutes ✓
- Measurable outcome: Clear before/after improvement visible ✓
- User confidence: Trusts system enough to implement additional recommendations ✓

---

## UX Design Principles

1. **Action-First Design** - Every screen prioritizes what to do next over data visualization; recommendations are front and center, not buried in menus
2. **Radical Simplicity** - Dashboard eliminates analysis paralysis by showing only decision-ready insights; target is <5 minutes to understand and act
3. **Trust Through Transparency** - All recommendations clearly show confidence levels, peer data sources, and expected outcomes to build user trust
4. **Progressive Disclosure** - Start with simple summaries, allow drilling into details only when users need them; avoid overwhelming with data upfront

---

## User Interface Design Goals

**Target Platform:** Web application (desktop and tablet optimized)

**Core Screens:**
1. **Dashboard Home** - Hero section with top priority recommendation + quick stats (conversion rate, peer benchmark, active recommendations)
2. **Recommendations Tab** - Card-based layout showing 3-5 recommendations with impact level, confidence, and one-click details
3. **Journey Insights Tab** - Visual journey maps showing behavior patterns with plain-language summaries
4. **Peer Benchmarks Tab** - Comparative metrics showing "you vs similar businesses" with contextual explanations
5. **Recommendation Detail View** - Expanded view with problem diagnosis, specific action steps, peer proof, and implementation tracking
6. **Onboarding Flow** - 3-step setup: Account creation → Business profile → Integration installation

**Key Interaction Patterns:**
- Card-based recommendations with clear CTAs ("View Details", "Mark as Implemented")
- Visual journey flows using funnel/sankey diagrams with clickable stages
- Progressive information reveal (summary → details → implementation guide)
- Status-based organization (New, Planned, Implemented, Dismissed)

**Design Constraints:**
- Must work on modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions)
- Mobile-responsive for tablet viewing (phone optimization deferred to Phase 2)
- Dashboard must load in <2 seconds (performance constraint drives design decisions)
- Accessibility: WCAG 2.1 AA compliance for text contrast, keyboard navigation

---

## Epic List

**Epic 1: Foundation & Core Analytics Engine**
- Goal: Establish project infrastructure, implement tracking and data collection, build pattern detection and recommendation generation engine
- Estimated story count: 8-10 stories
- Deliverable: Working system that tracks user behavior, detects patterns, and generates basic recommendations

**Epic 2: Dashboard & User Experience**
- Goal: Build user-facing dashboard with recommendations display, journey insights visualization, peer benchmarking, and implementation tracking
- Estimated story count: 6-8 stories
- Deliverable: Complete web application where users can view, manage, and act on recommendations

> **Note:** Detailed epic breakdown with full story specifications is available in [epics.md](./epics.md)

---

## Out of Scope

**Advanced Analytics Features (Phase 2+):**
- Advanced "why detection" with micro-interaction tracking (mouse hesitation, rage clicks, detailed scroll patterns)
- Session replay capabilities for investigating specific user journeys
- AI-powered intent inference beyond basic pattern detection
- Predictive analytics and "what-if" scenario modeling

**Automated Testing & Optimization (Phase 2+):**
- Built-in A/B testing platform with visual editor
- Automated test deployment and winner determination
- Multi-variate testing capabilities
- Dynamic content modification based on recommendations

**Agency & Enterprise Features (Phase 2+):**
- Multi-site management dashboard for agencies
- White-label reporting capabilities
- Team collaboration features (comments, task assignment)
- Custom API for enterprise integrations

**Extended Integrations (Phase 2+):**
- Platforms beyond Shopify and WooCommerce (Magento, BigCommerce, Wix, etc.)
- CRM integrations (HubSpot, Salesforce)
- Marketing automation tools (Klaviyo, Mailchimp)
- Zapier/Make.com connectors

**Mobile & Additional Platforms:**
- Native iOS/Android mobile apps
- Full mobile-phone optimization (tablet-responsive only in MVP)
- Offline functionality

**Advanced Intelligence Features:**
- Autonomous optimization (AI making changes without human approval)
- Natural language conversational interface
- Proactive AI business advisor
- Real-time recommendation generation (MVP uses batch processing)

**Clarifications:**
- MVP focuses on web analytics only (not mobile app analytics)
- Google Analytics integration is data import only (not bi-directional sync)
- Peer validation uses seeded research data initially (collective intelligence builds over time)
- Manual A/B test tracking only (users indicate what they tested; no automated testing)
