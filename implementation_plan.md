# Insurer Dashboard V2: Quarter-over-Quarter (QoQ) KPIs & Dual Time-Series Charts

This implementation plan details the architectural upgrades necessary to integrate side-by-side volume and cost-trend charts, alongside dynamic MongoDB computations for QoQ percentage changes in the KPI cards.

## Proposed Changes

### Backend Aggregation Logic
---
#### [MODIFY] [insurerDashboardController.js](file:///d:/imitinet-workspace/backend/src/controllers/insurerDashboardController.js)
1. **Date Utility Functions**: Inject JavaScript calculations for `currentQuarterStart` and `previousQuarterStart`.
2. **QoQ Aggregation Metrics**: Refactor the `$facet` -> `metrics` block to utilize `$cond` logic that strictly counts payloads falling within the current quarter vs the previous quarter.
3. **Percentage Math Calculation**: Map the raw MongoDB counts into percentage changes (e.g., `+12%`, `-5%`) securely handling division-by-zero constraints before sending the JSON response.
4. **12-Month Time-Series Expansion**: Upgrade the `generateLast6Months` helper to `generate12Months(year)`, expanding the Recharts payload domain to cover January-December.

### Frontend UI & Animation
---
#### [MODIFY] [InsurerDashboard.jsx](file:///d:/imitinet-workspace/fronted/src/pages/insurer/InsurerDashboard.jsx)
1. **KPI Component Overhaul**: Redesign the 4 top cards to accurately mimic the user's provided layout structure. This includes rendering the raw string payloads (e.g., `+12% This Quarter`) with dynamic Tailwind text colors (`text-emerald-500` vs `text-red-500`).
2. **Chart Layout Injection**: Convert the middle grid section to support side-by-side charting.
    - **Claim Volume Trend**: Instantiate a `<LineChart>` dynamically configured with `type="monotone"`, a primary blue stroke, and tooltip glassmorphism.
    - **Cost Trend Analysis**: Instantiate a `<LineChart>` identically styled but with a green stroke representing RWF data formatted in Millions.
3. **Framer Motion Elements**: Encapsulate the `<LineChart>` boundaries in declarative `<motion.div>` variants for smooth upward entrance animations.

### Quality Assurance Module
---
#### [NEW] [InsurerDashboard.test.jsx](file:///d:/imitinet-workspace/fronted/src/tests/InsurerDashboard.test.jsx)
Build a mandatory React Testing Library (`@testing-library/react`) suite targeting Phase 3 requirements.
- Uses `vitest` to parse the virtual DOM.
- Mocks the API interceptor to guarantee static QoQ returns.
- Asserts that all KPI metrics explicitly render mathematically accurate `% This Quarter` strings.
- Asserts the Recharts nodes mount without throwing SVG parsing exception errors.

## User Review Required

> [!WARNING]
> Testing Recharts natively using JSDOM (React Testing Library) often fails because JSDOM lacks a physical rendering engine for SVG measurements (like `getBBox()`). We will implement `ResizeObserver` mocks to bypass this, but the chart's deepest internal tooltips might require specific simulation hacks to trigger natively in terminal mode. 
> Does this testing pathway align with your overarching QA standards, or would you prefer a Cypress E2E visual test instead of a Vitest unit test?

## Verification Plan

### Automated Tests
- Run `npm run test src/tests/InsurerDashboard.test.jsx`. Capture and output the literal console test results within this conversation context to prove testing mandates were passed securely.
