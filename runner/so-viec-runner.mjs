#!/usr/bin/env node
// so-viec-runner: a small, zero-dependency stdio MCP server for Sổ việc "Giao AI → Code luôn".
//
// "The page is the bridge": a headless `claude -p` has no ArtifactData, so the page hands the
// runner a snapshot of the todo (DATA only), the runner writes it to <id>.in.json, starts the
// ai-worker in file mode, and the worker writes progress/results to <id>.out.json. The page polls
// taskStatus / listPending, copies results into its own database, then calls ackTask.
//
// Safety model:
// - The prompt, flags, cwd, file paths and allowed tools are built here only. Nothing from the
//   caller (todo snapshot included) is ever put into the prompt or a command line.
// - todoId must match TODO_ID_RE. One run per todoId, at most one run overall.
// - discoverRepos is read-only and returns only repo metadata (never file contents).
// Node >= 18. Protocol: JSON-RPC 2.0 over newline-delimited stdio (MCP).

import { spawn, spawnSync, execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SERVER_NAME = 'so-viec-runner';
const SERVER_VERSION = '0.7.0';
const SUPPORTED_PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const TODO_ID_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]{1,40}$/;
const MAX_TASK_BYTES = 60 * 1024;
const HOME = os.homedir();
const STATE_DIR = process.env.SO_VIEC_STATE_DIR || path.join(HOME, 'Documents', 'daily-digest');
const CONFIG_PATH = path.join(STATE_DIR, 'config.json');
const RUNNER_DIR = path.join(STATE_DIR, 'runner');
const LOG_DIR = path.join(RUNNER_DIR, 'logs');
const TASKS_DIR = path.join(RUNNER_DIR, 'tasks');
const DONE_DIR = path.join(TASKS_DIR, 'done');
const KEEP_DONE = 50;

function defaultAllowedTools() {
  return [
    'Read', 'Edit', 'Write', 'Glob', 'Grep',
    'Bash(git:*)', 'Bash(flutter:*)', 'Bash(dart:*)', 'Bash(yarn:*)', 'Bash(npm:*)', 'Bash(glab:*)', 'Bash(gh:*)',
    // Atomic out-file writes: Write <out>.tmp, then mv it over <out>, inside the tasks dir only.
    `Bash(mv -f ${TASKS_DIR}/:*)`,
    'Skill', 'ToolSearch',
    // Read-only Jira (claude.ai connector name in headless runs) and the GitLab MCP draft MR.
    'mcp__claude_ai_Atlassian__getAccessibleAtlassianResources',
    'mcp__claude_ai_Atlassian__getJiraIssue',
    'mcp__claude_ai_Atlassian__listJiraIssueComments',
    'mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql',
    'mcp__GitLab__create_merge_request',
  ];
}

// ---------- helpers ----------

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function writeJsonAtomic(file, obj) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, file);
}

function readConfig() { return readJson(CONFIG_PATH); }

function isExecutable(p) {
  try { fs.accessSync(p, fs.constants.X_OK); return fs.statSync(p).isFile(); } catch { return false; }
}

function childPath(cfg, claudePath) {
  const parts = [];
  if (claudePath) parts.push(path.dirname(claudePath));
  parts.push(path.dirname(process.execPath));
  const extra = cfg?.runner?.extraPath;
  if (Array.isArray(extra)) for (const p of extra) if (typeof p === 'string' && path.isAbsolute(p)) parts.push(p);
  parts.push(...(process.env.PATH || '').split(':'));
  parts.push('/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin');
  return [...new Set(parts.filter(Boolean))].join(':');
}

function findClaude(cfg) {
  const configured = cfg?.runner?.claudePath;
  if (typeof configured === 'string' && configured && isExecutable(configured)) return configured;
  const which = spawnSync('/bin/sh', ['-c', 'command -v claude'], { encoding: 'utf8', env: { ...process.env, PATH: childPath(cfg) } });
  const found = (which.stdout || '').trim().split('\n')[0];
  if (found && isExecutable(found)) return found;
  const candidates = [path.join(HOME, '.claude', 'local', 'claude'), '/opt/homebrew/bin/claude', '/usr/local/bin/claude'];
  try {
    const nvm = path.join(HOME, '.nvm', 'versions', 'node');
    for (const v of fs.readdirSync(nvm).sort().reverse()) candidates.push(path.join(nvm, v, 'bin', 'claude'));
  } catch { /* no nvm */ }
  return candidates.find(isExecutable) || null;
}

