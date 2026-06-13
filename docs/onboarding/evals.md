# Eval Onboarding

The eval harness checks whether Yalla's proof contract stays honest as you customize or extend the pipeline. You do not need project-specific evals for your first manual run. You should add them when a real failure mode matters enough that you never want the pipeline to miss it again.

## What Ships By Default

The Yalla repo includes:

- proof-contract fixtures,
- test-inventory fixtures,
- plan/review/coverage fixtures,
- outcome-quality fixtures,
- smoke runner that executes the suite.

Run from the Yalla repo:

```bash
npm install
npm run eval:yalla:smoke
```

## When To Add Your Own Fixture

Add a fixture when you discover one of these:

- Yalla called something `PROVEN` without enough evidence.
- A review missed a project-specific invariant.
- A plan scanned too broadly or missed the relevant subsystem.
- A model judge was used where a deterministic test seam existed.
- A recurring gotcha needs machine-checkable regression coverage.
- Autopilot would have selected a task it should have skipped.

Do not add fixtures for preferences that cannot be checked. Put those in `gotchas` or `PROJECT-CHECKS.md` instead.

## Fixture Types

Use the existing data files as shape references:

- `eval/yalla/data/proof-contract-fixtures.json` - verdict honesty and evidence completeness.
- `eval/yalla/data/test-inventory-fixtures.json` - whether risky categories map to real tests or explicit gaps.
- `eval/yalla/data/plan-review-coverage-fixtures.json` - plan/review/test coverage regressions.
- `eval/yalla/data/outcome-quality-runs.json` - completed-run scoring against issue intent, evidence, checks, and PR status.
- `eval/yalla/test-inventory.json` - inventory of tests that protect risky categories.

## Minimal Fixture Workflow

1. Identify the failure mode in one sentence.
2. Pick the smallest matching fixture file.
3. Add one negative example that should fail before the rule is applied.
4. Add or update the expected patched/pass case if the suite uses paired examples.
5. Run the targeted eval command.
6. Run `npm run eval:yalla:smoke`.

## Project-Specific Eval Checklist

- [ ] At least one fixture captures a real failure mode from your repo after the first few runs.
- [ ] Fixture names describe the failure, not the implementation.
- [ ] Fixtures contain no secrets, customer data, private URLs, or raw credentials.
- [ ] Expected verdicts use only `PROVEN`, `NOT_PROVEN`, or `INCONCLUSIVE`.
- [ ] Deterministic proof is required wherever a deterministic seam exists.
- [ ] Smoke eval passes before changing autopilot level.

## Autopilot Eval Boundary

The current autopilot code has unit tests for dry-run safety and queue report selection. Scheduled workflow behavior should be proven separately before enabling it:

- dry-run queue report generated,
- block labels skipped,
- auth failure stops before issue listing,
- artifacts uploaded on every workflow exit path,
- kill switch checked before selection and before mutation.

Use `docs/autopilot/readiness-checklist.md` for promotion evidence.
