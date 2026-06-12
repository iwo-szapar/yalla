# Agent Brief

After plan approval, update the unit of work with a durable Agent Brief. In `github` mode this is the GitHub issue body; in file-only mode it's the plan file. The brief is the contract for future AFK work, not a transcript.

## Principles

- Behavioral, not procedural.
- Durable over file-path precision.
- Acceptance criteria must be independently verifiable.
- Scope boundaries must be explicit.
- Prefer interface names, routes, tool names, and type names over line numbers.
- Include risk tier and evidence mode so future agents know how heavy the run should be.

## Template

```markdown
## Agent Brief

**Category:** bug | enhancement | refactor | architecture | docs | hotfix
**Summary:** one-line outcome

**Current behavior:**
[What happens now. For bugs, include repro loop.]

**Desired behavior:**
[What should happen after this work. Include edge/error cases.]

**Task classification:**
- Type: [task_type]
- Scope mode: [EXPANSION|HOLD|REDUCTION]
- Required gates: [diagnosis, architecture-depth, vertical_slices, test_seams, review]
- Phase split required: [true|false and why]
- Risk tier: [low|medium|high]
- Evidence mode: [minimal|standard|strict]

**Key interfaces:**
- `[interface]` - what changes and what invariants matter

**Architecture alignment:**
- Source docs: [`docs/architecture/...` or `N/A` with reason]
- Alignment verdict: [aligned | docs-drift | code-drift | intentional-change-updates-docs]
- Docs to update: [paths or `none`]
- Proof required: [tests/artifacts/PR evidence that must show code and docs agree]

**Vertical slices:**
1. [Slice title] - [AFK/HITL] - [test seam] - [user-visible outcome]

**Acceptance criteria:**
- [ ] Specific, testable criterion

**Test seams:**
- [criterion] -> [highest correct seam]

**Out of scope:**
- [Thing that should not be changed]

**Risks and decisions:**
- [Risk] -> [mitigation or accepted by user]

**Reviewer entry points:**
- [Files/flows humans should inspect closely]
```