function allowedTools(cfg) {
  const list = cfg?.runner?.allowedTools;
  if (Array.isArray(list) && list.length && list.every((t) => typeof t === 'string' && t.trim())) return list;
  if (typeof list === 'string' && list.trim()) return list.split(',').map((s) => s.trim()).filter(Boolean);
  return defaultAllowedTools();
}

function repoDirs(cfg) {
  const repos = Array.isArray(cfg?.repos) ? cfg.repos : [];
  return [...new Set(repos.filter((r) => r && r.enabled !== false).map((r) => r.path)
    .filter((p) => typeof p === 'string' && path.isAbsolute(p) && fs.existsSync(p)))];
}

const inFile = (id) => path.join(TASKS_DIR, `${id}.in.json`);
const outFile = (id) => path.join(TASKS_DIR, `${id}.out.json`);
const pidFile = (id) => path.join(TASKS_DIR, `${id}.pid.json`);

function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

// Active runs; removes pid files of runs that ended.
function activeRuns() {
  let files = [];
  try { files = fs.readdirSync(TASKS_DIR).filter((f) => f.endsWith('.pid.json')); } catch { return []; }
  const out = [];
  for (const f of files) {
    const full = path.join(TASKS_DIR, f);
    const info = readJson(full);
    if (info && alive(info.pid)) out.push(info);
    else try { fs.unlinkSync(full); } catch { /* ignore */ }
  }
  return out;
}

function runInfo(id) {
  const info = readJson(pidFile(id));
  return info && alive(info.pid) ? info : null;
}

// Last good parse per todo, so a read during a non-atomic write doesn't flicker to null.
const outCache = new Map();
function readOut(id) {
  const out = readJson(outFile(id));
  if (out && typeof out === 'object') { outCache.set(id, out); return out; }
  if (!fs.existsSync(outFile(id))) { outCache.delete(id); return null; }
  return outCache.get(id) ?? null;
}

function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '').replace(/\x1b\][^\x07]*(\x07|\x1b\\)/g, '').replace(/\r/g, '');
}

function tail(file, n = 20) {
  try {
    const st = fs.statSync(file);
    const size = Math.min(st.size, 64 * 1024);
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(size);
    fs.readSync(fd, buf, 0, size, st.size - size);
    fs.closeSync(fd);
    return stripAnsi(buf.toString('utf8')).split('\n').filter((l) => l.trim() !== '').slice(-n);
  } catch { return []; }
}

function latestLog(id) {
  try {
    const logs = fs.readdirSync(LOG_DIR).filter((f) => f.startsWith(`${id}-`) && f.endsWith('.log')).sort();
    return logs.length ? path.join(LOG_DIR, logs[logs.length - 1]) : null;
  } catch { return null; }
}

function checkArgs(args, allowed, required = allowed) {
  if (args === undefined) args = {};
  if (!args || typeof args !== 'object' || Array.isArray(args)) return 'arguments must be an object';
  for (const k of Object.keys(args)) if (!allowed.includes(k)) return `unexpected argument: ${k}`;
  for (const k of required) if (!(k in args)) return `missing argument: ${k}`;
  if ('todoId' in args && (typeof args.todoId !== 'string' || !TODO_ID_RE.test(args.todoId))) return 'invalid todoId';
  return null;
}

// ---------- task tools ----------

