# Task System Setup

Yalla works best when GitHub Issues are the canonical task store. File-only mode is supported, but issue-backed tasks are easier to resume, review, and automate.

## Required Labels

Create these labels before using queue dry-run or scheduled autopilot:

- `yalla-ready` - issue is eligible for report-only queue selection.
- `blocked` - issue cannot be selected.
- `needs-human` - issue needs clarification or a decision.
- `do-not-autopilot` - issue must never be selected by automation.

Recommended priority labels:

- `p0` - urgent or highest priority.
- `p1` - important.
- `p2` - normal planned work.

Optional risk labels:

- `risk:low`
- `risk:medium`
- `risk:high`

Optional type labels:

- `type:bug`
- `type:feature`
- `type:docs`
- `type:refactor`
- `type:hotfix`

## Create Labels With `gh`

Run from the target repo:

```bash
gh label create yalla-ready --color 0E8A16 --description "Ready for Yalla automation"
gh label create blocked --color B60205 --description "Blocked from execution"
gh label create needs-human --color D93F0B --description "Needs human clarification"
gh label create do-not-autopilot --color 5319E7 --description "Never select for autopilot"
gh label create p0 --color B60205 --description "Highest priority"
gh label create p1 --color D93F0B --description "High priority"
gh label create p2 --color FBCA04 --description "Normal priority"
```

If your repo already has labels, map them in `.claude/YALLA.md` instead of duplicating names.

## Issue Template

Use enough structure that Yalla can write acceptance criteria without inventing context:

```markdown
## Intent
What should be true for the user/operator after this ships?

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
```

A copyable template lives at `docs/onboarding/templates/yalla-task.md`. Copy it into your target repo as `.github/ISSUE_TEMPLATE/yalla-task.md` if you want GitHub's issue-template UI to enforce the shape.

## Queue Dry-Run

After labels exist:

```bash
npm run yalla:autopilot -- queue --mode dry-run
```

The command:

- lists open issues labeled `yalla-ready`,
- skips issues with block labels,
- scores priority labels,
- writes `.pipeline/autopilot-queue-report.json`,
- does not mutate GitHub.

## Eligibility Rules

An issue is eligible only when:

- it is open,
- it has the configured eligibility label,
- it has no configured block label,
- it has enough context for acceptance criteria,
- it is not already linked to an active branch or PR,
- its risk is allowed by the current autopilot level.

Queue ranking must never override eligibility. A `p0` issue with `blocked` stays blocked.

## File-Only Mode

Use `tracking_mode: file-only` when:

- the repo is not on GitHub,
- `gh` is unavailable,
- you are experimenting locally,
- the task should not create issues or PRs.

State lives in `.pipeline-state.json` and `plans/`. File-only mode is fine for manual runs; it is not recommended for scheduled autopilot because queue selection and team visibility are weaker.
