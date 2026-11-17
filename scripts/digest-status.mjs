#!/usr/bin/env node
// catask digest catch-up: did the last scheduled evening digest finish?
//
// The Claude desktop scheduler does not retry a run that started and then failed (e.g. a 19:06 run
// that died at 21:04 with "Can't reach the API server (ENOTFOUND)"), so without this nothing runs
// until the next evening. The SessionStart hook calls `digestStatus()`; when the last slot was
// missed it tells Claude to `--claim` it and start the scheduled task again (`run_scheduled_task`).
// The digest window starts at the previous digest's `generatedAt`, so a catch-up loses nothing
// (the skill caps the window at 4 days).
//
// Slot = the effective digest time (`digestTime`, else `workHours.end` + 1 h rounded to :00/:30,
// default 19:00) on `workHours.days` (ISO, Mon = 1), in `config.timezone`.
// Done = the newest `~/.catask/YYYY-MM-DD.json` has `generatedAt` >= the slot.
//
// CLI (zero dependencies, Node >= 18):
//   node digest-status.mjs           → JSON {state, slot, lastDigest, attempts, ...}, read-only
//   node digest-status.mjs --claim   → also checks the network and, when the slot is "missed",
//                                      records one attempt in catchup.json: {granted: true|false, reason}
//   --now <ISO> (tests), CATASK_ASSUME_ONLINE=1 / CATASK_ASSUME_OFFLINE=1 (tests)
// states: "ok" (done), "pending" (slot < GRACE ago: the scheduled run may still be going),
// "missed" (catch up now), "cooldown" (an attempt < COOLDOWN ago), "gave-up" (MAX_ATTEMPTS used),
// "off" (config catchUp: false), "no-config", "no-digest" (never ran yet), "no-slot".
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveStateDir } from './state-dir.mjs';

export const GRACE_MS = 60 * 60 * 1000;      // a healthy run can take ~40 min; generatedAt is written at its end
export const COOLDOWN_MS = 60 * 60 * 1000;   // between two catch-up attempts for the same slot
export const MAX_ATTEMPTS = 3;               // per missed slot
const DAY_MS = 24 * 3600 * 1000;
const FILE_RE = /^\d{4}-\d{2}-\d{2}\.json$/;

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }
function hm(s) { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim()); if (!m) return null; const h = +m[1], mi = +m[2]; return h < 24 && mi < 60 ? h * 60 + mi : null }

/// Effective digest time in minutes after local midnight, and the ISO weekdays (Mon = 1 … Sun = 7).
export function schedule(cfg) {
  let min = hm(cfg && cfg.digestTime);
  if (min == null) {
    const end = hm(cfg && cfg.workHours && cfg.workHours.end);
    min = end == null ? 19 * 60 : Math.min(Math.round((end + 60) / 30) * 30, 23 * 60 + 30);
  }
  let days = cfg && cfg.workHours && Array.isArray(cfg.workHours.days) ? cfg.workHours.days : null;
  days = (days || []).map((d) => (+d === 0 ? 7 : +d)).filter((d) => d >= 1 && d <= 7);
  if (!days.length) days = [1, 2, 3, 4, 5];
  return { minutes: min, days };
}

function tzOk(tz) { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return !!tz } catch { return false } }
/// Wall-clock parts of instant [ms] in [tz] (or a fixed UTC offset in hours when tz is unusable).
function parts(ms, tz, offH) {
  if (!tz) { const d = new Date(ms + offH * 3600e3); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), wd: d.getUTCDay() || 7 } }
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short' });
  const o = {}; for (const p of f.formatToParts(new Date(ms))) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, wd: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(o.weekday) + 1 };
}
/// The instant whose wall clock in [tz] is y-m-d h:mi.
function zoned(y, m, d, h, mi, tz, offH) {
  const want = Date.UTC(y, m - 1, d, h, mi);
  let t = want;
  for (let i = 0; i < 3; i++) { const p = parts(t, tz, offH); const diff = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - want; if (!diff) break; t -= diff }
  return t;
}
function zoneOf(cfg) {
  const tz = cfg && tzOk(cfg.timezone) ? cfg.timezone : null;
  const offH = Number.isFinite(+(cfg && cfg.utcOffsetHours)) ? +cfg.utcOffsetHours : 0;
  return { tz, offH };
}

