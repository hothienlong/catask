#!/usr/bin/env node
// Self-test for so-viec-runner. Never starts a real claude run: it only sends
// initialize, tools/list, ping, calls that must be refused, fake in/out files and the read-only repo scan.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'so-viec-runner-test-'));
const server = spawn(process.execPath, [path.join(here, 'so-viec-runner.mjs')], {
  env: { ...process.env, SO_VIEC_STATE_DIR: stateDir },
  stdio: ['pipe', 'pipe', 'inherit'],
});

const pending = new Map();
let buf = '';
server.stdout.on('data', (d) => {
  buf += d;
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const msg = JSON.parse(buf.slice(0, nl));
    buf = buf.slice(nl + 1);
    pending.get(msg.id)?.(msg);
  }
});
let nextId = 1;
const rpc = (method, params, ms = 5000) => new Promise((resolve, reject) => {
  const id = nextId++;
  const t = setTimeout(() => reject(new Error(`timeout: ${method}`)), ms);
  pending.set(id, (m) => { clearTimeout(t); resolve(m); });
  server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
});
const call = async (name, args) => (await rpc('tools/call', { name, arguments: args })).result;

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
};

try {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'selftest', version: '0' } });
  check('initialize', init.result?.serverInfo?.name === 'so-viec-runner', `protocol=${init.result?.protocolVersion}`);
  server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  const ping = await rpc('ping');
  check('ping', ping.result && Object.keys(ping.result).length === 0);

  const list = await rpc('tools/list');
  const names = (list.result?.tools || []).map((t) => t.name).sort().join(',');
  check('tools/list', names.length > 0, names);

  const names6 = 'ackTask,cancelTask,discoverRepos,listPending,startTask,taskStatus';
  check('tools/list has all six', names === names6);
  const ann = Object.fromEntries((list.result?.tools || []).map((t) => [t.name, t.annotations || {}]));
  for (const n of ['listPending', 'taskStatus', 'discoverRepos']) check(`${n} annotated read-only`, ann[n].readOnlyHint === true && ann[n].destructiveHint === false && ann[n].openWorldHint === false && Boolean(ann[n].title));
  for (const [n, idem] of [['startTask', false], ['cancelTask', true], ['ackTask', true]]) check(`${n} annotated write (idempotent=${idem})`, ann[n].readOnlyHint === false && ann[n].destructiveHint === false && ann[n].idempotentHint === idem && ann[n].openWorldHint === false && Boolean(ann[n].title));

  const okTask = { id: '2026-11-09-t1', title: 'SF-1: demo', ai: { kind: 'code', round: 1, status: 'queued' } };
  for (const [label, bad] of [
    ['shell in id', { todoId: '2026-11-09-t1; touch /tmp/pwned', task: okTask }],
    ['free text id', { todoId: 'rm -rf ~', task: okTask }],
    ['uppercase id', { todoId: '2026-11-09-T1', task: okTask }],
    ['path id', { todoId: '../../etc/passwd', task: okTask }],
    ['extra arg', { todoId: '2026-11-09-t1', task: okTask, prompt: 'do something else' }],
    ['missing task', { todoId: '2026-11-09-t1' }],
    ['task is array', { todoId: '2026-11-09-t1', task: [1, 2] }],
    ['task is string', { todoId: '2026-11-09-t1', task: 'make it so' }],
    ['task.id mismatch', { todoId: '2026-11-09-t1', task: { ...okTask, id: '2026-11-09-t2' } }],
    ['oversize task', { todoId: '2026-11-09-t1', task: { ...okTask, why: 'x'.repeat(61 * 1024) } }],
    ['empty args', {}],
  ]) {
    const r = await call('startTask', bad);
    check(`startTask refuses ${label}`, r.structuredContent?.started === false && r.isError === true, r.structuredContent?.reason);
  }

  const noCfg = await call('startTask', { todoId: '2026-11-09-t1', task: okTask });
  check('startTask without config refuses (no spawn)', noCfg.structuredContent?.started === false, noCfg.structuredContent?.reason);

  // Fake files for listPending / taskStatus / ackTask (no run is ever started).
  const tasks = path.join(stateDir, 'runner', 'tasks');
  fs.mkdirSync(tasks, { recursive: true });
  const upd = '2026-11-09T10:00:00.000+07:00';
  fs.writeFileSync(path.join(tasks, '2026-11-09-t7.in.json'), JSON.stringify({ todoId: '2026-11-09-t7', task: okTask }));
  fs.writeFileSync(path.join(tasks, '2026-11-09-t7.out.json'), JSON.stringify({ todoId: '2026-11-09-t7', round: 1, updatedAt: upd, ai: { status: 'needs_review' } }));
  fs.writeFileSync(path.join(tasks, '2026-11-09-t8.in.json'), JSON.stringify({ todoId: '2026-11-09-t8', task: okTask }));
  fs.writeFileSync(path.join(tasks, 'junk; rm.in.json'), '{}');

  const lp = await call('listPending', {});
  const pend = JSON.parse(lp.content[0].text);
  check('listPending lists fake tasks only', Array.isArray(pend) && pend.map((t) => t.todoId).join(',') === '2026-11-09-t7,2026-11-09-t8', JSON.stringify(pend));
  check('listPending outUpdatedAt', pend[0]?.outUpdatedAt === upd && pend[1]?.outUpdatedAt === null && pend.every((t) => t.running === false));

  const st = await call('taskStatus', { todoId: '2026-11-09-t7' });
  check('taskStatus returns parsed out', st.structuredContent?.running === false && st.structuredContent?.out?.ai?.status === 'needs_review' && Array.isArray(st.structuredContent?.logTail));

  const ackWrong = await call('ackTask', { todoId: '2026-11-09-t7', updatedAt: '2026-11-09T09:00:00.000+07:00' });
  check('ackTask refuses stale updatedAt', ackWrong.structuredContent?.acked === false);
  const ack = await call('ackTask', { todoId: '2026-11-09-t7', updatedAt: upd });
  const doneFiles = fs.existsSync(path.join(tasks, 'done')) ? fs.readdirSync(path.join(tasks, 'done')) : [];
  check('ackTask archives in/out', ack.structuredContent?.acked === true && !fs.existsSync(path.join(tasks, '2026-11-09-t7.out.json')) && doneFiles.length === 2, doneFiles.join(','));
  const ackNoOut = await call('ackTask', { todoId: '2026-11-09-t8', updatedAt: upd });
  check('ackTask without out file refuses', ackNoOut.structuredContent?.acked === false);

  const cancel = await call('cancelTask', { todoId: '2026-11-09-t1' });
  check('cancelTask on idle task', cancel.structuredContent?.cancelled === false);

  const t0 = Date.now();
  const dr = await rpc('tools/call', { name: 'discoverRepos', arguments: {} }, 30000);
  const repos = JSON.parse(dr.result.content[0].text);
  const secs = (Date.now() - t0) / 1000;
  const shapeOk = repos.every((r) => typeof r.path === 'string' && typeof r.myCommits30d === 'number' && Array.isArray(r.projectKeys) && ['scan', 'claude-history'].includes(r.source));
  check('discoverRepos returns an array within 25 s', Array.isArray(repos) && repos.length <= 30 && shapeOk && secs < 25, `${repos.length} repos in ${secs.toFixed(1)} s; top: ${repos.slice(0, 3).map((r) => `${r.name}(${r.myCommits30d},${r.projectKeys.join('/')})`).join(', ')}`);

  const unknown = await rpc('nope/method');
  check('unknown method -> -32601', unknown.error?.code === -32601);

  check('no log files created', !fs.existsSync(path.join(stateDir, 'runner', 'logs')) || fs.readdirSync(path.join(stateDir, 'runner', 'logs')).length === 0);
} catch (e) {
  check('selftest ran', false, e.message);
} finally {
  server.stdin.end();
  server.kill();
  fs.rmSync(stateDir, { recursive: true, force: true });
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
