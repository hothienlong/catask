#!/usr/bin/env node
// catask state dir: where config.json, artifact-url.txt, the digest files and the runner live.
//
// Default `~/.catask`. Older versions used `~/Documents/daily-digest`, but macOS (TCC) blocks
// Claude Code from ~/Documents WITHOUT showing a permission prompt (its helper app declares no
// Documents usage string), so reads there fail with EPERM and every feature breaks silently.
// `~/.catask` is not a protected folder, so it needs no permission at all.
//
// Migration of the legacy folder:
// - readable  → moved here and replaced by a symlink (Codex, old plugin copies keep working);
// - blocked   → a `.command` script is opened in Terminal.app, which has its own usage strings,
//               so macOS shows its normal "Terminal would like to access your Documents" prompt.
//               Only after the user agreed in chat (the hook/skills ask first).
//
// CLI (zero dependencies, Node >= 18):
//   node state-dir.mjs              → prints JSON {dir, status, legacy}; auto-migrates a readable legacy dir
//   node state-dir.mjs --no-migrate → same, without moving anything
//   node state-dir.mjs --open-terminal [--wait SECONDS]
//                                   → when blocked: opens the migration script in Terminal.app and
//                                     waits (default 180 s) until it finished; prints the final JSON
// status: "ok" (dir is usable), "migrated" (just moved), "fresh" (nothing yet; dir will be created
// on first write), "blocked" (legacy data exists but macOS denies access), "env" (set by env var).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// CATASK_TEST_HOME lets the self-tests point HOME at a temp folder.
const HOME = process.env.CATASK_TEST_HOME || os.homedir();
export const STATE_DIR = path.join(HOME, '.catask');
export const LEGACY_DIR = path.join(HOME, 'Documents', 'daily-digest');
const DONE_MARK = '.migrated-from-documents';

/// Returns the env override for the state dir, or null when none is set.
function envDir() {
  const v = process.env.CATASK_STATE_DIR || process.env.CATASK_DIGEST_DIR;
  return v ? path.resolve(v) : null;
}

/// Classifies [p]: "missing", "denied" (EPERM/EACCES, i.e. macOS privacy), "dir", "link-here"
/// (a symlink to STATE_DIR, i.e. already migrated) or "other".
function probe(p) {
  let st;
  try { st = fs.lstatSync(p); } catch (e) {
    if (e && (e.code === 'EPERM' || e.code === 'EACCES')) return 'denied';
    return 'missing';
  }
  if (st.isSymbolicLink()) {
    try { if (fs.realpathSync(p) === fs.realpathSync(STATE_DIR)) return 'link-here'; } catch { /* dangling */ }
    return 'other';
  }
  if (!st.isDirectory()) return 'other';
  try { fs.readdirSync(p); return 'dir'; } catch (e) {
    return e && (e.code === 'EPERM' || e.code === 'EACCES') ? 'denied' : 'other';
  }
}

/// Whether STATE_DIR already holds catask data (marker files alone don't count).
function stateDirUsable() {
  return ['config.json', 'artifact-url.txt'].some((f) => fs.existsSync(path.join(STATE_DIR, f)));
}

/// Moves a readable legacy folder to STATE_DIR and leaves a symlink behind.
/// Returns true when it moved; never throws.
function migrateReadable() {
  try {
    if (stateDirUsable()) return false;
    if (fs.existsSync(STATE_DIR)) {
      // Only marker files from earlier prompts: keep them by moving them into the legacy folder first.
      for (const f of fs.readdirSync(STATE_DIR)) fs.renameSync(path.join(STATE_DIR, f), path.join(LEGACY_DIR, f));
      fs.rmdirSync(STATE_DIR);
    }
    fs.renameSync(LEGACY_DIR, STATE_DIR);
    try { fs.symlinkSync(STATE_DIR, LEGACY_DIR); } catch { /* the move is what matters */ }
    fs.writeFileSync(path.join(STATE_DIR, DONE_MARK), new Date().toISOString() + '\n');
    return true;
  } catch { return false; }
}

/// Resolves the state dir. With [migrate] (default) a readable legacy folder is moved first.
export function resolveStateDir({ migrate = true } = {}) {
  const env = envDir();
  if (env) return { dir: env, status: 'env', legacy: null };
  const legacy = probe(LEGACY_DIR);
  if (stateDirUsable()) return { dir: STATE_DIR, status: 'ok', legacy };
  if (legacy === 'dir') {
    if (migrate && migrateReadable()) return { dir: STATE_DIR, status: 'migrated', legacy: 'link-here' };
    // Not moved (--no-migrate or the move failed): keep using the legacy folder as is.
    return { dir: LEGACY_DIR, status: 'ok', legacy };
  }
  // macOS hides whether anything is there; a brand-new user gets "blocked" too until the first
  // config is written, so callers ask at most once a day (see askedToday/markAsked).
  if (legacy === 'denied') return { dir: STATE_DIR, status: 'blocked', legacy };
  return { dir: STATE_DIR, status: 'fresh', legacy };
}

