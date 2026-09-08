# Local Ops Panel (Backups + Vercel Alerts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone local web panel (`npm run backup:panel`) that shows live Vercel production error/warning alerts and lets the developer list/create/preview/restore/delete Supabase backups — without touching any deployed application code.

**Architecture:** One Node `http` server (`scripts/backup-panel.mjs`, no new npm dependency) bound to `127.0.0.1`, serving one HTML page (`scripts/backup-panel.html`) and a small JSON API. Backup/restore logic is extracted out of the existing CLI scripts into `scripts/lib/*.mjs` so the CLI and the panel share one implementation. A new `scripts/lib/vercel-alerts.mjs` polls Vercel's REST API directly (no `vercel` CLI) for runtime logs of the current production deployment.

**Tech Stack:** Plain Node.js (`http`, `fetch`, `fs`), `@supabase/supabase-js` (already a dependency). No test framework exists in this project for scripts (confirmed in both design specs) — verification steps below are manual (`curl`, browser, `node -e`), matching the existing project convention.

**Specs:** `docs/superpowers/specs/2026-09-08-backup-panel-design.md`, `docs/superpowers/specs/2026-09-08-vercel-alerts-panel-design.md`

---

### Task 1: Env helper additions

**Files:**
- Modify: `scripts/lib/env.mjs`

- [ ] **Step 1: Add `getOptionalEnv` and `LOGS_DIR`**

Add to `scripts/lib/env.mjs` (keep everything already in the file — `loadDotEnvLocal`, `requireEnv`, `getSupabaseUrl`, `BACKUPS_DIR`):

```js
export function getOptionalEnv(name) {
  return process.env[name] || null
}

export const LOGS_DIR = resolve(ROOT, 'logs')
```

- [ ] **Step 2: Verify**

Run: `node -e "import('./scripts/lib/env.mjs').then(m => console.log(m.getOptionalEnv('DOES_NOT_EXIST'), m.LOGS_DIR))"`
Expected: prints `null /home/.../turniic/logs` (some absolute path ending in `/logs`), no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/env.mjs
git commit -m "Add getOptionalEnv and LOGS_DIR to scripts env helper

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UJQuNdDLkDyo31qZPZPaiV"
```

---

### Task 2: Extract backup logic into a shared lib

**Files:**
- Create: `scripts/lib/backup.mjs`
- Modify: `scripts/backup-db.mjs`

- [ ] **Step 1: Create `scripts/lib/backup.mjs`**

```js
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { BACKUPS_DIR } from './env.mjs'
import { TABLES_PARENT_FIRST } from './tables.mjs'

const PAGE_SIZE = 1000

async function fetchAllRows(supabase, table) {
  const rows = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`Failed to read "${table}": ${error.message}`)
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}

export async function runBackup({ url, anonKey, onProgress }) {
  const supabase = createClient(url, anonKey)

  const tables = {}
  const counts = {}
  for (const table of TABLES_PARENT_FIRST) {
    const rows = await fetchAllRows(supabase, table)
    tables[table] = rows
    counts[table] = rows.length
    onProgress?.(table, rows.length)
  }

  const isoTimestamp = new Date().toISOString()
  const filenameTimestamp = isoTimestamp.replace(/[:.]/g, '-')
  const backup = { timestamp: isoTimestamp, supabaseUrl: url, tables }

  mkdirSync(BACKUPS_DIR, { recursive: true })
  const file = `backup-${filenameTimestamp}.json`
  const path = resolve(BACKUPS_DIR, file)
  writeFileSync(path, JSON.stringify(backup, null, 2))

  return { path, file, timestamp: isoTimestamp, counts }
}
```

- [ ] **Step 2: Rewrite `scripts/backup-db.mjs` as a thin CLI wrapper**

```js
#!/usr/bin/env node
import { requireEnv, getSupabaseUrl } from './lib/env.mjs'
import { runBackup } from './lib/backup.mjs'

