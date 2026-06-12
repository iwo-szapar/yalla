# Test Seams

Tests should verify behavior through public interfaces. The interface is the test surface.

## Correct Seam Hierarchy

Choose the highest seam that exercises the real behavior:

1. User flow / browser flow when UI behavior matters.
2. API endpoint when the contract is HTTP.
3. Tool/command when the behavior is exposed through an agent/CLI tool surface.
4. Public library function when callers use it directly.
5. Internal helper only when the helper is itself the durable public interface inside the repo.

## Good Tests

- Assert observable behavior, not call order.
- Use public interfaces only.
- Mock only system boundaries: third-party APIs, email/SMS providers, version-control hosts, time, randomness, filesystem when needed.
- Use local substitutes where available instead of mocks.
- Survive refactors that preserve behavior.

## Bad Tests

- Mock internal modules you control.
- Assert private function calls or implementation ordering.
- Query the database directly when a public getter exists.
- Test only that code compiles or a component renders without asserting behavior.

## TEST_SEAM_BLOCKED

If no correct seam exists, do not fake confidence with a shallow test. Report:

```text
TEST_SEAM_BLOCKED
Behavior: [what needs testing]
Why no correct seam exists: [specific reason]
Risk if shipped: [failure mode]
Architecture finding: [seam/deepening needed]
```

The lead must either add a seam, adjust the plan, or ask the user to accept the risk before shipping.