function startTask(args) {
  const bad = checkArgs(args, ['todoId', 'task']);
  if (bad) return { started: false, reason: bad, invalid: true };
  const { todoId, task } = args;
  if (!task || typeof task !== 'object' || Array.isArray(task)) return { started: false, reason: 'task must be an object', invalid: true };
  let taskJson;
  try { taskJson = JSON.stringify(task); } catch { return { started: false, reason: 'task is not JSON', invalid: true }; }
  if (Buffer.byteLength(taskJson, 'utf8') > MAX_TASK_BYTES) return { started: false, reason: 'task is larger than 60 KB', invalid: true };
  if (task.id !== undefined && task.id !== todoId) return { started: false, reason: 'task.id does not match todoId', invalid: true };

  const cfg = readConfig();
  if (!cfg) return { started: false, reason: `config not found: ${CONFIG_PATH}` };

  fs.mkdirSync(TASKS_DIR, { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const running = activeRuns();
  if (running.some((r) => r.todoId === todoId)) return { started: false, reason: 'this task is already running' };
  if (running.length >= 1) return { started: false, reason: `another task is running (${running[0].todoId}); try again when it finishes` };

  const claude = findClaude(cfg);
  if (!claude) return { started: false, reason: 'claude binary not found; set runner.claudePath in config.json' };

  const startedAt = new Date().toISOString();
  // The snapshot is data: stored as a file, never put on a command line or in the prompt.
  writeJsonAtomic(inFile(todoId), { todoId, receivedAt: startedAt, task: JSON.parse(taskJson) });

  const prompt = `Run the ai-worker skill in file mode for exactly one task: so-viec#${todoId}. Input: ${inFile(todoId)}. Write progress and results to ${outFile(todoId)}. Do not use ArtifactData.`;
  const argv = ['-p', '--permission-mode', 'acceptEdits', '--allowedTools', allowedTools(cfg).join(',')];
  const dirs = repoDirs(cfg);
  if (dirs.length) argv.push('--add-dir', ...dirs);

  const log = path.join(LOG_DIR, `${todoId}-${startedAt.replace(/[:.]/g, '-')}.log`);
  const fd = fs.openSync(log, 'a');
  fs.writeSync(fd, `# so-viec-runner ${startedAt}\n# ${claude} ${argv.map((a) => JSON.stringify(a)).join(' ')}\n# prompt (stdin): ${prompt}\n\n`);

  const env = { ...process.env, PATH: childPath(cfg, claude) };
  // A nested claude refuses to start inside another Claude Code session; this run is independent.
  for (const k of Object.keys(env)) if (k === 'CLAUDECODE' || k === 'CLAUDE_CODE_ENTRYPOINT' || k.startsWith('CLAUDE_CODE_SSE')) delete env[k];

  let child;
  try {
    child = spawn(claude, argv, { cwd: STATE_DIR, env, detached: true, stdio: ['pipe', fd, fd] });
  } catch (e) {
    fs.closeSync(fd);
    return { started: false, reason: `spawn failed: ${e.message}` };
  }
  fs.closeSync(fd);
  child.on('error', () => { try { fs.unlinkSync(pidFile(todoId)); } catch { /* ignore */ } });
  child.stdin.on('error', () => {});
  child.stdin.end(prompt + '\n');
  child.unref();

  writeJsonAtomic(pidFile(todoId), { todoId, pid: child.pid, startedAt, log });
  return { started: true, pid: child.pid, log };
}

function taskStatus(args) {
  const bad = checkArgs(args, ['todoId']);
  if (bad) return { running: false, reason: bad, invalid: true };
  const { todoId } = args;
  activeRuns();
  const info = readJson(pidFile(todoId));
  const log = info?.log || latestLog(todoId);
  return {
    running: Boolean(info && alive(info.pid)),
    pid: info?.pid ?? null,
    startedAt: info?.startedAt ?? null,
    logTail: log ? tail(log, 20) : [],
    out: readOut(todoId),
  };
}

function cancelTask(args) {
  const bad = checkArgs(args, ['todoId']);
  if (bad) return { cancelled: false, reason: bad, invalid: true };
  const info = readJson(pidFile(args.todoId));
  if (!info || !alive(info.pid)) {
    try { fs.unlinkSync(pidFile(args.todoId)); } catch { /* ignore */ }
    return { cancelled: false, reason: 'not running' };
  }
  try {
    process.kill(-info.pid, 'SIGTERM'); // whole process group (spawned detached)
  } catch {
    try { process.kill(info.pid, 'SIGTERM'); } catch (e) { return { cancelled: false, reason: e.message }; }
  }
  setTimeout(() => { try { process.kill(-info.pid, 'SIGKILL'); } catch { /* gone */ } }, 5000).unref();
  try { fs.unlinkSync(pidFile(args.todoId)); } catch { /* ignore */ }
  try { fs.appendFileSync(info.log, `\n# cancelled ${new Date().toISOString()}\n`); } catch { /* ignore */ }
  return { cancelled: true, pid: info.pid };
}

function listPending(args) {
  const bad = checkArgs(args, []);
  if (bad) return { error: bad, invalid: true };
  activeRuns();
  let files = [];
  try { files = fs.readdirSync(TASKS_DIR); } catch { return []; }
  const ids = new Set();
  for (const f of files) {
    const m = /^(.+)\.(in|out)\.json$/.exec(f);
    if (m && TODO_ID_RE.test(m[1])) ids.add(m[1]);
  }
  return [...ids].sort().map((todoId) => ({
    todoId,
    running: Boolean(runInfo(todoId)),
    outUpdatedAt: readOut(todoId)?.updatedAt ?? null,
  }));
}

function pruneDone() {
  let files = [];
  try { files = fs.readdirSync(DONE_DIR); } catch { return; }
  const stems = [...new Set(files.map((f) => f.replace(/\.(in|out)\.json$/, '')))].sort(); // stem starts with a timestamp
  for (const stem of stems.slice(0, Math.max(0, stems.length - KEEP_DONE))) {
    for (const f of files) if (f.startsWith(`${stem}.`)) try { fs.unlinkSync(path.join(DONE_DIR, f)); } catch { /* ignore */ }
  }
}

function ackTask(args) {
  const bad = checkArgs(args, ['todoId', 'updatedAt']);
  if (bad) return { acked: false, reason: bad, invalid: true };
  const { todoId, updatedAt } = args;
  if (typeof updatedAt !== 'string') return { acked: false, reason: 'updatedAt must be a string', invalid: true };
  if (runInfo(todoId)) return { acked: false, reason: 'still running' };
  const out = readJson(outFile(todoId));
  if (!out || out.updatedAt !== updatedAt) return { acked: false, reason: 'out file changed or missing' };
  fs.mkdirSync(DONE_DIR, { recursive: true });
  const stem = `${new Date().toISOString().replace(/[:.]/g, '-')}-${todoId}`;
  for (const [src, kind] of [[inFile(todoId), 'in'], [outFile(todoId), 'out']]) {
    if (fs.existsSync(src)) fs.renameSync(src, path.join(DONE_DIR, `${stem}.${kind}.json`));
  }
  outCache.delete(todoId);
  pruneDone();
  return { acked: true };
}

// ---------- discoverRepos (read-only) ----------

const SCAN_ROOTS = ['Developer', 'Projects', 'projects', 'code', 'src', 'work', 'Documents', 'repos'];
const SKIP_DIRS = new Set(['node_modules', 'Pods', 'build', '.dart_tool', 'Library', 'DerivedData', 'vendor', 'dist']);
const MAX_DEPTH = 3;
const KEY_RE = /\b([A-Z][A-Z0-9]+)-\d+\b/g;

function isRepo(dir) {
  try { return fs.existsSync(path.join(dir, '.git')); } catch { return false; }
}

function listDirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.isSymbolicLink() && !d.name.startsWith('.') && !SKIP_DIRS.has(d.name))
      .map((d) => path.join(dir, d.name));
  } catch { return []; }
}

