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
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
