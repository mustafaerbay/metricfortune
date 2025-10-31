# Epic 2: Dashboard & User Experience

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