function scanRepos(deadline) {
  const found = new Set();
  const walk = (dir, depth) => {
    if (Date.now() > deadline || found.size >= 200) return;
    if (isRepo(dir)) {
      found.add(dir);
      // A repo that is also a workspace of several repos: pick up its direct child repos.
      const kids = listDirs(dir).filter(isRepo);
      if (kids.length >= 2) kids.forEach((k) => found.add(k));
      return;
    }
    if (depth >= MAX_DEPTH) return;
    for (const d of listDirs(dir)) walk(d, depth + 1);
  };
  for (const r of SCAN_ROOTS) {
    const root = path.join(HOME, r);
    try { if (!fs.lstatSync(root).isDirectory()) continue; } catch { continue; }
    walk(root, 0);
  }
  return found;
}

// ~/.claude/projects/<encoded path>: non-alphanumerics were replaced by '-'. Resolve against the disk.
const enc = (s) => s.replace(/[^a-zA-Z0-9]/g, '-');
function decodeProjectDir(name, deadline) {
  const target = enc(name.startsWith('-') ? name : `-${name}`);
  let steps = 0;
  const resolve = (cur, rest) => {
    if (rest === '') return cur;
    if (++steps > 2000 || Date.now() > deadline) return null;
    let entries = [];
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { return null; }
    for (const e of entries) {
      if (!(e.isDirectory() || e.isSymbolicLink())) continue;
      const piece = `-${enc(e.name)}`;
      if (rest.startsWith(piece) && (rest.length === piece.length || rest[piece.length] === '-')) {
        const r = resolve(path.join(cur, e.name), rest.slice(piece.length));
        if (r) return r;
      }
    }
    return null;
  };
  return resolve('/', target);
}

