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
| 2025-12-11 | 2.6 | 2 | TechDebt | Medium | TBD | Done | ✅ Resolved 2026-03-19. Optimized fetchDailyMetrics to single ranged query with in-memory grouping. File: src/services/analytics/implementation-tracker.ts:249-296 |
| 2025-12-11 | 2.6 | 2 | Enhancement | Low | TBD | Done | ✅ Resolved 2026-03-19. Celebration dismissal now uses localStorage. File: src/components/dashboard/success-celebration.tsx:28,46 |
| 2025-12-11 | 2.6 | 2 | Enhancement | Low | TBD | Done | ✅ Resolved 2026-03-19. Chart error has specific guidance + accessible retry button. File: src/components/dashboard/metric-trend-chart.tsx:96-113 |
| 2026-03-19 | 2.6 | 2 | Bug | High | TBD | Done | ✅ Resolved 2026-03-19. Created getDailyMetrics Server Action wrapper enforcing server boundary. File: src/actions/implementation-tracking.ts |
| 2026-03-19 | 2.6 | 2 | Bug | Medium | TBD | Done | ✅ Resolved 2026-03-19. Introduced savedNotes state in NotesEditor. File: src/components/dashboard/notes-editor.tsx:20,45 |
| 2026-03-19 | 2.6 | 2 | Bug | Medium | TBD | Done | ✅ Resolved 2026-03-19. Added auth() + business ownership check to getDailyMetrics. File: src/actions/implementation-tracking.ts:17-34 |
| 2026-03-19 | 2.7 | 2 | Bug | High | TBD | Open | AC6: metrics/significant-change event publisher missing — metricChangeNotifyJob handler registered but event never fired. Add WoW conversion rate check + inngest.send to session aggregation job. File: src/inngest/session-aggregation.ts |
| 2026-03-19 | 2.7 | 2 | Bug | Medium | TBD | Open | AC5: No separate notification type toggle for metric change alerts. emailNotificationsEnabled controls both digests and alerts with no granular control. File: prisma/schema.prisma, src/components/dashboard/email-preferences-form.tsx |
| 2026-03-19 | 2.7 | 2 | Enhancement | Medium | TBD | Open | AC1: Timezone-aware digest scheduling not implemented — cron hardcoded 8am UTC. Add UTC-limitation note to preferences UI or implement per-timezone fan-out. File: src/inngest/weekly-digest.ts:140, src/components/dashboard/email-preferences-form.tsx |
| 2026-03-19 | 2.7 | 2 | TechDebt | Low | TBD | Open | Add unit tests for metric-change-notify.ts (notifications-disabled skip, send, user-not-found). File: tests/unit/inngest/metric-change-notify.test.ts |
