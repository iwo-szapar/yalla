# PRD: Long-Running Control System Additions

## Context

Yalla already has proof artifacts, checkpoints, reports, model-routing hints, and memory hooks. The next step is to make long-running autonomy explicit: a run should start from a goal contract, know its verifier set, iterate through a loop budget, separate executor output from evaluator verdicts, render visual evidence, and mine prior sessions for durable rule candidates.

## Goals

- Add a first-class goal contract artifact that defines success before work starts.
- Add a loop runner skeleton that advances only through explicit verifier/evaluator status.
- Add a verifier registry that maps task types to deterministic and judgment-heavy verifiers.
- Add evaluator artifacts that are separate from executor artifacts.
- Add session-mining output that turns repeated run failures into suggested gotchas/risk gates/evals.
- Add visual evidence slots to the HTML report.
- Add budget awareness to status/report/loop decisions.

## Non-Goals

- Do not build a cloud scheduler or server.
- Do not execute arbitrary agent loops autonomously from Node.
- Do not auto-reset Git state in rewind/loop commands.
- Do not require screenshots or benchmarks for every run.

## User Stories

- As an engineer, I can write a goal contract before the run so success criteria and constraints are inspectable.
- As an operator, I can run a loop check and see whether Yalla should continue, stop proven, stop inconclusive, or stop on budget.
- As a reviewer, I can inspect evaluator verdicts separately from implementation prose.
- As a maintainer, I can mine `.pipeline/events.jsonl` and artifacts for recurring failure patterns.
- As a human supervisor, I can open `report.html` and see screenshots, benchmark data, and budget state without reading raw logs.

## Requirements

1. `npm run yalla:run -- goal ...` writes `.pipeline/goal-contract.json` with desired end state, success criteria, constraints, budget, forbidden shortcuts, and required evidence.
2. `npm run yalla:run -- loop` reads goal/status/evaluator state and writes `.pipeline/loop-state.json` with the next non-destructive instruction.
3. `knowledge/yalla/VERIFIERS.md` documents verifier selection and config keys.
4. `YALLA.example.md` supports `verifiers:` and budget fields under `autopilot:`.
5. `npm run yalla:run -- evaluate ...` writes `.pipeline/evaluator-results.json` with evaluator role, verdict, findings, and next instruction.
6. `npm run yalla:run -- mine-sessions` writes `.pipeline/session-mining-report.json` with repeated events, failed commands, blocker patterns, and suggested durable rule updates.
7. `report.html` renders visual evidence files from `.pipeline/visual-evidence/`, benchmark JSON from `.pipeline/benchmarks.json`, evaluator results, goal contract, and budget telemetry.

## Acceptance Criteria

- Typecheck and tests pass.
- Existing `yalla:run` commands remain backwards-compatible.
- New commands are local and non-mutating outside `.pipeline/*`.
- Missing optional artifacts produce warnings/empty sections, not crashes.
- New-user `YALLA.example.md` passes onboarding validation.
- Session mining and loop decisions are deterministic from local artifacts.
