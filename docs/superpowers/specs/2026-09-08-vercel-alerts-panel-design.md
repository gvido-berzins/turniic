# Vercel Production Alerts — Design

## Purpose

Extend the local ops panel (design: `2026-09-08-backup-panel-design.md`) with a
live view of production errors/warnings, sourced from Vercel's own Runtime
Logs, with **zero changes to the deployed application code**.

## Explicitly accepted limitation

Vercel Runtime Logs only cover server-side execution (API routes, Server
Components, middleware, edge functions). Most of this app's Supabase
reads/writes happen directly in the browser via the client-side Supabase
client, and those calls return `{ error }` objects rather than throwing —
they will **not** appear here. This was a deliberate trade-off (see prior
conversation) in exchange for touching zero application files. A follow-up
project could add client-side error capture later; out of scope here.

## Architecture

No new process — this is added to the same standalone local server
(`scripts/backup-panel.mjs`) described in the backup panel spec, since both
are local-only dev tools sharing one page and one server.

- New optional env vars: `VERCEL_TOKEN` (personal API token from
  https://vercel.com/account/tokens) and `VERCEL_PROJECT_ID` (Vercel
  Dashboard → Project → Settings → General → "Project ID"). No team ID is
  needed (personal account project, confirmed with the user).
- Talks to Vercel's REST API directly via `fetch` — no `vercel` CLI
  dependency, no `vercel link`. Two endpoints, confirmed against Vercel's
  current OpenAPI spec:
  - `GET /v7/deployments?projectId=...&target=production&limit=1` — find the
    current production deployment's `uid`.
  - `GET /v1/projects/{projectId}/deployments/{deploymentId}/runtime-logs` —
    a streamed, newline-delimited JSON log of that deployment. Each line:
    `{ level, message, rowId, source, timestampInMs, domain,
    messageTruncated, requestMethod, requestPath, responseStatusCode }`.
    `level` is one of `debug|error|fatal|info|trace|warning`.
- If `VERCEL_TOKEN`/`VERCEL_PROJECT_ID` are not set, this feature is simply
  inactive (`configured: false`) — the rest of the panel (backups) keeps
  working normally. It never crashes the panel process.

## Poller behavior (`scripts/lib/vercel-alerts.mjs`)

A small state machine, started once when the panel server boots:

1. Fetch the current production deployment ID.
2. Open a streaming connection to its runtime-logs endpoint. Read it
   line-by-line as chunks arrive; keep only `error`/`fatal`/`warning` level
   entries, deduped by `rowId`.
3. Every 60s, independently check the current production deployment ID
   again. If it has changed since step 1 (a new deploy went out), abort the
   open stream — the main loop notices the abort, loops back to step 1, and
   reconnects to the new deployment. This is what makes it survive deploys
   without any manual restart.
4. If the stream errors or the deployment lookup fails (bad token, wrong
   project ID, plan doesn't support this endpoint, network issue), record
   the error message, back off for 5 minutes, then retry. The error is
   surfaced to the UI the whole time it persists — it never fails silently.
5. Keep the most recent 500 matching entries in memory (newest first) and
   append them to a small local NDJSON file (`logs/vercel-alerts.ndjson`, a
   new gitignored local artifact directory alongside `backups/`) so history
   survives a panel restart.

## API endpoint

- `GET /api/alerts` → `{ configured, watching: deploymentIdOrNull, error:
  stringOrNull, entries: [...] }`. The panel page polls this every 5s (plain
  `fetch`, no SSE/websocket — consistent with how the backups list already
  refreshes, and simple enough not to need a new mechanism for a dev tool).

## UI

A new "Production Alerts" section, above the existing "Backups" section on
the same page:

- A one-line status: "Not configured — set VERCEL_TOKEN and
  VERCEL_PROJECT_ID in .env.local to enable", or "Watching production
  deployment `dpl_...`", or the current error message if the poller is
  failing.
- Below that, the list of recent entries, newest first: a colored level
  badge (error/fatal = red, warning = amber — consistent with the app's red
  accent), timestamp, source, request method+path+status code when present,
  and the full message text.
- No "mark as read"/dismiss state — this is a live log view, not a task
  list (YAGNI: the ask was visibility with context, not workflow tracking).

## Testing / verification plan

Same manual-verification approach as the backup panel spec (no automated
test framework exists in this project for scripts):

- With `VERCEL_TOKEN`/`VERCEL_PROJECT_ID` unset: confirm the section shows
  "Not configured" and the rest of the panel still works.
- With a deliberately invalid token: confirm the section shows a clear error
  message (not a silent blank state, not a crashed panel process).
- With valid credentials: confirm the server logs (stdout) which production
  deployment ID it started watching, and `GET /api/alerts` returns
  `configured: true` with that deployment ID.
- Actually forcing a new production deployment mid-session to test the
  reconnect-on-redeploy path is out of scope for this session (that's a real
  deploy, a separate risky action) — the reconnect logic is verified by
  reading the code path, and will be naturally exercised the next time the
  user deploys.
