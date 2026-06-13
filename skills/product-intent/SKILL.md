---
name: product-intent
description: >
  Product-intent gate for non-trivial product, GTM, pricing, onboarding,
  user/admin journey, access, delivery, generated artifact, or workflow changes.
  Use before /yalla planning or inside strategy-to-build handoffs when the work
  needs outcome framing, load-bearing assumptions, cheapest validation, MVP scope,
  kill criteria, or intended-vs-implemented review. Do NOT use for tiny bugfixes,
  isolated tests, dependency bumps, mechanical refactors, or docs edits that do
  not define future product behavior.
argument_hint: "[feature, GTM bet, workflow change, or product decision]"
---

# Product Intent

This skill turns product/strategy/PM knowledge into Yalla's development workflow. It does not create a generic PRD. It creates a concise Product Intent section that `/yalla`, `/yalla-plan`, `/yalla-review`, and the PR body can all use.

## Read First

- `${CLAUDE_PLUGIN_ROOT}/knowledge/product/PRODUCT-INTENT-FRAMEWORK.md`
- `${CLAUDE_PLUGIN_ROOT}/knowledge/product/ASSUMPTION-TESTING.md`
- `${CLAUDE_PLUGIN_ROOT}/knowledge/product/INTENDED-VS-IMPLEMENTED.md`
- `${CLAUDE_PLUGIN_ROOT}/knowledge/product/METRICS-FRAMEWORK.md`
- `${CLAUDE_PLUGIN_ROOT}/knowledge/product/GTM-DISCOVERY.md` when the change is GTM-facing
- `${CLAUDE_PLUGIN_ROOT}/knowledge/product/SHIPPING-ARTIFACTS.md` before deciding where durable docs belong

## Trigger Decision

Start by deciding whether Product Intent applies.

Return `N/A` only with a specific reason, for example:

- `tiny-hotfix preserving existing behavior`
- `test-only coverage for unchanged behavior`
- `mechanical dependency/config update`
- `copy edit that does not change positioning, promise, or flow`

If the work changes money, access, data boundaries, delivery, onboarding, public product pages, GTM, pricing, or the Yalla workflow itself, Product Intent applies.

## Output

Produce this block for the caller to paste into the plan:

```markdown
## Product Intent
- Applies: true|false
- Trigger: [why it applies, or N/A reason]
- Target actor:
- Desired outcome:
- Metric moved:
- Opportunity/problem:
- Current evidence:
- MVP scope:
- Non-goals:

### Load-Bearing Assumptions
1. **Claim:**
   - Fails if:
   - Evidence to get this week:
   - Cheapest test:
   - Kill criterion:

### Intended Behavior
- [Behavior/promise/boundary the implementation must preserve]

### Review Implication
- intended-vs-implemented-check: applies|N/A and why
- Durable docs/artifacts to update:
```

For GTM-facing work, also include:

```markdown
## GTM Intent
- Beachhead segment:
- Buying trigger:
- Current alternative:
- Differentiation claim:
- Proof point:
- Distribution path:
- Objection to handle:
- Success signal:
```

## Rules

- Keep it concise. Product Intent is a gate, not a strategy memo.
- Name assumptions as falsifiable claims.
- Prefer cheapest behavior evidence over opinion evidence.
- Do not let Product Intent expand scope. It should usually narrow the MVP.
- If the product bet is too weak, recommend a smaller validation slice before engineering.
- If the task is a pure bugfix, preserve the existing success invariant and skip Product Intent with a reason.
