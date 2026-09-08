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
  teamId: getOptionalEnv('VERCEL_TEAM_ID'),
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
