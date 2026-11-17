#!/usr/bin/env node
// Self-test for the catask SessionStart hook. Fictional data only, temp folders only.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, 'catask-context.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catask-hook-test-'));
const digest = path.join(tmp, 'digest'), work = path.join(tmp, 'work'), plug = path.join(tmp, 'plugin');
[digest, work, plug].forEach((d) => fs.mkdirSync(d, { recursive: true }));
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ };
const run = (cwd) => {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [script], { input: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup', cwd }),
    env: { ...process.env, CATASK_DIGEST_DIR: digest, CLAUDE_PLUGIN_ROOT: plug }, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr, ms: Date.now() - t0 };
};
const write = (f, v) => fs.writeFileSync(path.join(digest, f), JSON.stringify(v));
const todos = Array.from({ length: 45 }, (_, i) => ({ id: `2026-11-06-t${i + 1}`, title: i === 0 ? 'Review the cart module MR\nfor Pat Panda' : `Fictional task number ${i + 1} for Sam Squirrel`, jiraKey: i < 3 ? `MOB-${2060 + i}` : undefined, person: 'Sam Squirrel', url: 'https://example.atlassian.net/browse/MOB-2060' }));

let r = run(work); ok(r.code === 0 && r.out === '', 'missing cache: silent, exit 0');
write('open-todos.json', { generatedAt: new Date(Date.now() - 4 * 864e5).toISOString(), artifactUrl: 'https://claude.ai/artifact/example', todos });
r = run(work); ok(r.code === 0 && r.out === '', 'stale cache (4 days): silent');
write('open-todos.json', { generatedAt: new Date(Date.now() - 3600e3).toISOString(), artifactUrl: 'https://claude.ai/artifact/example', todos });
write('config.json', { timezone: 'Asia/Ho_Chi_Minh', crossSessionDone: false });
r = run(work); ok(r.code === 0 && r.out === '', 'crossSessionDone false: silent');
write('config.json', { timezone: 'Asia/Ho_Chi_Minh' });
r = run(work);
ok(r.code === 0 && r.out.includes('catask#2026-11-06-t1 · Review the cart module MR for Pat Panda · MOB-2060'), 'normal: todo line with Jira key, newline in title flattened');
ok(r.out.includes('catask#2026-11-06-t40') && !r.out.includes('catask#2026-11-06-t41 '), 'normal: capped at 40 todos');
ok(/AskUserQuestion/.test(r.out) && /Never mark anything done without a Yes/.test(r.out) && r.out.includes('https://claude.ai/artifact/example') && r.out.includes('Asia/Ho_Chi_Minh') && r.out.includes('pending-done.json'), 'normal: rule, artifact url, time zone, fallback file');
ok(r.out.length < 6000, `normal: compact (${r.out.length} chars, ~${Math.round(r.out.length / 4)} tokens)`);
ok(r.ms < 1000, `normal: fast (${r.ms} ms incl. node start)`);
r = run(plug); ok(r.code === 0 && r.out === '', 'inside the plugin root: silent');
r = run(path.dirname(here)); ok(r.code === 0 && r.out === '', 'inside the catask repo: silent');
fs.writeFileSync(path.join(digest, 'open-todos.json'), '{broken');
r = run(work); ok(r.code === 0 && r.out === '', 'broken cache: silent');

