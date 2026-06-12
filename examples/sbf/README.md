# Example: Second Brain Factory

This is a sanitized, real production configuration from **Second Brain Factory** — a Vite + React + TypeScript + Vercel Serverless + Supabase Postgres + Stripe Connect SaaS that has run thousands of tasks through Yalla.

It exists as a **reference**, not a starting template. Don't copy it into your repo and edit — most of it is specific to that exact stack and won't apply to yours. Instead, read it to see what a mature config looks like once a team has fed it months of real lessons:

- [`YALLA.md`](YALLA.md) — the config seam, fully populated: domain mapping in the team's own vocabulary, two dozen earned gotchas, the platform-vs-tenant database tables, and risk-tuned scope defaults.
- [`PROJECT-CHECKS.md`](PROJECT-CHECKS.md) — the project's check definitions: a universal baseline that runs on every diff, plus risk-triggered checklists (Stripe, tenant/migration, identity, email, generated artifacts, UI journeys) and a doc-alignment gate that keeps internal docs honest when MCP tools, migrations, or routes change.

The matching **real proof fixtures live in `eval/yalla/data/*.json`** at the repo root — they're drawn from this same project's incidents and PRDs (the Zod/interface review gap, the checkout surface-parity miss, the deterministic-seam-vs-model-judge rule) and form the worked dataset the eval harness grades the proof contract against. The config here and those fixtures are two halves of one worked example: the config shows what to enforce, the fixtures show what happens when the pipeline fails to.

What to take from it is the **shape**: how gotchas are phrased as enforceable constraints, how risk gates stay dormant until their subsystem is touched, how every review item is a single binary question you can verify against the diff, and how a real failure becomes a permanent eval fixture. Fill that shape with your own project's scar tissue, not theirs.

For how to build your own from scratch, see [`../../CUSTOMIZING.md`](../../CUSTOMIZING.md).
