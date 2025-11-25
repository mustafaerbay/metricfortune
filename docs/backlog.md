# Engineering Backlog

This backlog collects cross-cutting or future action items that emerge from reviews and planning.

Routing guidance:

- Use this file for non-urgent optimizations, refactors, or follow-ups that span multiple stories/epics.
- Must-fix items to ship a story belong in that story's `Tasks / Subtasks`.
- Same-epic improvements may also be captured under the epic Tech Spec `Post-Review Follow-ups` section.

| Date | Story | Epic | Type | Severity | Owner | Status | Notes |
| ---- | ----- | ---- | ---- | -------- | ----- | ------ | ----- |
| 2025-11-12 | 2.1 | 2 | Bug | High | TBD | Open | Implement Vercel Analytics for Web Vitals measurement (AC #7). File: src/app/layout.tsx or src/app/(dashboard)/layout.tsx |
| 2025-11-12 | 2.1 | 2 | TechDebt | High | TBD | Open | Run Lighthouse audit, document results (target: LCP <2s, FID <100ms, CLS <0.1). File: docs/lighthouse-report-story-2-1.md |
| 2025-11-12 | 2.1 | 2 | TechDebt | High | TBD | Open | Perform 3G network throttling test via Chrome DevTools or Playwright, document load times. File: tests/performance/dashboard-load.spec.ts or docs/performance-results.md |
| 2025-11-12 | 2.1 | 2 | Bug | High | TBD | Open | Implement metrics panel repositioning when sidebar collapses OR remove this requirement from task list. File: src/app/(dashboard)/dashboard/page.tsx:218-241 |
| 2025-11-12 | 2.1 | 2 | Bug | Medium | TBD | Open | Increase navigation touch target size to 48px minimum (WCAG requirement). File: src/components/dashboard/sidebar.tsx:72,78 |
| 2025-11-12 | 2.1 | 2 | Bug | Medium | TBD | Open | Calculate trend values from historical data instead of hardcoding "+2.3%", "-1.5%". File: src/app/(dashboard)/dashboard/page.tsx:222,239 |
| 2025-11-12 | 2.1 | 2 | Enhancement | Medium | TBD | Open | Implement real peer benchmark comparison or document as MVP limitation in AC #2. File: src/app/(dashboard)/dashboard/page.tsx:111 |
| 2025-11-12 | 2.1 | 2 | TechDebt | Low | TBD | Open | Configure Tailwind theme variables for Bold Purple palette, replace hardcoded colors. File: tailwind.config.ts and all component files |
| 2025-11-12 | 2.1 | 2 | TechDebt | Low | TBD | Open | Verify middleware.ts or proxy.ts exists and properly protects /dashboard routes. File: src/middleware.ts or src/proxy.ts |
| 2025-11-25 | 2.4 | 2 | Enhancement | Medium | Amelia | Done | ✅ Added contextual descriptions and "Primary Entry" badge for stage pages. Completed 2025-11-25. File: src/components/dashboard/journey-funnel.tsx:336-372 (AC #4, Task 3.3) |
| 2025-11-25 | 2.4 | 2 | Bug | Medium | Amelia | Done | ✅ Implemented skip link with focus styles and added id="funnel-data-table" to hidden table. Completed 2025-11-25. File: src/components/dashboard/journey-funnel.tsx:87-93, 380 (Task 13.6) |
| 2025-11-25 | 2.4 | 2 | Enhancement | Low | Amelia | Done | ✅ Added formatted date display using date-fns format function showing "MMM dd, yyyy" range. Completed 2025-11-25. File: src/app/(dashboard)/dashboard/journey-insights/page.tsx:97-101 (Task 5.6) |
| 2025-11-25 | 2.4 | 2 | Enhancement | Low | Amelia | Done | ✅ Implemented responsive placeholder funnel with 5 stages and "Collecting data..." labels for desktop/mobile. Completed 2025-11-25. File: src/app/(dashboard)/dashboard/journey-insights/page.tsx:117-168 (Task 9.3) |
