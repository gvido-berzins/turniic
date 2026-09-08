# Local Backup Panel — Design

## Purpose

Give the developer a local, browser-based panel to manage the JSON backups
produced by `scripts/backup-db.mjs` (list, create, preview, restore, delete),
without needing to remember CLI flags or hand-edit `.env.local` each time.

This is a **dev-only tool**. It must never ship as part of the deployed
Next.js app, because it needs the Supabase `service_role` key to perform
restores/deletes, and that key must never reach the browser bundle that gets
deployed to Vercel.

## Non-goals

- No authentication/access control beyond binding to localhost — this tool
  is only ever run on the developer's own machine.
- No scheduling/automated backups — creation stays manual, triggered from the
  panel or the existing `npm run db:backup`.
- No pagination/streaming for large datasets — current data volume (dozens
  of participants, hundreds of scores) is small enough to load and render in
  full.

## Architecture

A standalone Node process, entirely separate from the Next.js app:

- Entry point: `scripts/backup-panel.mjs`, run via `npm run backup:panel`.
- Uses Node's built-in `http` module — no new dependency (Express, etc.) is
  needed for a handful of routes.
- Binds explicitly to `127.0.0.1` (never `0.0.0.0`), on port `4545` by
  default, overridable with `PORT=<n> npm run backup:panel`.
- Reads Supabase credentials the same way the existing CLI scripts do — via
  `scripts/lib/env.mjs`, which loads `.env.local` if present. Requires
  `SUPABASE_SERVICE_ROLE_KEY` to be set (same as `restore-db.mjs` today) for
  restore/delete; backup/list/preview only need the anon key.
- Serves one static HTML page (inlined string or a small `.html` file read
  from disk) plus a small JSON API. No client-side build step, no framework —
  vanilla JS `fetch()` calls from inline `<script>`.

## Refactor: shared backup/restore logic

Today `backup-db.mjs` and `restore-db.mjs` contain their logic inline. To
avoid duplicating it for the panel, extract the actual work into:

- `scripts/lib/backup.mjs` — exports `runBackup(supabaseUrl, anonKey) ->
  { path, timestamp, counts }`. Contains the per-table pagination/fetch loop
  and file-write, extracted verbatim from `backup-db.mjs`.
- `scripts/lib/restore.mjs` — exports `runRestore(supabaseUrl, serviceKey,
  backupFilePath) -> { counts }`. Contains the delete-then-insert loop,
  extracted verbatim from `restore-db.mjs`.

`backup-db.mjs` and `restore-db.mjs` become thin CLI wrappers: parse
args/env, call the shared function, print progress to stdout, keep their
existing interactive "type yes" confirmation for the CLI path. The panel
server imports the same two functions directly (no shelling out to the CLI
scripts) and drives its own confirmation via the browser UI instead.

Behavior of the existing `npm run db:backup` / `npm run db:restore` commands
does not change.

## API endpoints

All under the one panel server, JSON in/out except where noted:

- `GET /` — the HTML panel page.
- `GET /api/backups` — list backup files in `backups/`, newest first. Each
  entry: `{ file, timestamp, sizeBytes, counts: { leaderboards, participants,
  rounds, scores } }`. Counts come from reading each file's JSON (small
  enough to do on every list call, no caching needed).
- `GET /api/backups/:file` — full contents of one backup file (for preview),
  same shape as the backup JSON itself.
- `POST /api/backups` — run a fresh backup now (calls `runBackup`). Returns
  the new entry in the same shape as the list endpoint.
- `POST /api/backups/:file/restore` — wipes all 4 tables and restores from
  the given file (calls `runRestore`). Body: `{ confirm: "RESTORE" }` — the
  server rejects with 400 if `confirm !== "RESTORE"`, as a server-side
  backstop behind the UI's own confirmation gate.
- `DELETE /api/backups/:file` — deletes the backup file from disk.

`:file` is validated against the existing `backup-<ISO-with-dashes>.json`
naming pattern and resolved only inside `BACKUPS_DIR`, rejecting any path
that would escape it (defense against path traversal via the URL segment).

## UI

Single page, matching the app's white/black/red palette:

- Header with a "Backup now" button (calls `POST /api/backups`, then
  refreshes the list).
- List of backups, newest first: timestamp (human-readable), file size, row
  counts per table.
- Each row expandable ("Preview") to show the actual rows grouped by table
  (participants by name, rounds by name/number, scores, leaderboards) —
  fetched from `GET /api/backups/:file` on expand, not preloaded.
- Each row has "Restore" and "Delete" buttons.
  - **Restore**: opens an inline confirmation with a text input; the
    "Confirm restore" button stays disabled until the input's value is
    exactly `RESTORE`. On confirm, calls the restore endpoint with that
    value, shows a spinner/progress state, then a success or error banner.
  - **Delete**: a plain `confirm()` browser dialog is sufficient (reversible
    in the sense that it only removes a local backup copy, not live data),
    then calls the delete endpoint and removes the row from the list.
- Any API error (Supabase error, file error, etc.) surfaces as a visible red
  error banner at the top of the page with the raw error message. The server
  process itself never crashes on a request error — errors are caught per
  request and returned as JSON `{ error: message }` with a non-200 status.

## Data flow (restore example)

1. User clicks Restore on a backup row → inline confirm UI appears.
2. User types `RESTORE`, clicks Confirm.
3. Browser `POST /api/backups/<file>/restore` with `{ confirm: "RESTORE" }`.
4. Server validates the confirm string, resolves `<file>` safely inside
   `BACKUPS_DIR`, calls `runRestore(url, serviceKey, filePath)`.
5. `runRestore` deletes rows child-first (`scores`, `rounds`, `participants`,
   `leaderboards`), then inserts rows parent-first from the backup, in
   chunks — identical logic to today's `restore-db.mjs`.
6. Server returns `{ counts }` on success, or `{ error }` with a 500 on
   failure (e.g. Supabase error mid-way) — the UI shows exactly what
   succeeded/failed via the error banner; no automatic rollback (matches
   today's CLI script's behavior).
7. UI shows a success banner and re-fetches the backup list.

## Testing / verification plan

- Manual: start the panel, confirm it only binds to localhost (`curl` from
  the loopback address works; the page loads in a browser).
- Manual: create a backup from the panel, confirm the file appears in
  `backups/` and matches what `npm run db:backup` would produce.
- Manual: preview a backup, confirm row counts and a couple of sample rows
  match the file's raw JSON.
- Manual: restore from a backup via the panel (against the live dev
  Supabase project, same as the CLI test already done in this session),
  confirm the "type RESTORE" gate blocks the button until typed correctly,
  and confirm resulting table contents match the source backup.
- Manual: delete a backup file via the panel, confirm it's removed from disk
  and from the list.
- No automated test suite exists in this project for scripts; this stays
  consistent with that (the existing CLI backup/restore scripts also have no
  automated tests).
