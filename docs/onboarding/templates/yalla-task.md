---
name: Yalla Task
about: A well-scoped task for a Yalla run
title: ""
labels: "yalla-ready,p2"
assignees: ""
---

## Intent

What should be true for the user, operator, developer, or system after this ships?

## Acceptance Criteria

- [ ] Concrete observable behavior
- [ ] Negative or false-success path, if relevant
- [ ] Docs/config updates, if relevant

## Context

Relevant files, screenshots, logs, PRs, incidents, or decisions.

## Constraints

Known non-negotiables, risky areas, or things not to change.

## Verification

Commands or manual checks a human would run.

## Autopilot Notes

- Leave `yalla-ready` only if this issue is eligible for queue dry-run selection.
- Add `blocked`, `needs-human`, or `do-not-autopilot` if automation should skip it.
- Use `risk:high` for payments, auth, migrations, security, broad refactors, or irreversible side effects.
