# Scope Walkthrough

Use this before an operator accepts a non-trivial Yalla plan. It turns the
planned change into a visual, reviewable contract: what will change, what it
depends on, what is deliberately excluded, and how each promise will later be
proved.

It is decision support, not implementation evidence. Every claim must be
labelled `planned` until the relevant acceptance-trace evidence exists.

## Trigger

Set `scope_walkthrough_gate` during classification:

- `required` for medium/high-risk work, phase-split work, plans with more than
  one vertical slice, or a user/data/system boundary crossing.
- `optional` for a single low-risk slice when a visual would remove a concrete
  ambiguity.
- `n/a` only for tiny-hotfixes or a docs-only change with a specific reason.

The gate is about approving scope, not explaining a completed diff. Do not
silently downgrade a `required` gate after planning.

## Source Contract

Before rendering, create `.pipeline/scope-walkthrough.json` from the current
plan draft. It is local planning state unless it explains an accepted risk or
non-obvious decision a reviewer needs later.

```json
{
  "issue_id": "issue-###",
  "plan_path": "plans/active/issue-###-slug.md",
  "state": "ready_for_scope_approval|revision_required|approved",
  "promise": "One user-visible outcome",
  "scope": {
    "proposed": ["named behavior or interface"],
    "existing_dependencies": ["named system or interface"],
    "out_of_scope": ["explicit non-goal"]
  },
  "slices": [
    {
      "id": "slice-1",
      "title": "Demoable behavior",
      "outcome": "What becomes true",
      "interface": "route, tool, endpoint, or function",
      "acceptance_criteria": ["testable criterion"],
      "proof_plan": "highest correct seam",
      "status": "planned"
    }
  ],
  "dependencies": [
    {"from": "slice-1", "to": "existing-system", "reason": "why this handoff exists"}
  ],
  "risks_or_open_questions": ["specific unresolved choice or risk"],
  "validation": {
    "all_criteria_mapped": true,
    "all_interfaces_have_proof_plan": true,
    "all_dependencies_resolved_or_labelled": true,
    "scope_boundaries_visible": true,
    "proof_status_truthful": true
  }
}
```

`revision_required` is mandatory if any validation field is false, a promised
behavior has no slice, an acceptance criterion has no proof plan, an edge has
no named reason, or a required non-goal is absent. Do not offer approval in
that state.

## Visual Contract

For `required`, render a responsive HTML walkthrough at
`plans/active/issue-###-scope-walkthrough.html`. It must work at 375px wide and
provide:

1. A top-level scope map in meaningful lanes (for example: user, application,
   data, external system). Lanes are a reader mental model, never a folder tree.
2. Clear states: proposed change, existing dependency, out of scope, and open
   risk/question. Do not use red to imply failure unless it is actually a
   blocked path.
3. A step-through control that focuses one vertical slice at a time and says,
   in one plain-English sentence, what becomes true and what proves it later.
4. Drill-downs for a slice when it crosses several systems. Each node names the
   real interface, file, or artifact when known; uncertain links say
   `inference`.
5. A persistent planned-versus-proven legend. Before implementation every
   slice and proof item must be `planned`, never `PROVEN` or visually presented
   as a test result.
6. Explicit non-goals and unanswered questions beside the proposed path, so
   omission cannot look like approval.

Use motion to make a single path easier to follow: respect reduced-motion
preferences, provide pause/restart controls, and never make animation the only
way to understand the scope. Use real plan labels; do not invent a workflow to
make the visual more attractive.

For `optional`, a Mermaid flow or focused static sketch is enough when it
answers the same questions clearly. Do not create any visual for `n/a` work.

## Approval Gate

Show the visual before the approval question, then state:

- **Scope verdict:** `READY_FOR_SCOPE_APPROVAL` or `REVISION_REQUIRED`.
- **Promise:** the user-visible outcome being approved.
- **Changed path:** the slices and dependencies that will be built.
- **Boundary:** the explicit non-goals.
- **Proof plan:** where each promised behavior will be tested or otherwise
  evidenced later.
- **Open choice:** only a genuinely unresolved risk or decision.

Available decisions are `Approve scope`, `Revise scope`, `Show a slice`, and
`Cancel`. `Approve scope` records the decision in the source artifact and
allows the normal plan-approval flow to continue. It never makes the eventual
work `PROVEN`.

## Non-goals

- This is not a PR diff diagram; use `/yalla-show` on a completed change when
  the reviewer needs that.
- This is not a new implementation renderer, external service, or dependency.
- This does not replace the Proof Contract, acceptance trace, test evidence,
  or a human decision.
