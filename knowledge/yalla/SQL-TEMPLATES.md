# Yalla SQL Templates (Optional — DB Mode)

> **OPTIONAL.** This file applies only if `tracking_mode: db` in `.claude/YALLA.md`. GitHub-Issues mode (the default) and file-only mode need no database. Use DB mode only if you want a SQL-backed task store with cross-session querying and dashboard metrics.

`/yalla` uses GitHub Issues as the canonical task store by default. The templates below are for the optional DB-mode backend.

**When inlining markdown into SQL strings, escape any `'` with `''`.**

## Generic `tasks` schema

DB mode assumes a single `tasks` table. Adapt names/types to your database.

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id               TEXT PRIMARY KEY,   -- 'issue-123'
  title            TEXT NOT NULL,
  description      TEXT,
  description_full TEXT,               -- human-readable session journal (Context Log)
  status           TEXT NOT NULL DEFAULT 'in_progress',
  priority         TEXT DEFAULT 'p2',
  plan_file        TEXT,
  branch_name      TEXT,
  github_issue     TEXT,
  progress         INT DEFAULT 0,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ
);
```

## Core operations

```sql
-- Lookup
SELECT id, title, description, description_full, status, plan_file, branch_name
FROM tasks WHERE id = 'issue-###';

-- Insert
INSERT INTO tasks (id, title, description, status, started_at)
VALUES ('issue-###', '[title]', '[description]', 'in_progress', NOW());

-- Link issue + branch
UPDATE tasks SET github_issue = '#NNN', branch_name = 'session/issue-###-slug'
WHERE id = 'issue-###';

-- Save plan path
UPDATE tasks SET plan_file = 'plans/active/issue-###-slug.md' WHERE id = 'issue-###';

-- Append a phase update to the journal
UPDATE tasks SET description_full = COALESCE(description_full, '') || '

### Phase 2: BUILD
- Files changed: [list]
- Tests: [N] passing'
WHERE id = 'issue-###';

-- Mark complete
UPDATE tasks SET status = 'review', progress = 100, completed_at = NOW()
WHERE id = 'issue-###';
```

## Optional: durable inter-agent memory table (brief note)

A `pipeline_memories` table is an *optional* add-on within DB mode that gives a queryable audit trail across parallel runs. It is not required: teammates report to the lead via SendMessage, and the pipeline relies on `.pipeline-state.json` + `description_full` by default.

If you want it, create an append-only table keyed by `task_id` (e.g. columns `task_id`, `phase`, `role`, `memory_type`, `content`, `metadata jsonb`, `created_at`). Keep `task_id` as the partition key so parallel runs never cross-contaminate, then query by `task_id ORDER BY id` for the timeline.

## Optional: durable directive store (for the `memory:` config block)

Backs Phase 0b pre-flight recall and the Phase 5 memory-save step (see `MEMORY-PROTOCOL.md`). Independent of `tracking_mode` — point `memory.recall_tool`/`save_tool` at whatever runs SQL for your store. The `tags` JSONB column is what recall filters on, so index it.

```sql
CREATE TABLE memory_knowledge (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,            -- the directive: what to do + why + a file/pattern reference
  tags       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_memory_knowledge_tags ON memory_knowledge USING GIN (tags);

-- Optional companion for decisions, if you want rationale separate from directives.
CREATE TABLE memory_decisions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    TEXT,                     -- issue-### (or your task id scheme)
  decision   TEXT NOT NULL,
  rationale  TEXT,
  tags       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Recall reference query (Phase 0b) and save reference insert (Phase 5):

```sql
-- recall
SELECT title, content FROM memory_knowledge
WHERE tags @> '["yalla"]'::jsonb
  AND (tags @> '["<domain>"]'::jsonb OR content ILIKE '%<keyword>%')
ORDER BY created_at DESC LIMIT 5;

-- save
INSERT INTO memory_knowledge (title, content, tags)
VALUES ('<directive title>', '<directive + why + file/pattern>',
        '["yalla", "<domain>", "directive"]'::jsonb);
```
