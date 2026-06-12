# Vertical Slices

Yalla plans and builds in tracer-bullet vertical slices. A slice is a narrow, complete, independently verifiable path through every layer the behavior needs.

## Slice Rules

- Each slice delivers a demoable or testable behavior.
- Each slice has its own acceptance criteria and test seam.
- Prefer many thin slices over one broad task.
- Avoid horizontal slices like "add schema", "build UI", or "write tests" unless they are part of a complete behavior.
- Mark slices `AFK` when an agent can finish them without new human judgment. Mark `HITL` when a user decision is required.

## Plan Template

```markdown
## Vertical Slices

### Slice 1: [behavior]
Type: AFK | HITL
Blocked by: None | Slice N
User-visible outcome: [what works after this slice]
Public interface: [route, endpoint, function, CLI, tool]
Test seam: [highest correct seam]
Acceptance criteria:
- [ ] ...
Files likely affected:
- `path` - why
```

## Build Loop

For each slice:

1. Tester writes one failing behavior test for one acceptance criterion.
2. Implementer writes the smallest production change to pass it.
3. Run the targeted test.
4. Run the affected suite.
5. Update `acceptance-trace.json`.
6. Move to the next criterion or slice.

Do not implement future slices speculatively.