function historyRepos(deadline) {
  const found = new Set();
  let names = [];
  try { names = fs.readdirSync(path.join(HOME, '.claude', 'projects')); } catch { return found; }
  for (const n of names) {
    if (Date.now() > deadline) break;
    const p = decodeProjectDir(n, deadline);
    if (!p || p === HOME || p.includes(`${path.sep}.`) || p.startsWith(path.join(HOME, 'Library'))) continue;
    if (isRepo(p)) found.add(p);
  }
  return found;
}

function git(dir, args, timeout = 3000) {
  return new Promise((resolve) => {
    execFile('git', ['-C', dir, ...args], { timeout, maxBuffer: 2 * 1024 * 1024, encoding: 'utf8' }, (err, stdout) => resolve(err ? null : stdout));
  });
}

async function repoInfo(dir, source, globalEmail) {
  const [remote, last, emailOut, refs, subjects] = await Promise.all([
    git(dir, ['remote', 'get-url', 'origin']),
    git(dir, ['log', '-1', '--format=%cI']),
    git(dir, ['config', 'user.email']),
    git(dir, ['for-each-ref', '--sort=-committerdate', '--count=200', '--format=%(refname:short)', 'refs/heads', 'refs/remotes']),
    git(dir, ['log', '-200', '--all', '--format=%s']),
  ]);
  const email = (emailOut || '').trim() || globalEmail;
  let myCommits30d = 0;
  if (email) {
    const mine = await git(dir, ['log', '--all', '--since=30.days', `--author=${email}`, '--format=%h']);
    myCommits30d = mine ? mine.split('\n').filter(Boolean).length : 0;
  }
  const counts = new Map();
  for (const m of `${refs || ''}\n${subjects || ''}`.matchAll(KEY_RE)) counts.set(m[1], (counts.get(m[1]) || 0) + 1);
  const projectKeys = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  return {
    name: path.basename(dir),
    path: dir,
    remote: (remote || '').trim() || null,
    lastCommitAt: (last || '').trim() || null,
    myCommits30d,
    projectKeys,
    source,
  };
}

async function discoverRepos(args) {
  const bad = checkArgs(args, []);
  if (bad) return { error: bad, invalid: true };
  const start = Date.now();
  const scanned = scanRepos(start + 8000);
  const fromHistory = historyRepos(start + 10000);
  const all = new Map();
  for (const p of scanned) all.set(p, 'scan');
  for (const p of fromHistory) if (!all.has(p)) all.set(p, 'claude-history');

  const globalEmail = ((await git(HOME, ['config', '--global', 'user.email'])) || '').trim();
  const deadline = start + 20000;
  const entries = [...all.entries()].slice(0, 120);
  const results = [];
  let i = 0;
  const worker = async () => {
    while (i < entries.length && Date.now() < deadline) {
      const [p, source] = entries[i++];
      results.push(await repoInfo(p, source, globalEmail));
    }
  };
  await Promise.race([
    Promise.all(Array.from({ length: 6 }, worker)),
    new Promise((r) => setTimeout(r, Math.max(0, deadline - Date.now()) + 2000)),
  ]);
  return results
    .sort((a, b) => (b.myCommits30d - a.myCommits30d) || String(b.lastCommitAt || '').localeCompare(String(a.lastCommitAt || '')))
    .slice(0, 30);
}

// ---------- tool table ----------

const ID = { type: 'string', pattern: TODO_ID_RE.source, description: 'Sổ việc todo id, e.g. 2026-11-09-t3' };
const obj = (properties, required) => ({ type: 'object', properties, required, additionalProperties: false });
// The Claude desktop app asks the viewer before calling tools not marked read-only, so annotate them.
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const WRITE = (idempotentHint) => ({ readOnlyHint: false, destructiveHint: false, idempotentHint, openWorldHint: false });

