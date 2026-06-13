---
name: onboard
description: >
  Guided Yalla project onboarding. Use this skill whenever the user says /onboard,
  "set up yalla", "onboard this repo to yalla", "configure yalla", "show onboarding
  status", "what is missing for yalla", or wants a visual dashboard of Yalla setup.
  It checks .claude/YALLA.md, project commands, task labels, issue template, autopilot
  readiness, and generates an HTML dashboard showing done vs missing steps.
argument_hint: "[optional path to repo or config]"
---

# /onboard

Guide a repository through Yalla setup and produce a visual onboarding dashboard. The goal is to make the next action obvious: what is already configured, what is missing, and what should not be automated yet.

## Input

`$ARGUMENTS` may be empty, a repo path, or a config path.

If empty, use the current working directory as the target repo.

If it points to `.claude/YALLA.md`, use that file and infer the project root from it.

If it points to a directory, use `<directory>/.claude/YALLA.md`.

## Workflow

1. Resolve the target repo and config path.
2. If `.claude/YALLA.md` is missing, explain that Yalla must be installed first and offer the exact `install.sh` command if this is a cloned Yalla repo.
3. Run the onboarding dashboard command when available:
   ```bash
   npm run yalla:onboard -- dashboard --config <path-to-target>/.claude/YALLA.md
   ```
4. If the command is unavailable because this is a plugin-only install, perform the same checks manually and write `.pipeline/yalla-onboarding-dashboard.html` yourself using the dashboard structure below.
5. Report the dashboard path and the top 3 remaining actions.

## Checks

Evaluate these items:

- Config exists: `.claude/YALLA.md`.
- `base_branch` is set.
- `tracking_mode` is set or defaults clearly to `github`.
- Commands are configured or intentionally skipped: `test`, `typecheck`, `build`, `lint`.
- `test_dir` exists.
- `task_system.ready_label`, block labels, and priority labels are configured for GitHub mode.
- Issue template target is known.
- Autopilot is disabled or stays at L0 unless readiness has been explicitly completed.
- Queue dry-run is available before scheduled automation.

For GitHub mode, also check:

- `gh auth status`.
- Required labels exist, or list exact `gh label create ...` commands.

For file-only mode:

- Skip GitHub label checks and say they are skipped because tracking is file-only.

## Dashboard Structure

The dashboard should be a single HTML file at `.pipeline/yalla-onboarding-dashboard.html` with:

- Project name, root path, config path, tracking mode.
- Readiness score.
- Count of done, warnings, and missing items.
- Checklist table with item, status, detail.
- Missing label commands.
- Issue template target and apply command.
- Next best step.

Use a bold, high-contrast layout. Keep it self-contained: no external CSS, JS, or network resources.

## Output

Return concise text:

```markdown
Yalla onboarding dashboard generated:
<path>

Top remaining actions:
1. ...
2. ...
3. ...
```

If there are no blocking items, say:

```markdown
Manual /yalla onboarding is ready. Keep autopilot in dry-run/report-only until the readiness checklist passes.
```

## Safety

- Do not create labels unless the user explicitly asks or passes `--apply`.
- Do not enable autopilot automatically.
- Do not auto-merge anything.
- Do not overwrite an existing `.claude/YALLA.md`.
- Prefer dry-run commands first; make all mutations explicit.
