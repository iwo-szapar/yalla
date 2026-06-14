# Metrics Framework

Product Intent should name the metric a change is expected to move. The metric does not need to be fully measurable in a local PR, but the plan must avoid vague benefits like "better UX" without a proxy.

## Metric Selection Rules

- Choose one primary metric or proxy per Product Intent section.
- Prefer behavior over activity. "Paid checkout completed" beats "checkout page viewed".
- For activation work, use setup completion, time-to-first-value, activation rate, or successful first workflow.
- For revenue work, use checkout completion, conversion rate, retained revenue, refund/dispute rate, or access delivery success.
- For safety/security work, metric can be risk reduction: false-success states prevented, orphaned entitlements prevented, unrecoverable failures converted to recoverable states.
- For internal workflow improvements, metric can be reviewability or cycle-time proxy: fewer ambiguous plans, fewer blocking review findings, faster PR review.

## Output

```markdown
Metric moved:
- Primary metric:
- Proxy for this PR:
- Evidence source:
- Why this metric matters:
```

## Good Metric/Proxy Examples

- Time from signup to first successful project action.
- Checkout completion to accessible delivery.
- Percentage of generated artifacts with zero unresolved placeholders.
- Recovery time for stuck background jobs.
- Number of blocking review findings caused by unclear intent.