// Catch-up after a failed or missed evening digest (scripts/digest-status.mjs), fictional data only.
const st = await import(path.join(here, '..', 'scripts', 'digest-status.mjs'));
const statusCli = path.join(here, '..', 'scripts', 'digest-status.mjs');
const cu = path.join(tmp, 'catchup'); fs.mkdirSync(cu);
const hcm = { timezone: 'Asia/Ho_Chi_Minh', utcOffsetHours: 7, workHours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] } };
const T = (s) => Date.parse(s);
let sc = st.schedule(hcm); ok(sc.minutes === 19 * 60 && sc.days.join() === '1,2,3,4,5', 'schedule: 18:00 end → 19:00 Mon–Fri');
ok(st.schedule({ workHours: { end: '17:45' } }).minutes === 19 * 60 && st.schedule({ workHours: { end: '18:10' } }).minutes === 19 * 60, 'schedule: end + 1 h rounded to :00/:30');
sc = st.schedule({ digestTime: '20:30', workHours: { days: [0, 6] } }); ok(sc.minutes === 20 * 60 + 30 && sc.days.join() === '7,6', 'schedule: digestTime wins, Sunday 0 → 7');
ok(st.lastSlot(hcm, T('2026-11-16T21:30:00+07:00')) === T('2026-11-16T19:00:00+07:00'), 'lastSlot: Monday evening → today 19:00');
ok(st.lastSlot(hcm, T('2026-11-16T08:00:00+07:00')) === T('2026-11-13T19:00:00+07:00'), 'lastSlot: Monday morning → Friday 19:00');
ok(st.lastSlot(hcm, T('2026-11-15T12:00:00+07:00')) === T('2026-11-13T19:00:00+07:00'), 'lastSlot: Sunday → Friday 19:00');
ok(st.lastSlot({ timezone: 'America/New_York', digestTime: '19:00' }, T('2026-11-03T03:00:00Z')) === T('2026-11-03T00:00:00Z'), 'lastSlot: zone after a DST change');
ok(st.lastSlot({ timezone: 'Not/AZone', utcOffsetHours: 7, digestTime: '19:00' }, T('2026-11-16T21:30:00+07:00')) === T('2026-11-16T19:00:00+07:00'), 'lastSlot: bad zone falls back to utcOffsetHours');
const S = (now, cfg = hcm) => st.digestStatus({ dir: cu, cfg, now: T(now) });
ok(S('2026-11-16T21:10:00+07:00').state === 'no-digest', 'status: no digest yet → silent state');
fs.writeFileSync(path.join(cu, '2026-11-14.json'), JSON.stringify({ generatedAt: '2026-11-14T22:43:00+07:00' }));
fs.writeFileSync(path.join(cu, 'config.json'), JSON.stringify(hcm));
ok(S('2026-11-16T19:30:00+07:00').state === 'pending', 'status: within an hour of the slot → pending (run may be going)');
let s1 = S('2026-11-16T21:10:00+07:00');
ok(s1.state === 'missed' && s1.slotLocal === '19:00 16/11' && s1.lastDigestLocal === '22:43 14/11', 'status: 16/11 run died → missed, labels in the user zone');
ok(S('2026-11-16T21:10:00+07:00', { ...hcm, catchUp: false }).state === 'off', 'status: catchUp false → off');
process.env.CATASK_ASSUME_OFFLINE = '1';
let c1 = await st.claim({ dir: cu, cfg: hcm, now: T('2026-11-16T21:10:00+07:00') });
ok(!c1.granted && c1.reason === 'offline' && !fs.existsSync(path.join(cu, 'catchup.json')), 'claim: offline → not granted, nothing recorded');
delete process.env.CATASK_ASSUME_OFFLINE; process.env.CATASK_ASSUME_ONLINE = '1';
c1 = await st.claim({ dir: cu, cfg: hcm, now: T('2026-11-16T21:10:00+07:00') });
ok(c1.granted && c1.attempts === 1, 'claim: online + missed → granted, attempt 1');
c1 = await st.claim({ dir: cu, cfg: hcm, now: T('2026-11-16T21:20:00+07:00') });
ok(!c1.granted && c1.reason === 'cooldown', 'claim: second session 10 min later → cooldown');
ok((await st.claim({ dir: cu, cfg: hcm, now: T('2026-11-16T22:20:00+07:00') })).granted && (await st.claim({ dir: cu, cfg: hcm, now: T('2026-11-16T23:30:00+07:00') })).granted, 'claim: retried after an hour (attempts 2, 3)');
c1 = await st.claim({ dir: cu, cfg: hcm, now: T('2026-11-17T08:30:00+07:00') });
ok(!c1.granted && c1.reason === 'gave-up', 'claim: at most 3 attempts per slot');
fs.writeFileSync(path.join(cu, '2026-11-17.json'), JSON.stringify({ generatedAt: '2026-11-17T08:40:00+07:00' }));
ok(S('2026-11-17T09:00:00+07:00').state === 'ok', 'status: catch-up digest written → ok');
ok(S('2026-11-17T21:00:00+07:00').state === 'missed' && S('2026-11-17T21:00:00+07:00').attempts === 0, 'status: a new slot starts with fresh attempts');
let cli = spawnSync(process.execPath, [statusCli, '--claim', '--now', '2026-11-17T21:00:00+07:00'], { env: { ...process.env, CATASK_DIGEST_DIR: cu }, encoding: 'utf8' });
let cj = JSON.parse(cli.stdout); ok(cli.status === 0 && cj.granted && cj.slotLocal === '19:00 17/11', 'cli --claim: granted, JSON out');
cli = spawnSync(process.execPath, [statusCli, '--now', '2026-11-17T21:05:00+07:00'], { env: { ...process.env, CATASK_DIGEST_DIR: cu }, encoding: 'utf8' });
ok(JSON.parse(cli.stdout).state === 'cooldown', 'cli status: read-only, sees the claim');
delete process.env.CATASK_ASSUME_ONLINE;
// Hook with a slot 2 h ago (every day, UTC) and the last digest 30 h ago.
const hm = (d) => d.toISOString().slice(11, 16);
const ago = (h) => new Date(Date.now() - h * 3600e3);
write('config.json', { timezone: 'UTC', digestTime: hm(ago(2)), workHours: { days: [1, 2, 3, 4, 5, 6, 7] } });
write(`${ago(30).toISOString().slice(0, 10)}.json`, { generatedAt: ago(30).toISOString() });
write('open-todos.json', { generatedAt: new Date().toISOString(), artifactUrl: 'https://claude.ai/artifact/example', todos: todos.slice(0, 2) });
r = run(work);
ok(r.code === 0 && r.out.includes('did not finish') && r.out.includes(`${statusCli}" --claim`) && r.out.includes('run_scheduled_task') && r.out.includes('list_task_runs'), 'hook: missed digest → catch-up rule with the claim command');
ok(r.out.includes('catask#2026-11-06-t1'), 'hook: catch-up and the todo list together');
const runEnv = (extra) => spawnSync(process.execPath, [script], { input: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup', cwd: work }), env: { ...process.env, CATASK_DIGEST_DIR: digest, CLAUDE_PLUGIN_ROOT: plug, ...extra }, encoding: 'utf8' });
ok(!runEnv({ CATASK_RUNNER: '1' }).stdout.includes('did not finish'), 'hook: no catch-up inside a headless catask-runner run');
write('config.json', { timezone: 'UTC', digestTime: hm(ago(2)), workHours: { days: [1, 2, 3, 4, 5, 6, 7] }, crossSessionDone: false });
r = run(work); ok(r.out.includes('did not finish') && !r.out.includes('catask#'), 'hook: catch-up still works with crossSessionDone false');
write('catchup.json', { slot: new Date(st.lastSlot({ timezone: 'UTC', digestTime: hm(ago(2)), workHours: { days: [1, 2, 3, 4, 5, 6, 7] } }, Date.now())).toISOString(), attempts: [new Date().toISOString()] });
r = run(work); ok(r.code === 0 && r.out === '', 'hook: claimed < 1 h ago → silent');
write('config.json', { timezone: 'UTC', workHours: { days: [1, 2, 3, 4, 5, 6, 7] }, catchUp: false, crossSessionDone: false });
r = run(work); ok(r.code === 0 && r.out === '', 'hook: catchUp false → silent');
for (const f of fs.readdirSync(digest)) fs.rmSync(path.join(digest, f), { force: true });

// State dir resolution and the blocked-Documents prompt, with HOME pointed at a temp folder.
const home = path.join(tmp, 'home'), docs = path.join(home, 'Documents'), legacy = path.join(docs, 'daily-digest');
const stateCli = path.join(here, '..', 'scripts', 'state-dir.mjs');
const runHome = (args = [], cwd = work) => spawnSync(process.execPath, args.length ? [stateCli, ...args] : [script], {
  input: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup', cwd }),
  env: { ...process.env, CATASK_TEST_HOME: home, CATASK_DIGEST_DIR: '', CATASK_STATE_DIR: '', CLAUDE_PLUGIN_ROOT: plug }, encoding: 'utf8' });
fs.mkdirSync(legacy, { recursive: true });
fs.writeFileSync(path.join(legacy, 'config.json'), JSON.stringify({ timezone: 'Asia/Ho_Chi_Minh' }));
fs.writeFileSync(path.join(legacy, 'open-todos.json'), JSON.stringify({ generatedAt: new Date().toISOString(), artifactUrl: 'https://claude.ai/artifact/example', todos: todos.slice(0, 2) }));
let s = JSON.parse(runHome(['--no-migrate']).stdout);
ok(s.status === 'ok' && s.dir === legacy, 'readable legacy + --no-migrate: uses it in place');
r = runHome();
const moved = path.join(home, '.catask');
ok(fs.existsSync(path.join(moved, 'config.json')) && fs.lstatSync(legacy).isSymbolicLink(), 'readable legacy: moved to ~/.catask, symlink left behind');
ok(r.stdout.includes('catask#2026-11-06-t1') && r.stdout.includes(path.join(moved, 'pending-done.json')), 'after the move: hook lists the todos and points at ~/.catask');
s = JSON.parse(runHome(['--no-migrate']).stdout);
ok(s.status === 'ok' && s.dir === moved, 'after the move: status ok, dir ~/.catask');
// Blocked: fresh ~/.catask, Documents unreadable (chmod 000 gives the same EACCES/EPERM path as macOS TCC).
fs.rmSync(moved, { recursive: true, force: true }); fs.rmSync(legacy, { force: true });
fs.mkdirSync(legacy); fs.chmodSync(docs, 0o000);
s = JSON.parse(runHome(['--no-migrate']).stdout);
ok(s.status === 'blocked' && s.dir === moved, 'unreadable Documents: status blocked');
r = runHome();
ok(r.status === 0 && /AskUserQuestion/.test(r.stdout) && r.stdout.includes('--open-terminal') && r.stdout.includes('Move it now'), 'blocked: hook asks to move via Terminal');
r = runHome();
ok(r.status === 0 && r.stdout === '', 'blocked: asks at most once a day');
s = JSON.parse(runHome(['--no-migrate']).stdout);
ok(s.status === 'blocked', 'blocked: the daily marker does not count as data');
fs.chmodSync(docs, 0o755);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
