# YALLA Config

# Copy this file to `.claude/YALLA.md` in your repo and fill it in.
# The yalla pipeline reads this in Phase 0. It is the single place you adapt
# the pipeline to your project — repo identity, commands, conventions, gotchas.
# Human-maintainable. No code changes needed to onboard a new project.

## Identity

# Leave repo blank to auto-detect with `gh repo view --json nameWithOwner`.
repo: ""                        # e.g. "your-org/your-repo" (optional; auto-detected)
project_name: my-project
base_branch: main               # branch new work is cut from and PRs target
tech_stack: "<describe your stack — e.g. Node + TypeScript + Postgres>"

## Commands

# The pipeline runs these at the test/build gates. Use whatever your project uses.
# Set to "" to skip a gate (e.g. no typecheck in a Python project).
commands:
  install: "npm install"
  test: "npm test"
  typecheck: "npm run typecheck"
  build: "npm run build"
  lint: "npm run lint"

## Test Layout

# Where tests live and how they're named — the tester agent matches these.
test_dir: tests/
test_file_glob: "**/*.test.*"
test_setup_file: tests/setup.ts   # shared setup, or "" if none

## Task Tracking

# "github" (default, recommended): GitHub Issues are the canonical task store.
# "file-only": no external store; state lives in .pipeline-state.json + plans/.
# "db": advanced — a SQL task table (see knowledge/yalla/SQL-TEMPLATES.md).
tracking_mode: github
issue_id_format: "issue-###"      # how the pipeline refers to a unit of work

## Domain Mapping (optional)

# Map task-description keywords → a subsystem label. Used to focus the
# codebase-analyst and to decide which risk gates are likely to trigger.
# Delete this section if you don't want keyword routing.
domains:
  - keywords: [auth, login, oauth, session, token, signup]
    domain: auth
  - keywords: [payment, checkout, billing, invoice, subscription]
    domain: payments
  - keywords: [migration, schema, database, table, column]
    domain: data
  - keywords: [api, endpoint, route, handler]
    domain: api
  - keywords: [ui, page, component, form, screen]
    domain: frontend
  - keywords: [job, queue, cron, webhook, worker]
    domain: async

## Known Gotchas (optional)

# Pre-loaded into every run as hard constraints. This is where a project's
# scar tissue lives — the non-obvious rules a new contributor would trip on.
# Replace these examples with your own. Keep them specific and actionable.
gotchas:
  - "Example: imports in `src/server/` must use the `.js` extension or the runtime fails silently."
  - "Example: never log request bodies — they can contain PII."
  - "Example: all user-facing UI must be responsive and usable at 375px width."

## Risk Gates (optional)

# Subsystem review gates that run ONLY when the diff touches matching paths.
# Full catalog + pass/fail criteria live in knowledge/yalla/REVIEW-CHECKS.md.
# List the ones relevant to your project; the rest stay dormant.
risk_gates:
  - name: payment-integrity-check
    triggers_on: [payments, billing, checkout]
  - name: async-reliability-check
    triggers_on: [async, jobs, webhooks]
  - name: schema-migration-check
    triggers_on: [data, migration]
  - name: identity-routing-check
    triggers_on: [auth]
  - name: ui-journey-check
    triggers_on: [frontend]
  - name: doc-alignment-check
    triggers_on: [api, public-docs]

## Scope Mode Defaults (optional)

# How aggressively to scope each kind of work. EXPANSION = greenfield, allow new
# structure. HOLD = match existing patterns. REDUCTION = minimal surgical change.
scope_defaults:
  greenfield_feature: EXPANSION
  new_page: EXPANSION
  new_api: EXPANSION
  bug_fix: HOLD
  refactor: HOLD
  hotfix: REDUCTION
  security_patch: HOLD
  large_diff: REDUCTION       # diffs touching many files default to REDUCTION
