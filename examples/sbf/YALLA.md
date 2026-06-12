# YALLA Config — Second Brain Factory (sanitized reference)

# A real production config, reformatted to match YALLA.example.md and sanitized
# for open-sourcing. Repo path, secrets, and identifiers removed. Domain
# mappings, gotchas, and stack specifics are kept on purpose — they're the point.

## Identity

# Real repo path removed — left blank so it auto-detects via `gh repo view`.
repo: ""
project_name: second-brain-factory
# Their real base branch is `staging` — work is cut from it and PRs target it.
base_branch: staging
tech_stack: "Vite + React + TypeScript + Vercel Serverless + Supabase PostgreSQL + Stripe Connect"

## Commands

commands:
  install: "npm install"
  test: "npm test"
  typecheck: "npm run typecheck"
  build: "npm run build"
  lint: "npm run lint"

## Test Layout

test_dir: tests/
test_file_glob: "**/*.test.ts"
test_setup_file: tests/setup.ts

## Task Tracking

# GitHub Issues are the canonical engineering task store. Each run is an issue-###.
# This team retired an older DB-backed task table — new runs never write to it.
tracking_mode: github
issue_id_format: "issue-###"

## Domain Mapping

# Task-description keywords → subsystem label. Focuses the codebase analyst and
# decides which risk gates are likely to trigger. These are the team's own words.
domains:
  - keywords: [stripe, checkout, webhook, coupon, connect, subscription, price, product]
    domain: stripe
  - keywords: [tenant, provisioning, supabase, byod, tenant_database, migration]
    domain: tenant-db
  - keywords: [mcp, tool, memory_store, second_brain, onboarding]
    domain: mcp
  - keywords: [auth, signup, oauth, session, jwt, login]
    domain: auth
  - keywords: [repo, generation, pipeline, phase, scaffold, template, questionnaire]
    domain: repo-generator
  - keywords: [email, resend, delivery, branding, template]
    domain: email
  - keywords: [vercel, serverless, api, function, edge]
    domain: vercel
  - keywords: [page, embed, creator page, public]
    domain: pages

## Known Gotchas

# Pre-loaded into every run as hard constraints. This is the team's scar tissue —
# the non-obvious rules a new contributor (human or agent) would trip on.

### Imports & Runtime
gotchas:
  - "Always use `.js` extensions in TypeScript ESM imports — omitting breaks the Vercel runtime silently."
  - "Never use `VITE_` env vars in `api/` server code — they're undefined at runtime and throw no error."
  - "Use `VercelRequest`/`VercelResponse`, not Web API `Request`/`Response`."

### Database
  - "Platform DB ≠ Tenant DB. Platform client: `lib/db/factory/credential-vault.ts`. Tenant client: `lib/db/factory/connection-manager.ts`. Never cross-query."
  - "Use the `accounts` table, not `creators`."
  - "Escape `\\`, `%`, `_` in ILIKE search terms: `.replace(/[\\%_]/g, '\\$&')`."
  - "Route additions to `tenant_product_routing` must happen in sync with product creation."

### Security
  - "Stripe webhooks: verify the signature with `stripe.webhooks.constructEvent()` BEFORE parsing the body."
  - "Webhook idempotency: insert `processed_webhook_events` AFTER the handler succeeds, never before."
  - "Never leak `error.message` to clients in 500 responses — use `{ error: 'Internal server error' }`."
  - "Escape all ILIKE inputs to prevent wildcard injection."

### Architecture
  - "The creator MCP endpoint is `api/mcp.ts` (root-level file), NOT `api/mcp/index.ts`."
  - "`creator_oauth_connections` holds GitHub/Supabase/Calendly tokens — check existence before use."
  - "`mcp_api_tokens` stores bcrypt-hashed tokens — never compare raw."
  - "Pipeline modes: `repo_generation_sessions.mode` is `'full'` or `'scaffold'` only."
  - "Phase 0 only lazy-seeds templates if the tenant has zero templates."
  - "No product-slug branching in webhook/job/cron handlers — drive behavior from product columns or config maps, not string-literal `slug === '...'` comparisons."

### Frontend
  - "Routes in App.tsx must come before the catch-all `*` route."
  - "Google OAuth stores `pendingPlanId` in localStorage for signup completion."
  - "All user-facing UI must be responsive and usable at 375px width."

## Risk Gates

# Subsystem review gates that run ONLY when the diff touches matching paths.
# Pass/fail criteria live in knowledge/yalla/PROJECT-CHECKS.md and the canonical
# check library in knowledge/yalla/REVIEW-CHECKS.md.
risk_gates:
  - name: payment-integrity-check
    triggers_on: [stripe]
  - name: schema-migration-check
    triggers_on: [tenant-db]
  - name: identity-routing-check
    triggers_on: [auth, mcp]
  - name: email-delivery-check
    triggers_on: [email]
  - name: generated-artifacts-check
    triggers_on: [repo-generator]
  - name: async-reliability-check
    triggers_on: [stripe, repo-generator, vercel]
  - name: ui-journey-check
    triggers_on: [pages]
  - name: doc-alignment-check
    triggers_on: [mcp, tenant-db, vercel]

## Reference — Database Tables

# Not config the pipeline acts on, but kept here because the analyst uses it to
# orient. Shows the platform-vs-tenant split this codebase lives and dies by.
platform_tables:
  - accounts, tenant_databases, mcp_api_tokens, subscriptions, plans
  - purchase_routing, customer_entitlements, customer_mcp_quotas
  - feature_flags, creator_oauth_connections, processed_webhook_events
tenant_tables:
  - tenants_products, tenants_customers, tenants_purchases
  - tenants_knowledge_items, tenants_template_bundles, tenants_template_files
  - tenants_product_items, tenants_questionnaires, tenants_questionnaire_responses

## Scope Mode Defaults

# EXPANSION = greenfield, allow new structure. HOLD = match existing patterns.
# REDUCTION = minimal surgical change.
scope_defaults:
  greenfield_feature: EXPANSION
  new_page: EXPANSION
  new_api: EXPANSION
  bug_fix: HOLD
  refactor: HOLD
  hotfix: REDUCTION
  security_patch: HOLD
  large_diff: REDUCTION       # diffs touching 15+ files default to REDUCTION
