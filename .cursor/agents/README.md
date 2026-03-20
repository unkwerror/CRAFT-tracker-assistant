# Cursor Agent Workspace Setup

## Core documents

- `TOPOLOGY.md` - ownership and coordination model.
- `MODEL_POLICY.md` - model selection policy by risk.
- `HANDOFF_TEMPLATE.md` - required cross-agent handoff format.
- `ROLLOUT_PLAYBOOK.md` - staged activation by project roadmap.

## Rules

Agent rules are located in `.cursor/rules/agents/`:

- `00-shared-project-contract.mdc`
- `10-orchestrator-agent.mdc`
- `20-backend-core-agent.mdc`
- `30-tracker-integration-agent.mdc`
- `40-crm-analytics-agent.mdc`
- `50-dashboard-ux-agent.mdc`
- `60-guide-content-agent.mdc`
- `90-release-gate-agent.mdc`

## Operating principle

One user-facing Orchestrator coordinates specialized agents and enforces Release Gate before merge/deploy.