/// The most recent scheduled slot at or before [now] (ms), or null.
export function lastSlot(cfg, now) {
  const { minutes, days } = schedule(cfg);
  const { tz, offH } = zoneOf(cfg);
  const today = parts(now, tz, offH);
  for (let i = 0; i < 8; i++) {
    const day = new Date(Date.UTC(today.y, today.m - 1, today.d - i));
    const wd = day.getUTCDay() || 7;
    if (!days.includes(wd)) continue;
    const t = zoned(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), Math.floor(minutes / 60), minutes % 60, tz, offH);
    if (t <= now) return t;
  }
  return null;
}

/// Newest `generatedAt` (ms) among the digest files in [dir], or null.
export function lastDigest(dir) {
  let names = [];
  try { names = fs.readdirSync(dir).filter((n) => FILE_RE.test(n)).sort().reverse().slice(0, 10) } catch { return null }
  let best = null;
  for (const n of names) {
    const t = Date.parse((readJson(path.join(dir, n)) || {}).generatedAt || '');
    if (Number.isFinite(t) && (best == null || t > best)) best = t;
  }
  return best;
}

/// "19:00 16/11" in the user's zone.
export function localLabel(ms, cfg) {
  if (ms == null) return null;
  const { tz, offH } = zoneOf(cfg);
  const p = parts(ms, tz, offH); const z = (n) => String(n).padStart(2, '0');
  return `${z(p.h)}:${z(p.mi)} ${z(p.d)}/${z(p.m)}`;
}

/// Read-only status of the last slot. [now] in ms.
export function digestStatus({ dir, cfg, now = Date.now() }) {
  if (!cfg) return { state: 'no-config' };
  if (cfg.catchUp === false) return { state: 'off' };
  const last = lastDigest(dir);
  const base = { lastDigest: last == null ? null : new Date(last).toISOString(), lastDigestLocal: localLabel(last, cfg) };
  if (last == null) return { state: 'no-digest', ...base };
  const slot = lastSlot(cfg, now);
  if (slot == null) return { state: 'no-slot', ...base };
  const out = { ...base, slot: new Date(slot).toISOString(), slotLocal: localLabel(slot, cfg), attempts: 0 };
  if (last >= slot) return { state: 'ok', ...out };
  if (now - slot < GRACE_MS) return { state: 'pending', ...out };
  const c = readJson(path.join(dir, 'catchup.json'));
  const tries = c && c.slot === out.slot && Array.isArray(c.attempts) ? c.attempts.map((a) => Date.parse(a)).filter(Number.isFinite) : [];
  out.attempts = tries.length;
  if (tries.length >= MAX_ATTEMPTS) return { state: 'gave-up', ...out };
  if (tries.length && now - Math.max(...tries) < COOLDOWN_MS) return { state: 'cooldown', ...out };
  return { state: 'missed', ...out };
}

/// Whether the API host resolves (ENOTFOUND is the failure we recover from).
export async function online(timeoutMs = 3000) {
  if (process.env.CATASK_ASSUME_OFFLINE === '1') return false;
  if (process.env.CATASK_ASSUME_ONLINE === '1') return true;
  const look = dns.promises.lookup('api.anthropic.com').then(() => true, () => false);
  const timer = new Promise((r) => setTimeout(() => r(false), timeoutMs).unref());
  return Promise.race([look, timer]);
}

/// Records one catch-up attempt when the slot is missed and the network is up.
export async function claim({ dir, cfg, now = Date.now() }) {
  const st = digestStatus({ dir, cfg, now });
  if (st.state !== 'missed') return { granted: false, reason: st.state, ...st };
  if (!(await online())) return { granted: false, reason: 'offline', ...st };
  const file = path.join(dir, 'catchup.json');
  const c = readJson(file);
  const attempts = c && c.slot === st.slot && Array.isArray(c.attempts) ? c.attempts : [];
  attempts.push(new Date(now).toISOString());
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ slot: st.slot, attempts }, null, 2));
  fs.renameSync(tmp, file);
  return { granted: true, reason: 'missed', ...st, attempts: attempts.length };
}

async function cli(argv) {
  const at = argv.indexOf('--now');
  const now = at >= 0 ? Date.parse(argv[at + 1]) : Date.now();
  const dir = resolveStateDir().dir;
  const cfg = readJson(path.join(dir, 'config.json'));
  const res = argv.includes('--claim') ? await claim({ dir, cfg, now }) : digestStatus({ dir, cfg, now });
  process.stdout.write(JSON.stringify(res) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cli(process.argv.slice(2)).catch((e) => { process.stdout.write(JSON.stringify({ granted: false, state: 'error', reason: String(e && e.message || e) }) + '\n'); process.exit(1) });
}
