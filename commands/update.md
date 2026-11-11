---
description: Update the catask plugin to the newest version and show the old and new version
---

Update the catask plugin for me. Use the Bash tool; don't edit any settings file in this command.

1. **Find the claude CLI** (the terminal one, or the one bundled with the Claude desktop app):
   `C="$(command -v claude || ls -d "$HOME/Library/Application Support/Claude/claude-code"/*/*/claude.app/Contents/MacOS/claude 2>/dev/null | sort | tail -1)"`. If `$C` is empty, say the CLI wasn't found and show the in-session steps: `/plugin marketplace update catask`, then `/reload-plugins`. Stop.
2. **Before**: run `"$C" plugin list --json` and find the installed catask entries (ids starting with `catask@`). Note each id and `version`. If `--json` fails, use `"$C" plugin list` and read the `catask@…` block. Also look for `catask@synced` in the plain `"$C" plugin list` output (plugins synced from claude.ai).
3. **Pick the update path by where catask came from**:
   - `catask@claudeai-organization-library` or `catask@synced` (organization library / claude.ai): it updates by itself when Claude Code restarts; don't run any update command. Say so, and suggest `/reload-plugins` or a new session. If the organization library still has an old version, the admin has to republish it there.
   - `catask@catask` (GitHub marketplace): run
     `"$C" plugin marketplace update catask && "$C" plugin update catask@catask`
     (timeout ~3 minutes). If the marketplace update fails over git access, say that `git` must be able to reach github.com without a prompt (for example `gh auth login` then `gh auth setup-git`, or `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1`).
   - Installed from another marketplace name (`catask@<name>`): run the same two commands with that name.
   - Not installed at all: say so and show the install lines from the README (`/plugin marketplace add hothienlong/catask`, `/plugin install catask@catask`). Stop.
4. **After**: run the list command again and report a one-row table: install id, old version → new version (or "already up to date").
5. Tell me to run **`/reload-plugins`** in this session, or open a new session, so the new version loads. If catask came from GitHub and auto-update isn't on, mention once that `/catask:setup` can turn it on (or `/plugin` → Marketplaces → catask → Enable auto-update).
6. If the new version changed the catask page itself, my page is republished to the **same URL** (the `daily-digest-todo` skill's "When the template itself changes" step); the link and my data stay as they are.

Answer in the language of my catask config (`~/.catask/config.json` `language`) if it exists, else in the language I wrote in.

$ARGUMENTS