async function main() {
  const url = getSupabaseUrl()
  const anonKey = requireEnv('SUPABASE_ANON_KEY', ['NEXT_PUBLIC_SUPABASE_ANON_KEY'])
  const result = await runBackup({
    url,
    anonKey,
    onProgress: (table, count) => console.log(`Backing up "${table}"... ${count} rows`),
  })
  console.log(`\nBackup written to ${result.path}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
```

- [ ] **Step 3: Verify no regression**

Run: `npm run db:backup`
Expected: same output shape as before (`Backing up "leaderboards"... N rows` for each of the 4 tables, then `Backup written to .../backups/backup-<timestamp>.json`). Confirm the new file's row counts match the previous backup file (they should be identical, since no data changed): `diff <(jq -S . backups/<previous-file>.json) <(jq -S . backups/<newest-file>.json)` should show no differences other than nothing (timestamps aside, the `tables` content should match — the `timestamp`/file name will differ, that's expected).

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/backup.mjs scripts/backup-db.mjs
git commit -m "Extract backup logic into scripts/lib/backup.mjs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UJQuNdDLkDyo31qZPZPaiV"
```

---

### Task 3: Backups directory helpers (list/resolve/summarize/delete)

**Files:**
- Create: `scripts/lib/backups-store.mjs`

- [ ] **Step 1: Create the file**

```js
import { readdirSync, statSync, readFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { BACKUPS_DIR } from './env.mjs'
import { TABLES_PARENT_FIRST } from './tables.mjs'

const FILENAME_PATTERN = /^backup-[0-9A-Za-z-]+\.json$/

function backupsDirExists() {
  try {
    return statSync(BACKUPS_DIR).isDirectory()
  } catch {
    return false
  }
}

export function listBackupFiles() {
  if (!backupsDirExists()) return []
  return readdirSync(BACKUPS_DIR)
    .filter((f) => FILENAME_PATTERN.test(f))
    .sort()
}

export function resolveBackupPath(filename) {
  if (!FILENAME_PATTERN.test(filename)) {
    throw new Error(`Invalid backup filename: ${filename}`)
  }
  return resolve(BACKUPS_DIR, filename)
}

export function getBackupSummary(filename) {
  const path = resolveBackupPath(filename)
  const stats = statSync(path)
  const backup = JSON.parse(readFileSync(path, 'utf8'))
  const counts = {}
  for (const table of TABLES_PARENT_FIRST) {
    counts[table] = backup.tables[table]?.length ?? 0
  }
  return { file: filename, timestamp: backup.timestamp, sizeBytes: stats.size, counts }
}

export function readBackupFile(filename) {
  const path = resolveBackupPath(filename)
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function deleteBackupFile(filename) {
  unlinkSync(resolveBackupPath(filename))
}

export function findLatestBackupFile() {
  const files = listBackupFiles()
  return files.length === 0 ? null : files[files.length - 1]
}
```

- [ ] **Step 2: Verify**

Run: `node -e "import('./scripts/lib/backups-store.mjs').then(m => console.log(m.listBackupFiles(), m.findLatestBackupFile()))"`
Expected: prints the array of existing `backup-*.json` filenames in `backups/`, then the latest one — no errors.

Run: `node -e "import('./scripts/lib/backups-store.mjs').then(m => m.resolveBackupPath('../../etc/passwd')).catch(e => console.log('rejected as expected:', e.message))"`
Expected: `rejected as expected: Invalid backup filename: ../../etc/passwd` (the filename regex has no `/` in its character class, so any path-traversal attempt fails validation before `resolve()` ever runs).

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/backups-store.mjs
git commit -m "Add backups directory helpers (list/resolve/summary/delete)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UJQuNdDLkDyo31qZPZPaiV"
```

---

### Task 4: Extract restore logic into a shared lib

**Files:**
- Create: `scripts/lib/restore.mjs`
- Modify: `scripts/restore-db.mjs`

- [ ] **Step 1: Create `scripts/lib/restore.mjs`**

```js
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { TABLES_PARENT_FIRST, TABLES_CHILD_FIRST } from './tables.mjs'

const CHUNK_SIZE = 500

function chunk(array, size) {
  const chunks = []
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size))
  return chunks
}

export async function runRestore({ url, serviceKey, backupPath, onProgress }) {
  const backup = JSON.parse(readFileSync(backupPath, 'utf8'))
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  for (const table of TABLES_CHILD_FIRST) {
    const { error } = await supabase.from(table).delete().not('id', 'is', null)
    if (error) throw new Error(`Failed to clear "${table}": ${error.message}`)
    onProgress?.('clear', table)
  }

  const counts = {}
  for (const table of TABLES_PARENT_FIRST) {
    const rows = backup.tables[table] ?? []
    for (const batch of chunk(rows, CHUNK_SIZE)) {
      if (batch.length === 0) continue
      const { error } = await supabase.from(table).insert(batch)
      if (error) throw new Error(`Failed to restore "${table}": ${error.message}`)
    }
    counts[table] = rows.length
    onProgress?.('restore', table)
  }

  return { counts, backupTimestamp: backup.timestamp }
}
```

- [ ] **Step 2: Rewrite `scripts/restore-db.mjs` as a thin CLI wrapper**

```js
#!/usr/bin/env node
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase Dashboard ->
// Project Settings -> API -> service_role secret). Never commit it, never
// ship it to the client.
//
// Usage:
//   npm run db:restore -- backups/backup-2026-09-08T12-00-00-000Z.json
//   npm run db:restore                 # uses the most recent file in backups/
//   npm run db:restore -- --yes <file> # skip the confirmation prompt

import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { requireEnv, getSupabaseUrl } from './lib/env.mjs'
import { runRestore } from './lib/restore.mjs'
import { findLatestBackupFile, resolveBackupPath } from './lib/backups-store.mjs'
import { TABLES_PARENT_FIRST } from './lib/tables.mjs'

async function confirm(message) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`${message} Type "yes" to continue: `)
  rl.close()
  return answer.trim().toLowerCase() === 'yes'
}

function resolveLatest() {
  const latest = findLatestBackupFile()
  if (!latest) throw new Error('No backup files found in backups/')
  return resolveBackupPath(latest)
}

async function main() {
  const args = process.argv.slice(2)
  const skipConfirm = args.includes('--yes')
  const fileArg = args.find((a) => !a.startsWith('--'))

  const backupPath = fileArg ? resolve(fileArg) : resolveLatest()
  const backup = JSON.parse(readFileSync(backupPath, 'utf8'))

  console.log(`Restoring from ${backupPath}`)
  console.log(`Backup taken at: ${backup.timestamp}`)
  for (const table of TABLES_PARENT_FIRST) {
    console.log(`  ${table}: ${backup.tables[table]?.length ?? 0} rows`)
  }

  const url = getSupabaseUrl()
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (serviceKey === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY looks like the anon key. Use the service_role secret instead.')
  }

  if (!skipConfirm) {
    const ok = await confirm(
      `\nThis will DELETE ALL ROWS in ${TABLES_PARENT_FIRST.join(', ')} on ${url} and replace them with the backup.`
    )
    if (!ok) {
      console.log('Aborted.')
      return
    }
  }

  await runRestore({
    url,
    serviceKey,
    backupPath,
    onProgress: (phase, table) => {
      if (phase === 'clear') console.log(`Clearing "${table}"... done`)
      if (phase === 'restore') console.log(`Restoring "${table}"... done`)
    },
  })

  console.log('\nRestore complete.')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
```

- [ ] **Step 3: Verify no regression**

Run: `npm run db:backup` (capture a fresh known-good baseline), then `npm run db:restore -- --yes`
Expected: same output shape as the version tested earlier in this session (`Clearing "scores"... done`, ..., `Restoring "leaderboards" (N rows)... done`, ..., `Restore complete.`). Then run `npm run db:backup` again and diff its `tables` against the pre-restore backup exactly like the earlier manual verification in this session (`jq -S .tables` on both files should be identical).

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/restore.mjs scripts/restore-db.mjs
git commit -m "Extract restore logic into scripts/lib/restore.mjs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UJQuNdDLkDyo31qZPZPaiV"
```

---

### Task 5: Vercel alerts poller

**Files:**
- Create: `scripts/lib/vercel-alerts.mjs`

- [ ] **Step 1: Create the file**

```js
import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const VERCEL_API = 'https://api.vercel.com'
const DEPLOYMENT_POLL_INTERVAL_MS = 60_000
const RECONNECT_DELAY_MS = 3_000
const ERROR_BACKOFF_MS = 5 * 60_000
const MAX_BUFFER_ENTRIES = 500
const ALERT_LEVELS = new Set(['error', 'fatal', 'warning'])

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createAlertsPoller({ token, projectId, logFilePath }) {
  const state = {
    configured: Boolean(token && projectId),
    watching: null,
    error: null,
    entries: [], // newest first
  }
  const seenRowIds = new Set()
  let stopped = false
  let currentController = null
  let deploymentCheckTimer = null

  function loadPersistedEntries() {
    if (!existsSync(logFilePath)) return
    const lines = readFileSync(logFilePath, 'utf8').split('\n').filter(Boolean)
    for (const line of lines.slice(-MAX_BUFFER_ENTRIES)) {
      try {
        const entry = JSON.parse(line)
        state.entries.push(entry)
        seenRowIds.add(entry.rowId)
      } catch {
        // ignore malformed lines from a partially-written previous run
      }
    }
    state.entries.reverse()
  }

  function persistEntry(entry) {
    mkdirSync(dirname(logFilePath), { recursive: true })
    appendFileSync(logFilePath, JSON.stringify(entry) + '\n')
  }

  function addEntry(entry) {
    if (seenRowIds.has(entry.rowId)) return
    seenRowIds.add(entry.rowId)
    state.entries.unshift(entry)
    if (state.entries.length > MAX_BUFFER_ENTRIES) state.entries.length = MAX_BUFFER_ENTRIES
    persistEntry(entry)
  }

  async function fetchLatestProductionDeploymentId() {
    const url = `${VERCEL_API}/v7/deployments?projectId=${encodeURIComponent(projectId)}&target=production&limit=1`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`Vercel API error ${res.status}: ${await res.text()}`)
    const body = await res.json()
    const deployment = body.deployments?.[0]
    if (!deployment) throw new Error('No production deployment found for this project')
    return deployment.uid
  }

  async function streamRuntimeLogs(deploymentId, signal) {
    const url = `${VERCEL_API}/v1/projects/${encodeURIComponent(projectId)}/deployments/${encodeURIComponent(deploymentId)}/runtime-logs`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal })
    if (!res.ok) throw new Error(`Vercel runtime-logs error ${res.status}: ${await res.text()}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let newlineIndex
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)
        if (!line) continue
        let entry
        try {
          entry = JSON.parse(line)
        } catch {
          continue
        }
        if (ALERT_LEVELS.has(entry.level)) addEntry(entry)
      }
    }
  }

  async function checkForNewDeployment() {
    try {
      const latest = await fetchLatestProductionDeploymentId()
      if (state.watching && latest !== state.watching) {
        currentController?.abort()
      }
    } catch {
      // transient errors here are ignored; the main loop's own fetch will surface persistent ones
    }
  }

  async function runLoop() {
    while (!stopped) {
      let deploymentId
      try {
        deploymentId = await fetchLatestProductionDeploymentId()
        state.error = null
      } catch (err) {
        state.error = err.message
        state.watching = null
        await sleep(ERROR_BACKOFF_MS)
        continue
      }

      state.watching = deploymentId
      currentController = new AbortController()
      try {
        await streamRuntimeLogs(deploymentId, currentController.signal)
      } catch (err) {
        if (err.name !== 'AbortError') {
          state.error = err.message
          await sleep(ERROR_BACKOFF_MS)
        }
      }
      if (!stopped) await sleep(RECONNECT_DELAY_MS)
    }
  }

  function start() {
    if (!state.configured) return
    loadPersistedEntries()
    runLoop()
    deploymentCheckTimer = setInterval(checkForNewDeployment, DEPLOYMENT_POLL_INTERVAL_MS)
  }

  function stop() {
    stopped = true
    currentController?.abort()
    clearInterval(deploymentCheckTimer)
  }

  function getState() {
    return {
      configured: state.configured,
      watching: state.watching,
      error: state.error,
      entries: state.entries,
    }
  }

  return { start, stop, getState }
}
```

- [ ] **Step 2: Verify unconfigured state doesn't throw**

Run: `node -e "import('./scripts/lib/vercel-alerts.mjs').then(m => { const p = m.createAlertsPoller({ token: null, projectId: null, logFilePath: '/tmp/x.ndjson' }); p.start(); console.log(p.getState()); })"`
Expected: prints `{ configured: false, watching: null, error: null, entries: [] }`, no errors, no hang (process exits — `start()` returns immediately without starting the loop when unconfigured).

- [ ] **Step 3: Verify configured state reaches Vercel (requires real credentials)**

Ask the user for `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` if not already available in `.env.local`, then run:

`node -e "import('./scripts/lib/vercel-alerts.mjs').then(async m => { const p = m.createAlertsPoller({ token: process.env.VERCEL_TOKEN, projectId: process.env.VERCEL_PROJECT_ID, logFilePath: '/tmp/x.ndjson' }); p.start(); await new Promise(r => setTimeout(r, 5000)); console.log(p.getState()); p.stop(); process.exit(0); })" `

(run with `VERCEL_TOKEN=... VERCEL_PROJECT_ID=...` exported, or rely on `.env.local` if a small loader is added — simplest: `set -a; source <(grep -E '^(VERCEL_TOKEN|VERCEL_PROJECT_ID)=' .env.local); set +a; node -e "..."`)

Expected: `configured: true`, `watching: "dpl_..."` (a real deployment ID), `error: null`. If the account/plan doesn't support this endpoint, expect a clear `error` message instead — that's also a valid, correctly-handled outcome (confirms the error path works); note it for the user rather than treating it as a step failure.

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/vercel-alerts.mjs
git commit -m "Add Vercel production runtime-logs poller

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UJQuNdDLkDyo31qZPZPaiV"
```

---

### Task 6: Panel HTML page

**Files:**
- Create: `scripts/backup-panel.html`

- [ ] **Step 1: Create the file**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Turniic — Local Ops Panel</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #ffffff;
    color: #111111;
  }
  header { padding: 1rem 1.5rem; border-bottom: 2px solid #111111; }
  h1 { margin: 0; font-size: 1.25rem; }
  main { padding: 1.5rem; max-width: 900px; margin: 0 auto; }
  section { margin-bottom: 2.5rem; }
  section h2 {
    font-size: 1rem; text-transform: uppercase; letter-spacing: 0.05em;
    border-bottom: 1px solid #ddd; padding-bottom: 0.5rem;
  }
  button {
    background: #c1121f; color: #ffffff; border: none;
    padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem;
  }
  button:disabled { background: #e0a3a8; cursor: not-allowed; }
  button.secondary { background: #111111; }
  .row { border: 1px solid #e2e2e2; border-radius: 6px; padding: 0.75rem 1rem; margin-bottom: 0.5rem; }
  .row-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .meta { color: #555; font-size: 0.85rem; }
  .badge {
    display: inline-block; padding: 0.1rem 0.5rem; border-radius: 999px;
    font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
  }
  .badge.error, .badge.fatal { background: #c1121f; color: #fff; }
  .badge.warning { background: #f2b705; color: #111; }
  .actions { display: flex; gap: 0.5rem; }
  .preview { margin-top: 0.75rem; font-size: 0.85rem; background: #fafafa; border-radius: 4px; padding: 0.75rem; max-height: 300px; overflow: auto; }
  .restore-confirm { margin-top: 0.75rem; display: flex; gap: 0.5rem; align-items: center; }
  .restore-confirm input { border: 1px solid #ccc; border-radius: 4px; padding: 0.4rem; }
  #error-banner { background: #c1121f; color: #fff; padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; }
  #error-banner[hidden] { display: none; }
  .empty { color: #888; font-size: 0.9rem; }
  .alert-message { white-space: pre-wrap; word-break: break-word; }
</style>
</head>
<body>
<header><h1>Turniic — Local Ops Panel</h1></header>
<main>
  <div id="error-banner" hidden></div>

  <section id="alerts-section">
    <h2>Production Alerts</h2>
    <div id="alerts-status" class="meta"></div>
    <div id="alerts-list"></div>
  </section>

  <section id="backups-section">
    <div class="row-header">
      <h2 style="border:none;margin:0;">Backups</h2>
      <button id="backup-now">Backup now</button>
    </div>
    <div id="backups-list"></div>
  </section>
</main>

<script>
// All dynamic, non-enum text inserted into innerHTML below (log messages,
// request paths, backup row counts, JSON previews) goes through escapeHtml()
// first. The only unescaped interpolations are values this code itself
// already constrains to a small fixed set before they reach here: log
// `level` (checked against ALERT_LEVELS in vercel-alerts.mjs before it's
// ever stored) and backup `file` names (checked against a strict filename
// regex in backups-store.mjs before the server will read/return them).

function showError(message) {
  const banner = document.getElementById('error-banner')
  banner.textContent = message
  banner.hidden = false
}

function clearError() {
  document.getElementById('error-banner').hidden = true
}

function fmtTime(isoOrMs) {
  return new Date(isoOrMs).toLocaleString()
}

function fmtBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str || ''
  return div.innerHTML
}

// ---------- Alerts ----------

async function loadAlerts() {
  try {
    const res = await fetch('/api/alerts')
    renderAlerts(await res.json())
  } catch (err) {
    document.getElementById('alerts-status').textContent = 'Failed to reach panel server: ' + err.message
  }
}

function renderAlerts(state) {
  const statusEl = document.getElementById('alerts-status')
  const listEl = document.getElementById('alerts-list')

  if (!state.configured) {
    statusEl.textContent = 'Not configured — set VERCEL_TOKEN and VERCEL_PROJECT_ID in .env.local to enable.'
    listEl.innerHTML = ''
    return
  }

  if (state.error) statusEl.textContent = 'Error: ' + state.error
  else if (state.watching) statusEl.textContent = 'Watching production deployment ' + state.watching
  else statusEl.textContent = 'Connecting…'

  if (state.entries.length === 0) {
    listEl.innerHTML = '<p class="empty">No errors or warnings seen yet.</p>'
    return
  }

  listEl.innerHTML = state.entries.map(function (entry) {
    const path = entry.requestPath ? (entry.requestMethod || '') + ' ' + entry.requestPath : ''
    const status = entry.responseStatusCode ? ' (' + entry.responseStatusCode + ')' : ''
    return '<div class="row">' +
      '<div class="row-header">' +
        '<span class="badge ' + entry.level + '">' + entry.level + '</span>' +
        '<span class="meta">' + fmtTime(entry.timestampInMs) + ' · ' + escapeHtml(entry.source || '') + '</span>' +
      '</div>' +
      (path ? '<div class="meta">' + escapeHtml(path + status) + '</div>' : '') +
      '<div class="alert-message">' + escapeHtml(entry.message) + '</div>' +
    '</div>'
  }).join('')
}

// ---------- Backups ----------

async function loadBackups() {
  try {
    const res = await fetch('/api/backups')
    renderBackups(await res.json())
    clearError()
  } catch (err) {
    showError('Failed to load backups: ' + err.message)
  }
}

function renderBackups(backups) {
  const listEl = document.getElementById('backups-list')
  if (backups.length === 0) {
    listEl.innerHTML = '<p class="empty">No backups yet.</p>'
    return
  }
  listEl.innerHTML = backups.map(function (b) {
    const countsText = Object.entries(b.counts).map(function (e) { return e[0] + ': ' + e[1] }).join(' · ')
    return '<div class="row" data-file="' + b.file + '">' +
      '<div class="row-header">' +
        '<div>' +
          '<div>' + fmtTime(b.timestamp) + '</div>' +
          '<div class="meta">' + escapeHtml(countsText) + ' · ' + fmtBytes(b.sizeBytes) + '</div>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="secondary" onclick="togglePreview(\'' + b.file + '\')">Preview</button>' +
          '<button class="secondary" onclick="showRestoreConfirm(\'' + b.file + '\')">Restore</button>' +
          '<button onclick="doDelete(\'' + b.file + '\')">Delete</button>' +
        '</div>' +
      '</div>' +
      '<div class="preview" id="preview-' + b.file + '" hidden></div>' +
      '<div class="restore-confirm" id="restore-' + b.file + '" hidden>' +
        '<input type="text" placeholder="Type RESTORE to confirm" id="confirm-input-' + b.file + '" oninput="onConfirmInput(\'' + b.file + '\')" />' +
        '<button id="confirm-btn-' + b.file + '" disabled onclick="doRestore(\'' + b.file + '\')">Confirm restore</button>' +
      '</div>' +
    '</div>'
  }).join('')
}

async function togglePreview(file) {
  const el = document.getElementById('preview-' + file)
  if (!el.hidden) { el.hidden = true; return }
  el.hidden = false
  el.textContent = 'Loading…'
  try {
    const res = await fetch('/api/backups/' + encodeURIComponent(file))
    const backup = await res.json()
    el.innerHTML = Object.entries(backup.tables).map(function (e) {
      return '<strong>' + e[0] + ' (' + e[1].length + ')</strong><pre>' + escapeHtml(JSON.stringify(e[1], null, 2)) + '</pre>'
    }).join('')
  } catch (err) {
    el.textContent = 'Failed to load preview: ' + err.message
  }
}

function showRestoreConfirm(file) {
  const el = document.getElementById('restore-' + file)
  el.hidden = !el.hidden
}

function onConfirmInput(file) {
  document.getElementById('confirm-btn-' + file).disabled =
    document.getElementById('confirm-input-' + file).value !== 'RESTORE'
}

async function doRestore(file) {
  const btn = document.getElementById('confirm-btn-' + file)
  btn.disabled = true
  btn.textContent = 'Restoring…'
  try {
    const res = await fetch('/api/backups/' + encodeURIComponent(file) + '/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'RESTORE' }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Restore failed')
    clearError()
    alert('Restore complete.')
    document.getElementById('restore-' + file).hidden = true
  } catch (err) {
    showError('Restore failed: ' + err.message)
  } finally {
    btn.textContent = 'Confirm restore'
  }
}

async function doDelete(file) {
  if (!confirm('Delete backup ' + file + '? This only removes the local backup file, not live data.')) return
  try {
    const res = await fetch('/api/backups/' + encodeURIComponent(file), { method: 'DELETE' })
    if (!res.ok) throw new Error((await res.json()).error || 'Delete failed')
    loadBackups()
  } catch (err) {
    showError('Delete failed: ' + err.message)
  }
}

document.getElementById('backup-now').addEventListener('click', async function () {
  const btn = document.getElementById('backup-now')
  btn.disabled = true
  btn.textContent = 'Backing up…'
  try {
    await fetch('/api/backups', { method: 'POST' })
    await loadBackups()
    clearError()
  } catch (err) {
    showError('Backup failed: ' + err.message)
  } finally {
    btn.disabled = false
    btn.textContent = 'Backup now'
  }
})

loadAlerts()
loadBackups()
setInterval(loadAlerts, 5000)
</script>
</body>
</html>
```

- [ ] **Step 2: Verify it's well-formed**

Run: `node -e "require('node:fs').readFileSync('scripts/backup-panel.html', 'utf8').includes('</html>') || process.exit(1)"`
Expected: no output, exit code 0 (sanity check the file is complete; full behavior is verified once the server exists in Task 7).

- [ ] **Step 3: Commit**

```bash
git add scripts/backup-panel.html
git commit -m "Add local ops panel HTML page (alerts + backups UI)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UJQuNdDLkDyo31qZPZPaiV"
```

---

### Task 7: Panel server, wiring, and docs

**Files:**
- Create: `scripts/backup-panel.mjs`
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `.env.local.example`
- Modify: `README.md`

- [ ] **Step 1: Create `scripts/backup-panel.mjs`**

```js
#!/usr/bin/env node
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireEnv, getOptionalEnv, getSupabaseUrl, LOGS_DIR } from './lib/env.mjs'
import { runBackup } from './lib/backup.mjs'
import { runRestore } from './lib/restore.mjs'
import {
  listBackupFiles,
  getBackupSummary,
  readBackupFile,
  resolveBackupPath,
  deleteBackupFile,
} from './lib/backups-store.mjs'
import { createAlertsPoller } from './lib/vercel-alerts.mjs'

const HOST = '127.0.0.1'
const PORT = Number(process.env.PORT) || 4545
const ROOT = dirname(fileURLToPath(import.meta.url))
const HTML_PATH = resolve(ROOT, 'backup-panel.html')

const supabaseUrl = getSupabaseUrl()
const anonKey = requireEnv('SUPABASE_ANON_KEY', ['NEXT_PUBLIC_SUPABASE_ANON_KEY'])
const serviceKey = getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY')

const alertsPoller = createAlertsPoller({
  token: getOptionalEnv('VERCEL_TOKEN'),
  projectId: getOptionalEnv('VERCEL_PROJECT_ID'),
  logFilePath: resolve(LOGS_DIR, 'vercel-alerts.ndjson'),
})
alertsPoller.start()

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) })
  res.end(payload)
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(readFileSync(HTML_PATH, 'utf8'))
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/alerts') {
      sendJson(res, 200, alertsPoller.getState())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/backups') {
      sendJson(res, 200, listBackupFiles().map(getBackupSummary).reverse())
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/backups') {
      const result = await runBackup({ url: supabaseUrl, anonKey, onProgress: () => {} })
      sendJson(res, 200, getBackupSummary(result.file))
      return
    }

    const restoreMatch = url.pathname.match(/^\/api\/backups\/([^/]+)\/restore$/)
    if (req.method === 'POST' && restoreMatch) {
      const filename = decodeURIComponent(restoreMatch[1])
      const body = await readJsonBody(req)
      if (body.confirm !== 'RESTORE') {
        sendJson(res, 400, { error: 'Confirmation text must be exactly "RESTORE"' })
        return
      }
      if (!serviceKey) {
        sendJson(res, 400, { error: 'SUPABASE_SERVICE_ROLE_KEY is not set in .env.local' })
        return
      }
      const backupPath = resolveBackupPath(filename)
      const result = await runRestore({ url: supabaseUrl, serviceKey, backupPath, onProgress: () => {} })
      sendJson(res, 200, result)
      return
    }

    const fileMatch = url.pathname.match(/^\/api\/backups\/([^/]+)$/)
    if (fileMatch) {
      const filename = decodeURIComponent(fileMatch[1])
      if (req.method === 'GET') {
        sendJson(res, 200, readBackupFile(filename))
        return
      }
      if (req.method === 'DELETE') {
        deleteBackupFile(filename)
        sendJson(res, 200, { ok: true })
        return
      }
    }

    sendJson(res, 404, { error: 'Not found' })
  } catch (err) {
    sendJson(res, 500, { error: err.message })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`Backup panel running at http://${HOST}:${PORT}`)
  console.log(alertsPoller.getState().configured
    ? 'Vercel alerts: configured, connecting…'
    : 'Vercel alerts: not configured (set VERCEL_TOKEN and VERCEL_PROJECT_ID in .env.local to enable)')
})
```

- [ ] **Step 2: Add the npm script**

In `package.json`, in the `"scripts"` block (alongside the existing `db:backup`/`db:restore`):

```json
    "backup:panel": "node scripts/backup-panel.mjs",
```

- [ ] **Step 3: Ignore the new local logs directory**

In `.gitignore`, next to the existing `/backups/` entry:

```
# local alerts log (dev-only artifact)
/logs/
```

- [ ] **Step 4: Document the new optional env vars in `.env.local.example`**

Add to `.env.local.example` (keep the existing two lines):

```
# Required for scripts/restore-db.mjs and the restore button in the local
# ops panel (npm run backup:panel). Get it from Supabase Dashboard ->
# Project Settings -> API -> service_role secret. Never expose this to the
# client / commit it — it bypasses Row Level Security entirely.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret

# Optional: only needed to enable the "Production Alerts" section of the
# local ops panel (npm run backup:panel). VERCEL_TOKEN is a personal API
# token from https://vercel.com/account/tokens. VERCEL_PROJECT_ID is from
# Vercel Dashboard -> Project -> Settings -> General -> "Project ID".
VERCEL_TOKEN=
VERCEL_PROJECT_ID=
```

- [ ] **Step 5: Document the tool in `README.md`**

Add a new section near the end of `README.md` (after the existing "Usage" section):

```markdown
## Local Ops Panel

A local-only dev tool (never deployed) for managing Supabase backups and
watching production errors, without needing any auth setup:

npm run backup:panel

Then open http://127.0.0.1:4545. It shows:
- **Production Alerts** — a live tail of Vercel Runtime Log entries at
  error/fatal/warning level for the current production deployment.
  Requires VERCEL_TOKEN (personal token from
  https://vercel.com/account/tokens) and VERCEL_PROJECT_ID (Vercel
  Dashboard -> Project -> Settings -> General) in .env.local. Only sees
  server-side errors (API routes, Server Components, middleware) -- most of
  this app's Supabase calls happen client-side and won't appear here.
- **Backups** — create/preview/restore/delete JSON backups of all 4 tables.
  Restoring requires SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase
  Dashboard -> Project Settings -> API -> service_role secret) and wipes +
  replaces all table data, so it asks you to type RESTORE to confirm.

