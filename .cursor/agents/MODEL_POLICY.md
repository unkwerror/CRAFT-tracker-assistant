# Model Policy

## Objective

Balance quality, speed, and cost while minimizing regressions in high-risk areas.

## Baseline

- Orchestrator uses a more capable model by default for:
  - decomposition and planning;
  - dependency resolution;
  - final integration review.
- Specialized execution agents use a faster model by default for local/routine coding work.

## Upgrade triggers for specialized agents

Use a more capable model when any condition is true:

1. cross-module API contract change;
2. high-risk edits in `lib/tracker.mjs` or `lib/analytics.mjs`;
3. bugfix near release with unclear root cause;
4. schema + route + widget coupled change in one batch.

## Downgrade triggers

Use faster model when:

1. change is isolated to one area and one file group;
2. no contract change;
3. deterministic refactor or styling cleanup;
4. repetitive CRUD route patterns.

## Decision protocol

- Orchestrator labels each task with: `risk: low|medium|high`.
- `low/medium` -> faster execution model.
- `high` -> more capable model for either execution or final review.

## Mandatory review rule

Even when implemented by faster model, all high-risk deltas must be reviewed by Orchestrator before Release Gate.
