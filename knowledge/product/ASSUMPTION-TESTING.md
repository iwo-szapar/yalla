# Assumption Testing

Use this to pressure-test a Product Intent section, PRD, roadmap, GTM bet, pricing change, or user journey change before implementation starts.

## Method

1. Extract every claim the plan depends on.
2. Keep only load-bearing claims: if false, the plan dies, narrows, or needs a different implementation.
3. Steelman each claim before attacking it. Do not attack a strawman.
4. Write the failure mode as `Fails if ...`.
5. Rank by impact if wrong, likelihood wrong, and cheapness to test.
6. For each top assumption, name the evidence to get this week, cheapest test, and kill criterion.

## Ranking Table

| Rank | Claim | Fails if | Evidence to get this week | Cheapest test | Kill criterion |
|---|---|---|---|---|---|
| 1 |  |  |  |  |  |

## Good Failure Modes

- Fails if users do not see this flow as faster than their current workaround.
- Fails if buyers abandon checkout because discount feedback is unclear.
- Fails if operators cannot distinguish recoverable delivery failures from completed deliveries.

## Bad Failure Modes

- Execution risk.
- Users might not like it.
- Performance could be an issue.

These are too vague to test or kill.

## Validation Ladder

Prefer evidence with behavior or money attached:

1. Live usage/payment/delivery data.
2. Prototype with real user action.
3. Concierge/manual test that simulates the future workflow.
4. Interview with specific past behavior.
5. Opinion survey.
6. Internal speculation.

If only weak evidence exists, say so and keep the MVP narrower.