/// Whether the user was already asked about a blocked legacy folder today ([day] = YYYY-MM-DD).
export function askedToday(day) {
  return fs.existsSync(path.join(STATE_DIR, `.legacy-asked-${day}`));
}

/// Records that the user was asked today, so sessions don't ask again until tomorrow.
export function markAsked(day) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    for (const f of fs.readdirSync(STATE_DIR)) if (f.startsWith('.legacy-asked-')) fs.rmSync(path.join(STATE_DIR, f), { force: true });
    fs.writeFileSync(path.join(STATE_DIR, `.legacy-asked-${day}`), '');
  } catch { /* best effort */ }
}

/// Writes the Terminal migration script into a folder Claude Code can write (not Documents).
function writeMigrationScript() {
  const box = fs.mkdtempSync(path.join(os.tmpdir(), 'catask-migrate-'));
  const file = path.join(box, 'catask-migrate.command');
  const sh = `#!/bin/zsh
# catask: move ~/Documents/daily-digest to ~/.catask (Claude Code cannot read ~/Documents).
SRC="$HOME/Documents/daily-digest"
DST="$HOME/.catask"
echo ""
echo "catask: chuyển dữ liệu sang ~/.catask / moving your data to ~/.catask"
echo "Nếu macOS hỏi Terminal có được truy cập Documents không, bấm Allow (Cho phép)."
echo "If macOS asks whether Terminal may access Documents, click Allow."
echo ""
if [ ! -e "$SRC" ]; then
  echo "Không thấy $SRC — không có gì để chuyển. / Nothing to move."
  mkdir -p "$DST" && date > "$DST/${DONE_MARK}"
elif [ -L "$SRC" ]; then
  echo "Đã chuyển từ trước. / Already moved."
  mkdir -p "$DST" && date > "$DST/${DONE_MARK}"
elif [ -f "$DST/config.json" ] || [ -f "$DST/artifact-url.txt" ]; then
  echo "~/.catask đã có dữ liệu; chép bổ sung các file còn thiếu. / ~/.catask exists; copying missing files."
  cp -Rn "$SRC"/. "$DST"/ && mv "$SRC" "$SRC.moved-to-catask" && ln -s "$DST" "$SRC" && date > "$DST/${DONE_MARK}"
else
  # ~/.catask may already hold a few files (markers, backups) but no catask data: fold them into
  # the folder being moved (never overwriting), and move only when ~/.catask is then gone.
  if [ -d "$DST" ]; then
    for f in "$DST"/.[!.]* "$DST"/*; do [ -e "$f" ] && mv -n "$f" "$SRC"/; done
    rmdir "$DST" 2>/dev/null
  fi
  if [ -e "$DST" ]; then
    echo "~/.catask còn file trùng tên, chưa chuyển. / ~/.catask still has clashing files; not moved."
  else
    mv "$SRC" "$DST" && ln -s "$DST" "$SRC" && date > "$DST/${DONE_MARK}"
  fi
fi
if [ -f "$DST/${DONE_MARK}" ]; then
  echo ""
  echo "✅ Xong. Quay lại Claude, có thể đóng cửa sổ này. / Done. Go back to Claude; you can close this window."
else
  echo ""
  echo "❌ Chưa chuyển được (có thể bạn đã bấm Don't Allow). Bật lại ở System Settings → Privacy & Security →"
  echo "   Files and Folders → Terminal → Documents Folder, rồi bảo Claude thử lại."
  echo "❌ Not moved (maybe Don't Allow was clicked). Enable System Settings → Privacy & Security →"
  echo "   Files and Folders → Terminal → Documents Folder, then ask Claude to try again."
fi
`;
  fs.writeFileSync(file, sh, { mode: 0o755 });
  return file;
}

/// Opens the migration script in Terminal.app and waits up to [waitSec] for it to finish.
export function migrateViaTerminal(waitSec = 180) {
  if (process.platform !== 'darwin') return { ...resolveStateDir(), opened: false };
  const file = writeMigrationScript();
  const r = spawnSync('open', ['-a', 'Terminal', file], { encoding: 'utf8' });
  if (r.status !== 0) return { ...resolveStateDir({ migrate: false }), opened: false, script: file };
  const until = Date.now() + waitSec * 1000;
  const mark = path.join(STATE_DIR, DONE_MARK);
  while (Date.now() < until) {
    if (fs.existsSync(mark)) break;
    spawnSync('sleep', ['1']);
  }
  const res = resolveStateDir({ migrate: false });
  return { ...res, opened: true, finished: fs.existsSync(mark), script: file };
}

function main(argv) {
  if (argv.includes('--open-terminal')) {
    const i = argv.indexOf('--wait');
    const wait = i >= 0 ? Math.max(5, Math.min(600, Number(argv[i + 1]) || 180)) : 180;
    const before = resolveStateDir({ migrate: false });
    const out = before.status === 'blocked' ? migrateViaTerminal(wait) : before;
    process.stdout.write(JSON.stringify(out) + '\n');
    return;
  }
  const out = resolveStateDir({ migrate: !argv.includes('--no-migrate') });
  process.stdout.write(JSON.stringify(out) + '\n');
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