You can also run backup/restore from the CLI directly:

npm run db:backup                # writes backups/backup-<timestamp>.json
npm run db:restore                # restores from the most recent backup file
npm run db:restore -- <file>      # restores from a specific backup file
```

- [ ] **Step 6: Verify end-to-end (manual, in a real browser)**

1. Run: `npm run backup:panel`
   Expected stdout: `Backup panel running at http://127.0.0.1:4545` and either `Vercel alerts: configured, connecting…` or the "not configured" line, depending on whether `VERCEL_TOKEN`/`VERCEL_PROJECT_ID` are set in `.env.local`.
2. Open `http://127.0.0.1:4545` in a browser.
3. Confirm the "Production Alerts" section shows the expected status line (not configured, connecting, watching a deployment ID, or a clear error — whichever matches your current `.env.local`).
4. In "Backups", confirm the existing backup files are listed with correct row counts (compare to `ls backups/` and the counts already verified earlier in this session: 1 leaderboard, 22 participants, 8 rounds, 176 scores).
5. Click **Backup now** — confirm a new row appears at the top of the list with today's timestamp and the same counts.
6. Click **Preview** on that new row — confirm it shows the actual participant/round/score rows, not just counts.
7. Click **Restore**, confirm the "Confirm restore" button stays disabled until you type exactly `RESTORE` in the field, then confirm it — confirm a success alert appears and the tables are unchanged (counts still match, since this restores from a backup taken seconds earlier from the same live data).
8. Click **Delete** on a test backup you created during this verification (not the ones from earlier in the session) — confirm a browser confirm dialog appears, and after accepting, the file disappears from both the list and `ls backups/`.
9. Stop the server (Ctrl+C in the terminal running `npm run backup:panel`).

- [ ] **Step 7: Commit**

```bash
git add scripts/backup-panel.mjs package.json .gitignore .env.local.example README.md
git commit -m "Add local ops panel server: Vercel alerts + backup management

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UJQuNdDLkDyo31qZPZPaiV"
```
