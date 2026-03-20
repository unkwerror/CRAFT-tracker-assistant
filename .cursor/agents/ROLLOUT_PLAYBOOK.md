# Agent Rollout Playbook

This rollout maps agent activation to project roadmap phases from `TODO.md`.

## Phase A (immediate): Foundation for Stage 1

Primary agents:

- Backend Core
- Tracker Integration
- Dashboard UX
- Orchestrator
- Release Gate

Target outcomes:

1. stabilize DB schema rollout and app compatibility;
2. keep dashboard layout and widget-access flows consistent;
3. avoid API drift in tracker routes while Stage 1 backend moves.

## Phase B: CRM feature expansion (Stages 2 and 4)

Primary agents:

- CRM Analytics
- Tracker Integration
- Dashboard UX
- Orchestrator
- Release Gate

Target outcomes:

1. CRM widget behavior and transitions remain consistent;
2. analytics payload remains stable for dashboard consumers;
3. automation-related API and UI changes are shipped with contract checks.

## Phase C: Continuous documentation synchronization

Primary agents:

- Guide Content
- Orchestrator

Trigger:

- any major process or contract change that affects S10-S23 guidance.

Target outcomes:

1. guide reflects real runtime behavior;
2. no mismatch between documented and implemented workflows.

## Always-on gate

Release Gate stays active in all phases:

- build + lint + smoke checks;
- contract drift detection;
- DnD and interaction regression checks for touched areas.
