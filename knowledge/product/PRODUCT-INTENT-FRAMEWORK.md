# Product Intent Framework

Use this before implementation when a change affects product behavior, user/admin/operator journeys, GTM surfaces, pricing, access, delivery, onboarding, generated artifacts, or workflow decisions that determine what gets built. Do not use it for tiny hotfixes, isolated test fixes, dependency bumps, mechanical refactors, or docs edits that do not define future product behavior.

Product Intent is the durable answer to: what are we trying to make true for whom, why is it worth doing now, what must be true for the bet to work, and what would make us stop or change course?

## Trigger

Product Intent applies when any of these are true:

- The task changes a user, admin, buyer, customer, operator, or reviewer journey.
- The task changes money, access, entitlements, invitations, delivery, onboarding, auth, integration access, or data boundaries.
- The task changes a public route, public product page, checkout or purchase surface, dashboard, email, or generated artifact.
- The task is a product/GTM/pricing/positioning decision whose success depends on user behavior.
- The task changes `/yalla`, `/yalla-plan`, `/yalla-review`, or another workflow that decides what gets built.

Mark Product Intent `N/A` when the work is a tiny bugfix, test-only update, dependency bump, formatting cleanup, or internal refactor with no user-visible behavior and no future decision logic. The N/A reason must be specific.

## Required Fields

- **Target actor:** user, buyer, customer, admin, operator, agent, or reviewer.
- **Desired outcome:** what should become easier, safer, faster, or more likely.
- **Metric moved:** business/customer/product metric this should affect. Use a proxy when the direct metric is not measurable locally.
- **Opportunity/problem:** customer pain, workflow bottleneck, strategic constraint, or risk being addressed.
- **Current evidence:** data, incident, user report, support signal, sales signal, or explicit lack of evidence.
- **Load-bearing assumptions:** claims that would kill or materially change the plan if false.
- **Cheapest validation:** the smallest test, query, prototype, interview, or shipped slice that changes confidence.
- **Kill criterion:** threshold that says stop, narrow, or pivot.
- **MVP scope:** smallest user-testable implementation that validates the risky assumption without violating the success invariant.
- **Non-goals:** boundaries that prevent scope creep.

## Output Template

```markdown
## Product Intent
- Applies: true|false
- Trigger: [why it applies, or N/A reason]
- Target actor:
- Desired outcome:
- Metric moved:
- Opportunity/problem:
- Current evidence:
- Non-goals:
- MVP scope:

### Load-Bearing Assumptions
1. [Assumption]
   - Fails if:
   - Evidence to get this week:
   - Cheapest test:
   - Kill criterion:

### Intended Behavior
- [Rule, promise, or boundary the implementation must preserve]
```

## Examples

- Checkout change: Product Intent applies because money and user access are touched.
- Onboarding change: Product Intent applies because user activation and setup completion are touched.
- Public page copy tweak: Product Intent may apply if it changes positioning or buyer decision flow; N/A if it is only grammar.
- TypeScript import fix: Product Intent N/A because it preserves existing behavior.

## Relationship To Other Gates

- Architecture-doc gate asks: do docs and code agree about system behavior?
- Success-invariant gate asks: can the workflow report success too early?
- Product Intent asks: what product/business/user promise are we trying to make true?
- Intended-vs-implemented asks: did the implementation enforce that promise on the real code paths, especially across money, access, data, privacy, delivery, or trust boundaries?
