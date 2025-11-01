# MetricFortune UX Implementation Checklist

**Date:** 2025-10-31
**Developer Handoff Document**
**Based on:** UX Design Specification v1.0

This checklist guides developers through implementing MetricFortune's user experience. Complete each section in order, checking off items as you finish them.

---

## Phase 1: Setup & Foundation (Epic 2, Stories 1-2)

### ✅ Design System Setup

**Install shadcn/ui:**
- [ ] Install Next.js dependencies: `npx create-next-app@latest` (if not already done)
- [ ] Install Tailwind CSS: Follow [Tailwind Next.js setup](https://tailwindcss.com/docs/guides/nextjs)
- [ ] Install shadcn/ui: `npx shadcn-ui@latest init`
- [ ] Select base color: "Slate" (we'll customize to purple)
- [ ] Select CSS variables: "Yes"

**Configure Bold Purple Theme:**
- [ ] Open `tailwind.config.js` or `tailwind.config.ts`
- [ ] Add custom colors in `theme.extend.colors`:
  ```js
  primary: {
    DEFAULT: '#7c3aed',
    dark: '#6d28d9',
  },
  secondary: {
    DEFAULT: '#f97316',
  },
  accent: {
    DEFAULT: '#06b6d4',
  },
  ```
- [ ] Open `app/globals.css` (or equivalent)
- [ ] Update CSS variables for light mode:
  ```css
  :root {
    --primary: 261 73% 57%; /* #7c3aed */
    --secondary: 24 95% 53%; /* #f97316 */
    --accent: 189 94% 43%; /* #06b6d4 */
    --background: 270 100% 99%; /* #faf5ff */
    --foreground: 249 47% 20%; /* #1e1b4b */
    --muted: 240 5% 64%; /* #6b7280 */
    --border: 270 100% 93%; /* #e9d5ff */
    /* Add other semantic colors as needed */
  }
  ```

**Install Core shadcn/ui Components:**
- [ ] Button: `npx shadcn-ui@latest add button`
- [ ] Card: `npx shadcn-ui@latest add card`
- [ ] Badge: `npx shadcn-ui@latest add badge`
- [ ] Dialog: `npx shadcn-ui@latest add dialog`
- [ ] Form: `npx shadcn-ui@latest add form`
- [ ] Input: `npx shadcn-ui@latest add input`
- [ ] Select: `npx shadcn-ui@latest add select`
- [ ] Tabs: `npx shadcn-ui@latest add tabs`
- [ ] Toast: `npx shadcn-ui@latest add toast`
- [ ] Dropdown Menu: `npx shadcn-ui@latest add dropdown-menu`
- [ ] Progress: `npx shadcn-ui@latest add progress`
- [ ] Avatar: `npx shadcn-ui@latest add avatar`
- [ ] Separator: `npx shadcn-ui@latest add separator`

**Typography Setup:**
- [ ] Install Inter font (via next/font or Google Fonts)
- [ ] Configure in layout.tsx or _app.tsx
- [ ] Set base font size to 16px (default body text)
- [ ] Verify system font stack fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`

**Spacing & Layout:**
- [ ] Verify Tailwind spacing scale (should be default 4px base unit)
- [ ] Test: `space-1` = 4px, `space-4` = 16px, `space-8` = 32px
- [ ] Configure container max-width to 1280px if needed

**Icons:**
- [ ] Install Lucide React: `npm install lucide-react`
- [ ] Test a few icons: `import { Star, AlertCircle } from 'lucide-react'`

---

## Phase 2: Layout & Navigation (Epic 2, Stories 1-2)

### ✅ Desktop Sidebar Navigation

**Create Sidebar Component:**
- [ ] Create `/components/layout/sidebar.tsx`
- [ ] Implement fixed left sidebar: 260px width
- [ ] Add MetricFortune logo at top
- [ ] Add navigation items (Dashboard, Recommendations, Journey Insights, Peer Benchmarks, Implemented, Settings)
- [ ] Implement active state styling (purple background, white text)
- [ ] Add hover states for nav items
- [ ] Add user profile section at bottom (avatar, name, plan)
- [ ] Make sidebar scrollable if content overflows

**Sidebar Navigation Items:**
- [ ] Dashboard (home icon) - links to `/dashboard`
- [ ] Recommendations (star icon) - links to `/recommendations`
- [ ] Journey Insights (chart icon) - links to `/insights`
- [ ] Peer Benchmarks (bar chart icon) - links to `/benchmarks`
- [ ] Implemented (checkmark icon) - links to `/implemented`
- [ ] Settings (gear icon) - links to `/settings`

**Key Metrics Section in Sidebar:**
- [ ] Add "Key Metrics" heading between nav and user profile
- [ ] Create 4 MetricCard components (compact sidebar variant)
- [ ] Conversion Rate metric with trend arrow
- [ ] Active Recommendations count
- [ ] Peer Benchmark comparison
- [ ] Cart Abandonment rate
- [ ] Each card: 80px height, white bg, border, compact padding

**Main Layout Container:**
- [ ] Create `/components/layout/main-layout.tsx`
- [ ] Flex container: Sidebar (fixed 260px) + Main content (flex-1)
- [ ] Main content area: max-width 1100px, centered
- [ ] Add proper spacing and background colors

### ✅ Tablet Responsive Behavior (768px-1024px)

**Collapsible Sidebar:**
- [ ] Add state: `const [collapsed, setCollapsed] = useState(false)`
- [ ] At tablet breakpoint (768px), default collapsed to true
- [ ] Collapsed width: 80px (icon-only)
- [ ] On hover/tap: Expand to full 260px temporarily
- [ ] Show only icons when collapsed (with tooltips)
- [ ] Smooth transition animation (250ms)

**Key Metrics Relocation:**
- [ ] When sidebar collapsed, move metrics to top of main content
- [ ] Horizontal scrolling row of metric cards
- [ ] Each card 180px wide
- [ ] Swipeable on touch devices
- [ ] Use `overflow-x: auto` with `scroll-snap-type: x mandatory`

### ✅ Mobile Navigation (<768px)

**Hamburger Menu & Drawer:**
- [ ] Add hamburger icon button (top-left)
- [ ] Implement slide-out drawer navigation from left
- [ ] Full-screen overlay (semi-transparent backdrop)
- [ ] Drawer width: 280px
- [ ] Close on backdrop click or X button
- [ ] Close on navigation item selection
- [ ] Smooth slide animation (300ms)

**Bottom Navigation Bar:**
- [ ] Create fixed bottom nav: 64px height
- [ ] 4 navigation items with icons + labels
- [ ] Dashboard (home icon)
- [ ] Recommendations (star icon)
- [ ] Journey Insights (chart icon)
- [ ] More (dots icon → opens drawer)
- [ ] Active state: Purple color
- [ ] Touch targets: 64×64px minimum

**Mobile Top Bar:**
- [ ] Fixed top bar: 60px height
- [ ] Hamburger menu button (left)
- [ ] MetricFortune logo/wordmark (center)
- [ ] Settings icon button (right)
- [ ] White background with bottom border

**Mobile Key Metrics Carousel:**
- [ ] Horizontal scrolling carousel
- [ ] One metric card visible at a time
- [ ] Full width minus 32px padding (16px each side)
- [ ] Swipe gesture support
- [ ] Dot indicators showing position (1/4, 2/4, etc.)
- [ ] Snap to center of each card

---

## Phase 3: Custom Components (Epic 2, Stories 3-4)

### ✅ RecommendationCard Component

**File:** `/components/recommendations/recommendation-card.tsx`

**Props:**
```typescript
interface RecommendationCardProps {
  id: string;
  icon: string; // emoji or icon name
  title: string;
  description: string;
  impactLevel: 'high' | 'medium' | 'low';
  peerProof: string; // e.g., "12 stores saw +18% improvement"
  onClick: () => void;
  onDismiss: () => void;
}
```

**Implementation Checklist:**
- [ ] Card container: 360px min-width, border, rounded-lg, white bg
- [ ] Icon area: 64×64px circle with gradient background
- [ ] Impact badge (top-right): Use ImpactBadge component
- [ ] Title: H3, 20px, 2-line max with ellipsis (`line-clamp-2`)
- [ ] Description: Body text, 3-line max with ellipsis (`line-clamp-3`)
- [ ] Footer: Peer proof text (green checkmark icon + text)
- [ ] Action buttons: "View Details" (primary), "Dismiss" (secondary)
- [ ] Hover state: Purple border, subtle shadow, lift 2px
- [ ] Click entire card → calls onClick
- [ ] Dismiss button → calls onDismiss with confirmation
- [ ] Stagger animation on mount (100ms delay between cards)

**Accessibility:**
- [ ] Card is semantic button or link for keyboard nav
- [ ] ARIA label: `aria-label={`Recommendation: ${title}, ${impactLevel} impact`}`
- [ ] Tab order: Card → Dismiss → View Details
- [ ] Focus visible indicator (2px purple outline)

**Responsive Variants:**
- [ ] Desktop: 360px min-width, fits 2-3 per row
- [ ] Tablet: 2 per row, fills available width
- [ ] Mobile: Full width, single column, 16px horizontal padding

### ✅ MetricCard Component

**File:** `/components/metrics/metric-card.tsx`

**Props:**
```typescript
interface MetricCardProps {
  label: string;
  value: string | number;
  change?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  trend?: number[]; // sparkline data
  variant?: 'sidebar' | 'carousel' | 'hero';
  onClick?: () => void;
}
```

**Implementation Checklist:**
- [ ] Label: 12px uppercase, secondary text color
- [ ] Value: 32px bold, primary text color
- [ ] Change indicator: Arrow (↑/↓) + text + color
- [ ] Up/positive: Green color with up arrow
- [ ] Down/negative: Red color with down arrow
- [ ] Optional sparkline: 40px tall mini line chart
- [ ] White background, subtle border
- [ ] Hover: Slight elevation, tooltip with details
- [ ] Click (if onClick provided): Filter view by metric

**Variants:**
- [ ] Sidebar: 80px height, compact vertical layout
- [ ] Carousel (mobile): Full width, larger fonts (40px value)
- [ ] Hero: Larger size with prominent visualization

**Accessibility:**
- [ ] ARIA label: `aria-label={`${label}: ${value}${change ? ', ' + change.direction + ' ' + change.value : ''}`}`
- [ ] Color not sole indicator: Always include arrow symbols
- [ ] Clickable: Button semantics if onClick provided

### ✅ ImpactBadge Component

**File:** `/components/recommendations/impact-badge.tsx`

**Props:**
```typescript
interface ImpactBadgeProps {
  level: 'high' | 'medium' | 'low';
  variant?: 'standard' | 'icon-only';
}
```

**Implementation Checklist:**
- [ ] Pill shape: Rounded-full, 12px text, bold, uppercase
- [ ] High: Green bg (#dcfce7), dark green text (#15803d)
- [ ] Medium: Amber bg (#fef3c7), dark amber text (#a16207)
- [ ] Low: Gray bg (#f3f4f6), dark gray text (#374151)
- [ ] Standard variant: Shows "HIGH IMPACT", "MEDIUM IMPACT", "LOW IMPACT"
- [ ] Icon-only variant: Shows "!" icon with count
- [ ] Padding: 4px horizontal, 8px vertical

**Accessibility:**
- [ ] Text explicitly states level (not just color)
- [ ] ARIA label matches visible text

### ✅ ConfidenceMeter Component

**File:** `/components/recommendations/confidence-meter.tsx`

**Props:**
```typescript
interface ConfidenceMeterProps {
  level: 'high' | 'medium' | 'low';
  details?: string; // tooltip text explaining confidence
}
```

**Implementation Checklist:**
- [ ] Horizontal progress bar: 100% width
- [ ] High: 75-100% filled, green color
- [ ] Medium: 40-74% filled, amber color
- [ ] Low: 0-39% filled, gray color
- [ ] Label: "Confidence: High/Medium/Low"
- [ ] Tooltip on hover: Shows details (session count, peer matches)
- [ ] Smooth fill animation on mount

**Accessibility:**
- [ ] Semantic `<progress>` element
- [ ] ARIA label: `aria-label={`Confidence level: ${level}${details ? ', ' + details : ''}`}`
- [ ] Visible label text matches aria-label

### ✅ JourneyVisualization Component

**File:** `/components/insights/journey-visualization.tsx`

**Props:**
```typescript
interface JourneyStage {
  name: string;
  count: number;
  percentage: number;
}

interface JourneyVisualizationProps {
  stages: JourneyStage[];
  variant?: 'horizontal' | 'vertical' | 'sankey';
  onStageClick?: (stage: JourneyStage) => void;
}
```

**Implementation Checklist:**
- [ ] Funnel visualization showing stages: Product → Cart → Shipping → Payment → Success
- [ ] Each stage shows percentage and count
- [ ] Drop-off visualization between stages
- [ ] Hover state: Highlight stage, show tooltip
- [ ] Click stage: Opens detailed insights (if onStageClick provided)
- [ ] Animated entrance: Stages fill in sequence (stagger 150ms)
- [ ] Horizontal layout for desktop
- [ ] Vertical layout for mobile
- [ ] Consider library: Recharts or custom SVG

**Accessibility:**
- [ ] Data table fallback for screen readers
- [ ] Table with columns: Stage, Entry Count, Exit Count, Conversion Rate
- [ ] ARIA label for each stage
- [ ] Keyboard navigable if clickable

### ✅ PeerBenchmarkComparison Component

**File:** `/components/benchmarks/peer-comparison.tsx`

**Props:**
```typescript
interface PeerBenchmarkComparisonProps {
  yourValue: number;
  peerAverage: number;
  metric: string;
  peerCount: number;
  unit?: string; // e.g., "%", "seconds"
}
```

**Implementation Checklist:**
- [ ] Two horizontal bars: "Your Store" and "Peer Average"
- [ ] Bar lengths proportional to values
- [ ] Values labeled on right
- [ ] Difference percentage shown (e.g., "+0.6%")
- [ ] Above average: Your bar longer, green indicator
- [ ] Below average: Peer bar longer, amber/red indicator
- [ ] Peer count text: "vs 52 similar stores"
- [ ] Hover: Tooltip shows peer group composition
- [ ] Click: Opens full peer benchmarks page

**Accessibility:**
- [ ] Not relying on bar length alone
- [ ] Text explicitly states: "Your conversion rate: 3.2% vs peer average: 3.8%"
- [ ] ARIA label includes full comparison

### ✅ BeforeAfterChart Component

**File:** `/components/recommendations/before-after-chart.tsx`

**Props:**
```typescript
interface BeforeAfterChartProps {
  metric: string;
  beforeData: { date: string; value: number }[];
  afterData: { date: string; value: number }[];
  implementationDate: string;
  improvement: number; // percentage
}
```

**Implementation Checklist:**
- [ ] Line or bar chart showing metric over time
- [ ] Vertical divider at implementation date
- [ ] "Before" and "After" labels on sections
- [ ] Improvement percentage prominently displayed
- [ ] Positive: Green chart line/bars after implementation
- [ ] No change: Gray, neutral messaging
- [ ] Negative: Red, warning messaging
- [ ] Animated entrance: Line draws in, bars grow
- [ ] Hover data points: Tooltip with exact values
- [ ] Click chart: Opens detailed analytics
- [ ] Use Recharts library for charting

**Accessibility:**
- [ ] Data table fallback for screen readers
- [ ] Alt text: "Conversion rate increased from 3.2% to 4.1% after implementation"
- [ ] Table with Date, Value columns

---

## Phase 4: Page Layouts (Epic 2, Stories 3-4)

### ✅ Dashboard Home Page

**File:** `/app/dashboard/page.tsx`

**Layout:**
- [ ] Page title: "Dashboard" (H1)
- [ ] Stats row: 3 MetricCard components (hero variant)
- [ ] Section: "Top Priority Recommendation"
- [ ] Display highest impact recommendation (larger card or hero style)
- [ ] Section: "More Recommendations"
- [ ] Card grid: 2-3 columns of RecommendationCard components
- [ ] Empty state: If no recommendations, show encouraging message

**Responsive:**
- [ ] Desktop: 3-column stats, 3-column cards
- [ ] Tablet: 3-column stats, 2-column cards
- [ ] Mobile: 1-column stats (carousel), 1-column cards

### ✅ Recommendations Page

**File:** `/app/recommendations/page.tsx`

**Layout:**
- [ ] Page header: Title + Filter/Sort controls
- [ ] Filter tabs: All, High Impact, Medium Impact, Low Impact
- [ ] Sort dropdown: Priority, Date, Impact Level
- [ ] Card grid: All recommendations
- [ ] Empty states: "No recommendations match your filters"
- [ ] Load more / pagination if >20 recommendations

**Responsive:**
- [ ] Desktop: 3-column grid
- [ ] Tablet: 2-column grid
- [ ] Mobile: 1-column, filters collapse to dropdown

### ✅ Recommendation Detail Modal

**File:** `/components/recommendations/recommendation-detail-modal.tsx`

**Layout (using shadcn Dialog):**
- [ ] Dialog Header: Title + ImpactBadge + Close button
- [ ] Problem Section:
  - [ ] Heading: "The Problem"
  - [ ] JourneyVisualization component
  - [ ] Text description with your data
- [ ] Solution Section:
  - [ ] Heading: "Recommended Solution"
  - [ ] Numbered implementation steps
  - [ ] Code snippet or plugin suggestion (if applicable)
- [ ] Proof Section:
  - [ ] Heading: "Why This Works"
  - [ ] PeerBenchmarkComparison component
  - [ ] ConfidenceMeter component
  - [ ] Link to case study or article
- [ ] Dialog Footer:
  - [ ] Primary button: "Mark as Planned"
  - [ ] Secondary button: "Mark as Implemented"
  - [ ] Ghost button: "Dismiss"

**Interactions:**
- [ ] Mark as Planned → Show toast, update status, close modal
- [ ] Mark as Implemented → Show date picker modal, then confirm
- [ ] Dismiss → Show confirmation dialog, then dismiss
- [ ] Close (X or Escape) → Close modal

**Responsive:**
- [ ] Desktop: 800px width
- [ ] Tablet: 90vw width
- [ ] Mobile: Full screen (100vw, 100vh)

---

## Phase 5: Interactions & States (Epic 2, Stories 5-6)

### ✅ Toast Notifications

**Implementation:**
- [ ] Install/configure shadcn Toast (already done in Phase 1)
- [ ] Create toast service/hook: `useToast()`
- [ ] Success toast: Green background, checkmark icon, 4s duration
- [ ] Error toast: Red background, alert icon, 6s duration
- [ ] Info toast: Blue background, info icon, 5s duration
- [ ] Warning toast: Amber background, warning icon, manual dismiss
- [ ] Desktop: Top-right corner, 24px from edges
- [ ] Mobile: Bottom of screen (above bottom nav), full width minus 16px
- [ ] Max 3 toasts visible, oldest auto-dismisses

**Example Toasts:**
- [ ] "Recommendation marked as implemented"
- [ ] "Settings saved successfully"
- [ ] "Tracking script not detected"
- [ ] "Trial ending in 3 days"

### ✅ Loading States

**Skeleton Screens:**
- [ ] Create skeleton components for: RecommendationCard, MetricCard
- [ ] Animated shimmer effect
- [ ] Use while fetching data (instead of spinners)
- [ ] Match dimensions of actual components

**Button Loading States:**
- [ ] Add loading prop to buttons
- [ ] Show spinner icon inside button
- [ ] Disable button while loading
- [ ] Text changes: "Saving..." instead of "Save"

**Progress Indicators:**
- [ ] Use shadcn Progress component for multi-step processes
- [ ] Onboarding: Show "Step 1 of 2", "Step 2 of 2"
- [ ] Data processing: "Analyzing your data... 60% complete"

### ✅ Empty States

**Create EmptyState Component:**
- [ ] Icon or illustration (120px)
- [ ] Title (encouraging tone)
- [ ] Description (what to expect, why empty)
- [ ] Primary CTA button
- [ ] Use for:
  - [ ] No recommendations yet
  - [ ] No results from filters
  - [ ] All recommendations dismissed

**Examples:**
- [ ] First use: "Analyzing your data... First recommendations ready in 18 hours"
- [ ] No results: "No recommendations match your filters" + "Clear filters" button
- [ ] All cleared: "All caught up! New recommendations appear weekly"

### ✅ Error States

**Error Handling:**
- [ ] Form errors: Red border, icon, message below field
- [ ] Page-level errors: Banner at top with alert icon
- [ ] API errors: Toast notification with retry option
- [ ] 404 page: Friendly message with link back home
- [ ] 500 page: Apologetic message with support link

**Error Messages:**
- [ ] Specific: "Email format is invalid" not "Error"
- [ ] Helpful: Suggest how to fix
- [ ] Not color-only: Icon + text + border

---

## Phase 6: Responsive Testing (Epic 2, Story 7)

### ✅ Desktop Testing (1024px+)

- [ ] Test at 1920px width (common large monitor)
- [ ] Test at 1366px width (common laptop)
- [ ] Test at 1280px width (design max-width)
- [ ] Verify sidebar is persistent and visible
- [ ] Verify card grid shows 3 columns at wider widths
- [ ] Verify all metrics visible in sidebar
- [ ] Test hover states on all interactive elements
- [ ] Verify focus indicators visible

### ✅ Tablet Testing (768px-1024px)

- [ ] Test at 1024px width (landscape tablet)
- [ ] Test at 768px width (portrait tablet)
- [ ] Verify sidebar collapses to icon-only
- [ ] Verify sidebar expands on hover
- [ ] Verify metrics move to top carousel
- [ ] Verify card grid shows 2 columns
- [ ] Test touch interactions (if testing on device)
- [ ] Verify all touch targets ≥40px

### ✅ Mobile Testing (<768px)

- [ ] Test at 375px width (iPhone SE, common small phone)
- [ ] Test at 390px width (iPhone 12/13 Pro)
- [ ] Test at 414px width (iPhone 14 Plus)
- [ ] Verify hamburger menu and drawer navigation work
- [ ] Verify bottom navigation bar is visible and works
- [ ] Verify metrics carousel is swipeable
- [ ] Verify single-column card layout
- [ ] Verify all touch targets ≥48px
- [ ] Test on actual mobile devices (iOS and Android)
- [ ] Test landscape orientation

### ✅ Responsive Breakpoint Testing

- [ ] Slowly resize browser from 320px to 1920px
- [ ] Verify smooth transitions at breakpoints (768px, 1024px)
- [ ] Verify no horizontal scrolling at any width
- [ ] Verify no content cut off or overlapping
- [ ] Verify images/icons scale appropriately

---

## Phase 7: Accessibility Implementation (Epic 2, Story 8)

### ✅ Keyboard Navigation

- [ ] Test tab order on all pages (logical, follows visual flow)
- [ ] Verify all interactive elements focusable
- [ ] Verify focus indicators visible (2px purple outline)
- [ ] Add skip link: "Skip to main content" (visually hidden until focused)
- [ ] Test modal focus trap (tab cycles within modal)
- [ ] Test Escape key closes modals/dropdowns
- [ ] Test Enter/Space activates buttons
- [ ] Test Arrow keys navigate dropdown menus
- [ ] Verify no keyboard traps (can navigate away from all elements)

### ✅ Screen Reader Support

**Semantic HTML:**
- [ ] Use proper heading hierarchy (H1 → H2 → H3)
- [ ] Add landmark regions: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`
- [ ] Use `<ul>`/`<ol>` for lists (nav, recommendations)
- [ ] Use `<table>` for data tables (with `<th>` headers)
- [ ] Use native `<button>` elements (not divs)
- [ ] Use semantic `<a>` tags with href

**ARIA Labels:**
- [ ] Add aria-label to icon-only buttons
- [ ] Add aria-label to recommendation cards with full context
- [ ] Add aria-live="polite" to toast notification container
- [ ] Add appropriate ARIA roles (dialog, tabpanel, etc.)
- [ ] Add aria-required="true" to required form fields
- [ ] Add aria-invalid="true" to fields with errors

**Alt Text:**
- [ ] All images have descriptive alt text
- [ ] Decorative images have empty alt: `alt=""`
- [ ] Charts have alt text summarizing the trend
- [ ] Charts have data table fallback

**Screen Reader Testing:**
- [ ] Test with NVDA (Windows) or VoiceOver (Mac)
- [ ] Navigate entire app using only screen reader
- [ ] Verify all content is announced clearly
- [ ] Verify form labels are associated correctly
- [ ] Verify status changes are announced
- [ ] Verify modals announce correctly when opened

### ✅ Color Contrast

**Automated Testing:**
- [ ] Run Lighthouse accessibility audit
- [ ] Run axe DevTools extension
- [ ] Run WAVE browser extension
- [ ] Fix all contrast issues flagged

**Manual Verification:**
- [ ] Primary text (#1e1b4b) on white: ≥4.5:1 ✓
- [ ] Secondary text (#6b7280) on white: ≥4.5:1 ✓
- [ ] Purple buttons (#7c3aed): Only large text or white text on purple
- [ ] All interactive elements: ≥3:1 against background
- [ ] Test with color blindness simulator

### ✅ Touch Targets & Motor Accessibility

- [ ] Verify all mobile touch targets ≥48×48px
- [ ] Verify desktop clickable elements ≥40×40px
- [ ] Verify minimum 8px spacing between touch targets
- [ ] Test with external mouse (desktop)
- [ ] Test with finger/thumb (mobile)
- [ ] Verify no small clickable areas

### ✅ Motion & Animation

- [ ] Implement `prefers-reduced-motion` media query
- [ ] When reduced motion enabled: Disable animations, use instant transitions
- [ ] Keep essential motion only: Focus indicators, loading states
- [ ] Verify no auto-play videos or carousels
- [ ] Keep animation durations <400ms

### ✅ Form Accessibility

- [ ] Every input has visible label (not just placeholder)
- [ ] Labels associated via `for` attribute or wrapping
- [ ] Required fields marked with asterisk + aria-required
- [ ] Errors shown with icon + text (not color alone)
- [ ] Error messages specific and helpful
- [ ] Form-level error summary at top
- [ ] Test form submission with keyboard only
- [ ] Verify focus moves to first error on submit

---

## Phase 8: Testing & Quality Assurance

### ✅ Automated Testing

- [ ] Run Lighthouse on all pages (target: 90+ accessibility score)
- [ ] Run axe DevTools on all pages (fix all issues)
- [ ] Run WAVE browser extension (fix all errors)
- [ ] Set up automated accessibility tests in CI/CD
- [ ] Write unit tests for custom components
- [ ] Write integration tests for critical user journeys

### ✅ Manual Testing

**Browsers:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Devices:**
- [ ] iPhone (Safari iOS)
- [ ] Android phone (Chrome Android)
- [ ] iPad (Safari iPadOS)
- [ ] Windows laptop (Chrome/Edge)
- [ ] Mac laptop (Safari/Chrome)

**Accessibility Testing:**
- [ ] Navigate entire app using only keyboard
- [ ] Navigate entire app using only screen reader
- [ ] Test with color blindness simulator
- [ ] Test at 200% browser zoom
- [ ] Test on actual mobile devices

**User Acceptance:**
- [ ] Complete onboarding flow from start to finish
- [ ] View and interact with all recommendation states
- [ ] Mark recommendation as planned/implemented
- [ ] View before/after results
- [ ] Navigate all pages
- [ ] Test all error scenarios

### ✅ Performance Testing

- [ ] Lighthouse performance audit (target: 90+)
- [ ] Verify dashboard loads in <2 seconds
- [ ] Verify navigation transitions <500ms
- [ ] Verify no layout shift (CLS < 0.1)
- [ ] Verify images optimized and lazy loaded
- [ ] Test on slow 3G connection

---

## Phase 9: Documentation & Handoff

### ✅ Component Documentation

- [ ] Document all custom components in README or Storybook
- [ ] Include props/API documentation
- [ ] Include usage examples
- [ ] Include screenshots/demos
- [ ] Document responsive behavior
- [ ] Document accessibility features

### ✅ Developer Documentation

- [ ] Document design system usage
- [ ] Document color palette and usage guidelines
- [ ] Document typography scale
- [ ] Document spacing system
- [ ] Document component composition patterns
- [ ] Document common patterns (modals, toasts, etc.)

### ✅ Deployment Checklist

- [ ] Verify all environment variables set
- [ ] Verify analytics tracking configured
- [ ] Verify error tracking configured (Sentry, etc.)
- [ ] Verify all API endpoints working
- [ ] Run final accessibility audit
- [ ] Run final performance audit
- [ ] Test on production-like environment
- [ ] Create deployment runbook

---

## Reference Links

**Design Specification:**
- Main UX Spec: `/docs/ux-design-specification.md`
- Color Themes: `/docs/ux-color-themes.html`
- Design Mockups: `/docs/ux-design-directions.html`

**External Resources:**
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI (shadcn base)](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)
- [Recharts (for data viz)](https://recharts.org/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

**Testing Tools:**
- [Lighthouse (in Chrome DevTools)](https://developers.google.com/web/tools/lighthouse)
- [axe DevTools Extension](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [NVDA Screen Reader (Windows)](https://www.nvaccess.org/)
- [VoiceOver (Mac/iOS - built-in)](https://www.apple.com/accessibility/voiceover/)

---

## Notes for Developers

**Priority Order:**
1. Complete Phase 1-2 (setup, layout) first - establishes foundation
2. Build core components (Phase 3) - reusable building blocks
3. Assemble pages (Phase 4) using components
4. Add interactions (Phase 5) - polish and feedback
5. Test responsive (Phase 6) - ensure works on all devices
6. Implement accessibility (Phase 7) - compliance and inclusivity
7. Test thoroughly (Phase 8) - quality assurance
8. Document (Phase 9) - future maintainability

**Code Quality:**
- Follow TypeScript strict mode
- Use ESLint with accessibility plugins
- Use Prettier for code formatting
- Write meaningful commit messages
- Create PRs for each phase
- Request code reviews before merging

**Communication:**
- Ask questions early if specification unclear
- Report accessibility issues immediately
- Suggest improvements to UX spec
- Document decisions and trade-offs
- Share progress regularly with team

**Remember:**
This is a living checklist - update it as you discover new requirements or challenges during implementation!

---

**Good luck building MetricFortune! 🚀**
