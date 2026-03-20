# Agent Topology for CRAFT-tracker-assistant

## Communication model

- User talks to one agent only: `Orchestrator Agent`.
- Orchestrator delegates execution to specialized agents by domain ownership.
- Final response is consolidated by Orchestrator after Release Gate.

## Ownership matrix

| Agent | Primary ownership | Secondary checks |
|---|---|---|
| Orchestrator | cross-domain coordination, conflict resolution, sequencing | final synthesis |
| Backend Core | `lib/db.mjs`, `db/schema.sql`, `lib/api-helpers.mjs`, `lib/session.mjs`, `app/api/auth/**`, `app/api/admin/**`, `app/api/dashboard/layout/**`, `app/api/onboarding/**`, `app/api/queues/**` | API compatibility for dashboard consumers |
| Tracker Integration | `lib/tracker.mjs`, `app/api/tracker/**` | transitions and normalizeIssue compatibility |
| CRM Analytics | `lib/analytics.mjs`, `app/api/analytics/crm/**`, `app/api/export/crm/**`, `app/api/cron/crm-snapshot/**` | payload and field compatibility with CRM widgets |
| Dashboard UX | `components/dashboard/**`, `app/dashboard/**` | bridge protocol checks and interaction checks |
| Guide Content | `app/page.js`, `components/sections/block1..block7.js` | doc-to-runtime consistency |
| Release Gate | verification and merge gate | build/lint/smoke/contract drift |

## Cross-agent contracts

1. API route changes must include contract delta in handoff.
2. `lib/tracker.mjs` changes require tracker route cross-check.
3. Schema changes require explicit query compatibility note.
4. Dashboard UX changes must include loading/error/empty handling status.

## Escalation

- Any conflict in ownership is escalated to Orchestrator.
- Any unresolved contract ambiguity blocks merge until Release Gate receives updated handoff.
