---
name: yalla-team
description: >
  Full autonomous coding team for complex changes. This is now a thin wrapper around /yalla with mandatory subagent use for planning, build/test separation, and review separation. Use only when the task is too broad or risky for a single-agent /yalla run. Uses GitHub Issues (`issue-###`) only.
argument_hint: "[description of what to build, or issue-### to resume]"
---

# /yalla-team

Use `/yalla-team` when a complex change benefits from multiple independent agents. It follows the same GitHub Issue protocol, artifact policy, merge policy, and review gates as `/yalla`.

Default shipping policy: create a PR only. Do not merge unless the user explicitly approved auto-merge in this run.

For non-trivial work, apply the operator-understanding protocol (see `${CLAUDE_PLUGIN_ROOT}/knowledge/yalla/`) across planning, build summaries, review, compound, and PR output. The goal is decision-useful operator understanding, scaled by risk, not mandatory teaching theater.

The orchestrator role and exact subagent prompts live in `${CLAUDE_PLUGIN_ROOT}/agents/yalla-lead.md` and `${CLAUDE_PLUGIN_ROOT}/knowledge/yalla/TEAMMATE-PROMPTS.md`.

## Hard Rules

- Canonical ID format is `issue-###`.
- Do not invent a parallel ID scheme for new work; reference issues by `issue-###`.
- GitHub Issues are the canonical task store. (An optional SQL task store is described in `${CLAUDE_PLUGIN_ROOT}/knowledge/yalla/SQL-TEMPLATES.md`; only use it if `.claude/YALLA.md` sets `tracking_mode: db`.)
- Creator != reviewer: the context that writes code does not do final review.

## Flow

1. Run `/yalla` Pre-Flight, Classify, and Track phases.
2. Use `${CLAUDE_PLUGIN_ROOT}/knowledge/yalla/TEAMMATE-PROMPTS.md` for exact subagent prompts and `${CLAUDE_PLUGIN_ROOT}/agents/yalla-lead.md` for orchestration.
3. Planning: spawn codebase analyst, solution architect, spec validator, and red team for non-trivial planning.
4. Build: use tester-led vertical slices when feasible. Tester owns behavior evidence; implementer owns production code.
5. Review: spawn fresh-context reviewers based on risk tier and triggered checks.
6. Compound and Ship: use `/yalla` phases exactly, including PR-only default and `gh pr checks` as CI source of truth.

## When To Prefer Plain `/yalla`

- Tiny hotfixes.
- Docs/config-only work.
- One-file fixes with obvious validation.
- Tasks where subagent overhead would produce more process than evidence.

## Quality Gates

- Plan is grounded in code and docs.
- Work is split into user-testable vertical slices.
- Acceptance criteria have public-seam evidence or explicit accepted risk.
- Risk-triggered checks run only when their triggers apply.
- PR body identifies risk tier, reviewer entry points, validation evidence, docs impact, and merge policy.
- Non-trivial work includes operator-understanding evidence scaled to `light`, `default`, or `deep`.

## Anti-Patterns

- Inventing a parallel task-ID scheme instead of `issue-###`.
- Creating `session/task-*` branches.
- Running a full team for tiny changes.
- Letting subagents produce long raw research dumps instead of concise findings.
- Reviewing code in the same context that wrote it.
