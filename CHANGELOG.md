# Changelog

## 1.2.0

- Add an optional, config-gated **memory** subsystem: a Phase 0b pre-flight recall and a Phase 5 compound memory-save step in `/yalla`, activated only by a `memory:` block in `.claude/YALLA.md` (off by default; independent of `tracking_mode`).
- Add `knowledge/yalla/MEMORY-PROTOCOL.md` — the directive test and recall/save protocol (15-file knowledge base).
- Add optional `memory_knowledge` / `memory_decisions` schema to `knowledge/yalla/SQL-TEMPLATES.md`.
- Add `memory-routing-check` to `knowledge/yalla/REVIEW-CHECKS.md` (dormant unless a memory store is configured).
- Document the `memory:` config block in `YALLA.example.md`.

## 1.1.0

- Add `/onboard` guided setup skill.
- Add `npm run yalla:onboard -- init|dashboard` for one-command readiness checks.
- Generate `.pipeline/yalla-onboarding-dashboard.html` with required-before-first-run and required-before-autopilot sections.
- Add config-backed queue dry-run and onboarding root inference fixes.
