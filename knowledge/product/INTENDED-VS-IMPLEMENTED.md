# Intended vs Implemented

This is the review method for finding gaps between what the plan/docs say should happen and what the code actually enforces. It catches the class of bug that pure static review misses: documented permission not enforced, success state written too early, public-only data leaking private fields, or product behavior that contradicts the intended user promise.

## When To Run

Run `intended-vs-implemented-check` when Product Intent applies and the diff touches any boundary where mismatch matters:

- Money: checkout, billing, coupons, discounts, fees, refunds, invoices, entitlements.
- Access: auth, invites, tokens, OAuth, API/tool access, user/admin routing.
- Data: data boundaries, row-level permissions, generated content, private/customer data.
- Delivery: artifact generation, email with links/tokens, provisioning, jobs, queues.
- Trust/public surface: public product pages, application/approval scoring, dashboards, admin approvals.
- Automation: agents, tool-calling, webhooks, cron, background jobs.

For docs-only or process-only changes, run it against the workflow intent: do the instructions cause future agents to apply the gate at the right time and skip it at the right time?

## Review Steps

1. Establish intended behavior from the issue, Product Intent section, architecture docs, PRD, or template.
2. Gather implementation evidence from changed code, tests, generated artifacts, or workflow instructions.
3. Compare one boundary at a time. Verify server-side enforcement, not comments or UI-only hints.
4. Keep only mismatches that cross money, access, data, privacy, delivery, trust, or product-promise boundaries.
5. Report every finding with both sides cited.

## Finding Format

```markdown
FAIL - intended-vs-implemented-check

### [Issue title]
- **Documented intent:** [quote or path]
- **Implemented reality:** [file:line and exact code/instruction]
- **Actor/Victim:** [who can cross what boundary]
- **Issue:** [why the mismatch matters]
- **Fix:** [specific change]
```

If you cannot cite both the intent and implementation evidence, record an open question rather than inventing a finding.

## Pass Criteria

- Every intended behavior that crosses a sensitive boundary has implementation evidence.
- Any missing evidence is documented as accepted risk or blocker.
- No implemented behavior contradicts the Product Intent, success invariant, or architecture-doc claims.
- Docs updated when the intended behavior intentionally changed.

## Common Mismatches

- Plan promises paid access after checkout, but webhook can mark processed before entitlement creation succeeds.
- Docs say a discount has one canonical resolver, but a second path computes the price differently.
- Product intent says an operation is admin-approved, but code auto-issues access from a score or flag.
- Flow says token is bound to email, but handler accepts token and arbitrary email separately.
- Generated artifact delivery claims no placeholders, but tests only check that generation returned success.
