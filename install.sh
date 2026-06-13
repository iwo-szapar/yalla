#!/usr/bin/env bash
# Yalla installer — copies the pipeline into a target repo's .claude/ directory.
#
# Usage:
#   ./install.sh /path/to/your/repo
#   ./install.sh            # defaults to the current directory
#
# This copies the engine (skills, agents, knowledge) into <repo>/.claude/ and
# seeds a YALLA.md config from the template if one does not already exist.
# It does NOT overwrite an existing .claude/YALLA.md.

set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${1:-$(pwd)}"
CLAUDE_DIR="$DEST/.claude"

if [ ! -d "$DEST" ]; then
  echo "error: target '$DEST' is not a directory" >&2
  exit 1
fi

echo "Installing Yalla into: $CLAUDE_DIR"
mkdir -p "$CLAUDE_DIR/skills" "$CLAUDE_DIR/agents" "$CLAUDE_DIR/knowledge/yalla"

cp -R "$SRC/skills/." "$CLAUDE_DIR/skills/"
cp -R "$SRC/agents/." "$CLAUDE_DIR/agents/"
cp -R "$SRC/knowledge/yalla/." "$CLAUDE_DIR/knowledge/yalla/"

# The engine files reference each other via ${CLAUDE_PLUGIN_ROOT}/... for plugin
# installs. In vendored mode the files live in this repo's .claude/, so rewrite
# those references to .claude/ paths. (.claude/YALLA.md is already correct.)
find "$CLAUDE_DIR/skills" "$CLAUDE_DIR/agents" "$CLAUDE_DIR/knowledge/yalla" -name '*.md' -exec sed -i.bak \
  -e 's|${CLAUDE_PLUGIN_ROOT}/knowledge/yalla/|.claude/knowledge/yalla/|g' \
  -e 's|${CLAUDE_PLUGIN_ROOT}/agents/|.claude/agents/|g' \
  -e 's|${CLAUDE_PLUGIN_ROOT}/skills/|.claude/skills/|g' {} +
find "$CLAUDE_DIR/skills" "$CLAUDE_DIR/agents" "$CLAUDE_DIR/knowledge/yalla" -name '*.md.bak' -delete

if [ -f "$CLAUDE_DIR/YALLA.md" ]; then
  echo "Kept existing $CLAUDE_DIR/YALLA.md (not overwritten)."
else
  cp "$SRC/YALLA.example.md" "$CLAUDE_DIR/YALLA.md"
  echo "Seeded $CLAUDE_DIR/YALLA.md from template — edit it before your first run."
fi

cat <<'DONE'

Yalla installed.

Next steps:
  1. In Claude Code, run:    /onboard
  2. Edit .claude/YALLA.md  — set commands, tracking mode, and gotchas.
  3. Re-run:                /onboard
  4. Then run:              /yalla build the thing you want

See SETUP.md and CUSTOMIZING.md for details.
DONE
