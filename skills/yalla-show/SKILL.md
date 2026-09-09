---
name: yalla-show
description: "Explain a Yalla plan, scope, diff, workflow, or proof state with a compact visual. Use when the user asks to show, map, diagram, visualize, or approve a Yalla change; never use it as proof."
argument_hint: "[plan, scope, diff, workflow, decision, or issue-### to explain]"
---

# /yalla-show

Make a Yalla run, plan, change, or proof state easy to understand without making
the reader reconstruct it from code or raw artifacts. Lead with the visual and
add only the short prose needed to explain it.

This is decision support, not an implementation or verification step. It never
replaces the Proof Contract, acceptance-trace evidence, a browser check, or the
final `PROVEN` / `NOT_PROVEN` / `INCONCLUSIVE` verdict.

## Read first

- `${CLAUDE_PLUGIN_ROOT}/knowledge/yalla/VISUAL-EXPLAINABILITY.md`
- The smallest relevant source: the approved plan, current diff, `.pipeline/report.html`,
  or proof artifact named by the user.

If the input is unclear, ask one focused question: whether the reader needs to
understand the intended scope, intended approach, exact change, runtime
behavior, or remaining proof gap. Do not inspect or diagram unrelated code.

## Choose one smallest view

Use the view that makes the current decision clear. Combine views only when each
answers a different question.

| Reader needs to see | Preferred view |
| --- | --- |
| Branching or state logic | Pseudocode / state sketch |
| Which functions call which | Indented call tree |
| Components, modules, or files and their responsibilities | Shallow tree |
| Exact proposed or completed change | Focused `diff` sketch |
| Multiple actors, async handoffs, or data movement | Mermaid flow / sequence |
| Whether to accept a non-trivial plan | Scope Walkthrough |
| Competing product, UI, or architecture choices | Focused HTML decision aid |

Only include the actors, paths, states, props, or files that affect the question.
Use real names from the codebase. Label inferred links as **inference**; never
invent a data flow or claim evidence exists when it has not been captured.

## Output contract

Return, in this order:

1. The smallest useful visual, next to the claim it explains.
2. A brief `What this means` sentence in plain language.
3. `Proof status`: link the visible behavior to its actual evidence, or say
   `not proven yet` and name the missing check.
4. `Decision needed` only when a human choice genuinely blocks progress.

For a dense UI comparison, state model, or option decision that cannot be made
clear with Mermaid, create one responsive HTML artifact. During a tracked run,
write it as `plans/active/issue-###-visual.html`; otherwise create no file unless
the user explicitly asks for one. The artifact must use real labels and data,
name the recommendation and tradeoffs, and work at 375px wide. Open it after
creation when the host supports local files.

## Scope Walkthrough

When the reader is deciding whether to accept a plan's scope, read
`${CLAUDE_PLUGIN_ROOT}/knowledge/yalla/SCOPE-WALKTHROUGH.md` and the plan draft
before creating the visual. Create `.pipeline/scope-walkthrough.json`, validate
its source contract, then render the required walkthrough at
`plans/active/issue-###-scope-walkthrough.html`.

The walkthrough is an animated, interactive plan map: it shows the proposed
path against unchanged dependencies and explicit non-goals, then steps through
each vertical slice. Every step names the promise, interface, planned proof,
and any open risk. It must retain a visible `planned, not proven` state until
implementation evidence exists. Render the whole map and a focused slice view;
do not turn a complex scope into a decorative generic architecture diagram.

Return the `READY_FOR_SCOPE_APPROVAL` or `REVISION_REQUIRED` verdict with the
visual. A missing acceptance mapping, proof plan, boundary, or unresolved edge
is `REVISION_REQUIRED`, not an opportunity to make an attractive incomplete
diagram.

## Boundaries

- Use this during `/yalla` planning before scope approval when the
  `scope_walkthrough_gate` is required, when a choice is ambiguous, during
  review when the diff crosses several boundaries, or standalone when the user
  asks for an explanation.
- Keep routine tiny fixes text-only unless a visual removes a real ambiguity.
- Never turn a diagram into a generic architecture document or add it to a PR
  merely for decoration.
- Do not use a visual as test evidence. Screenshots, traces, and accessibility
  snapshots remain evidence only when they are captured by the relevant verifier.
- If a diagram conflicts with code, the code and recorded evidence win; correct
  the diagram and mark the prior version stale.
