# Memory Protocol (optional)

How the pipeline recalls and stores durable directives when `.claude/YALLA.md` defines a `memory:` block. Entirely optional — repos without a `memory:` block never touch any of this, and the pipeline never blocks on a memory miss.

## What memory is for

A directive store lets one run teach future runs. Phase 0b recalls relevant directives before planning; Phase 5 saves new ones after the work proves out. This is independent of `tracking_mode` — you can track tasks in GitHub Issues and still recall learnings from a project store (e.g. a Supabase `memory_knowledge` table).

## The directive test

Store **directives**, not wisdom. A directive passes this test:

> Can this sentence be pasted into Phase 0 planning and immediately change how an agent plans — with no further interpretation?

- **Good (directive):** "Verify Stripe webhook signatures before parsing the body — `stripe.webhooks.constructEvent(body, sig, secret)`. Without it, attackers forge `checkout.session.completed`. Pattern: `api/stripe-webhook.ts`."
- **Bad (wisdom — discard):** "Webhooks can be tricky; always validate them carefully."

If it needs interpretation to act on, it is wisdom. Do not store it.

## Config

```yaml
memory:
  recall_enabled: true
  save_enabled: true
  recall_tool: "mcp__supabase__execute_sql"   # the MCP tool that runs the query
  save_tool: "mcp__supabase__execute_sql"
  tags_namespace: ["yalla", "your-repo"]      # every recall filters and every save tags with these
  # recall_query / save_query: optional overrides; the reference shapes below are used when blank
```

## Phase 0b — recall (read-only)

1. Take the domains matched in Phase 0a plus the raw task keywords.
2. Run `recall_query` (reference shape in `SQL-TEMPLATES.md`) filtered by `tags_namespace` and domain/keyword, newest first, small limit.
3. Load the returned directives as hard constraints for planning — treat them like YALLA.md gotchas.
4. Record recalled titles in `.pipeline-state.json` (`recalled_directives`). Empty result → `[]` and continue. A failed/absent store is a skipped phase, never a halt.

## Phase 5 — save (dual-write)

For each learning that passes the directive test:

1. Write it to `docs/learnings/YYYY-MM-DD-[topic].md` (git history).
2. Insert it into the store via `save_tool`/`save_query`, tagging with `tags_namespace` + the matched `domain` + `"directive"`.

Routing is enforced by `memory-routing-check` in `REVIEW-CHECKS.md`: durable knowledge goes to the store + `docs/learnings/`, not ad-hoc files under `memory/`.
