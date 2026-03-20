# Agent Bridge Onboarding

## Purpose

This onboarding defines how the **Bridge Agent** coordinates frontend implementation with backend changes produced by Claude, while preserving API contracts and avoiding regressions in production.

## Role of the Bridge Agent

- Validate backend-to-frontend integration after each backend update.
- Translate backend contract changes into UI-safe tasks.
- Keep visual quality and UX consistency with project style.
- Prevent "silent drift" where backend evolves but widgets still render stale assumptions.

## Non-goals

- Do not rewrite backend business logic.
- Do not change DB schema from this role.
- Do not change `app/api/*` handlers unless explicitly approved.

## Source of truth

1. API route response shape (`app/api/*`).
2. Backend libraries (`lib/analytics.mjs`, `lib/tracker.mjs`) as data providers.
3. Frontend widgets must consume data from API responses, not recalculate backend metrics.

## Integration protocol (required)

### 1) Contract check

For every changed endpoint:

- confirm expected query params;
- confirm expected JSON shape;
- identify nullable fields and array/object variants;
- map each API field to exact UI element.

### 2) UI binding check

For each widget:

- verify it calls the right endpoint with correct params;
- verify loading/error/empty states are explicit;
- verify all critical fields are rendered;
- verify no fallback silently hides backend data issues.

### 3) Interaction check

- drag-and-drop does not conflict between native DnD and `dnd-kit`;
- comments/history/attachments flows are fully interactive;
- transitions update status optimistically but rollback on error.

### 4) Production check

- run `npm run build`;
- validate no hook-order errors, hydration mismatches, or minified React failures;
- review changed files for style consistency and readability.

## Frontend checklist by area

### CRM Analytics

- Uses `GET /api/analytics/crm?ml=true&changelog=true&cohort=month` (plus optional `managerId`).
- Reads from `data.analytics.*`.
- Renders:
  - `conversion`, `velocity`, `velocityChangelog`,
  - `scores`, `mlScores`,
  - `forecast`, `anomalies`,
  - `creationTrend`, `cohorts`,
  - `managerKPI`, `winLoss`,
  - `segments`, `conversionByPeriod`,
  - `revenueForecast`, `conversionPredictions`.

### CRM Kanban

- `LeadCard` is native `div`, `draggable={!!onDragStart}`.
- `handleDragStart` calls `e.stopPropagation()`.
- column drop logic uses transition availability (`/transitions`) before state change.
- modal tabs: overview, comments, history, attachments.

### Dashboard shell

- widget-level `dnd-kit` uses `setActivatorNodeRef` on drag handle only;
- pointer events inside widgets remain functional.

## Debug mode policy

Bridge Agent can add temporary diagnostics in UI:

- endpoint source labels;
- query params snapshot;
- item counts per tab/widget;
- brief note about mapping strategy.

Debug UI must be gated by:

- `NEXT_PUBLIC_DEBUG_WIDGETS=1`, or
- `?debugWidgets=1` query flag.

## Handoff format (Bridge Agent -> Claude / team)

Each handoff must include:

1. Endpoints validated.
2. Widgets validated.
3. Mismatches found.
4. Fixes applied.
5. Build/lint result.
6. Residual risk (if any).

## Definition of done

- Build succeeds.
- Key CRM widgets are interactive and correctly bound to backend data.
- No loss of critical Tracker workflow information in guide/onboarding content.
- Deployment-ready commit created.