const TOOLS = [
  {
    name: 'startTask',
    description: 'Start one headless ai-worker run (file mode) for one Sổ việc code task. `task` is the todo snapshot {id,title,ref,url,quote,why,due,priority,ai}, ≤ 60 KB, stored as data only.',
    inputSchema: obj({ todoId: ID, task: { type: 'object' } }, ['todoId', 'task']),
    title: 'Start AI code run',
    annotations: { title: 'Start AI code run', ...WRITE(false) },
    handler: startTask,
  },
  { name: 'taskStatus', description: 'Run state for a todo: running, pid, startedAt, last 20 log lines, and the parsed out file (or null).', inputSchema: obj({ todoId: ID }, ['todoId']), title: 'AI run status', annotations: { title: 'AI run status', ...READ_ONLY }, handler: taskStatus },
  { name: 'cancelTask', description: 'Stop the running ai-worker run for a todo (kills its process group).', inputSchema: obj({ todoId: ID }, ['todoId']), title: 'Stop AI run', annotations: { title: 'Stop AI run', ...WRITE(true) }, handler: cancelTask },
  { name: 'listPending', description: 'Every task with an in/out file not yet acknowledged: [{todoId, running, outUpdatedAt}].', inputSchema: obj({}, []), title: 'List AI runs to sync', annotations: { title: 'List AI runs to sync', ...READ_ONLY }, handler: listPending, wrap: 'tasks' },
  { name: 'ackTask', description: 'After the page copied a result, archive the in/out files if the run ended and out.updatedAt matches.', inputSchema: obj({ todoId: ID, updatedAt: { type: 'string' } }, ['todoId', 'updatedAt']), title: 'Archive synced AI run', annotations: { title: 'Archive synced AI run', ...WRITE(true) }, handler: ackTask },
  { name: 'discoverRepos', description: 'Read-only scan for local git repos (common folders + Claude Code project history): up to 30 {name, path, remote, lastCommitAt, myCommits30d, projectKeys, source}.', inputSchema: obj({}, []), title: 'Find local git repos', annotations: { title: 'Find local git repos', ...READ_ONLY }, handler: discoverRepos, wrap: 'repos' },
];

// ---------- JSON-RPC over stdio ----------

function send(msg) { process.stdout.write(JSON.stringify(msg) + '\n'); }
function reply(id, result) { send({ jsonrpc: '2.0', id, result }); }
function fail(id, code, message) { send({ jsonrpc: '2.0', id, error: { code, message } }); }

async function handle(msg) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    if (msg && msg.id !== undefined) fail(msg.id ?? null, -32600, 'Invalid Request');
    return;
  }
  const { id, method, params } = msg;
  const isNotification = id === undefined;
  switch (method) {
    case 'initialize': {
      const requested = params?.protocolVersion;
      reply(id, {
        protocolVersion: SUPPORTED_PROTOCOLS.includes(requested) ? requested : SUPPORTED_PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        instructions: 'Bridge between the Sổ việc page and a local headless ai-worker run for code tasks. Accepts todo ids and todo snapshots as data; never free-text commands.',
      });
      return;
    }
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return;
    case 'ping':
      if (!isNotification) reply(id, {});
      return;
    case 'tools/list':
      reply(id, { tools: TOOLS.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations })) });
      return;
    case 'tools/call': {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) { fail(id, -32602, `Unknown tool: ${params?.name}`); return; }
      let out;
      try {
        out = await tool.handler(params?.arguments);
      } catch (e) {
        reply(id, { content: [{ type: 'text', text: JSON.stringify({ error: e.message }) }], isError: true });
        return;
      }
      const isError = Boolean(out && !Array.isArray(out) && out.invalid);
      if (out && !Array.isArray(out)) delete out.invalid;
      const structured = Array.isArray(out) ? { [tool.wrap || 'items']: out } : out;
      reply(id, { content: [{ type: 'text', text: JSON.stringify(out) }], structuredContent: structured, isError });
      return;
    }
    default:
      if (!isNotification) fail(id, -32601, `Method not found: ${method}`);
  }
}

// CLI: `node so-viec-runner.mjs --discover-repos` prints the scan as JSON and exits (used by onboarding).
if (process.argv.includes('--discover-repos')) {
  discoverRepos({}).then((r) => { process.stdout.write(JSON.stringify(r, null, 2) + '\n'); process.exit(0); });
} else {
  startServer();
}

function startServer() {
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { fail(null, -32700, 'Parse error'); continue; }
    if (Array.isArray(msg)) msg.forEach((m) => { handle(m); }); else handle(msg);
  }
});
process.stdin.on('end', () => { /* let pending async calls (discoverRepos) finish, then exit */ setTimeout(() => process.exit(0), 100).unref(); });
}
