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

export function createAlertsPoller({ token, projectId, teamId, logFilePath }) {
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

  function teamQueryParam() {
    return teamId ? `&teamId=${encodeURIComponent(teamId)}` : ''
  }

  async function fetchLatestProductionDeploymentId() {
    const url = `${VERCEL_API}/v7/deployments?projectId=${encodeURIComponent(projectId)}&target=production&limit=1${teamQueryParam()}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`Vercel API error ${res.status}: ${await res.text()}`)
    const body = await res.json()
    const deployment = body.deployments?.[0]
    if (!deployment) throw new Error('No production deployment found for this project')
    return deployment.uid
  }

  async function streamRuntimeLogs(deploymentId, signal) {
    const url = `${VERCEL_API}/v1/projects/${encodeURIComponent(projectId)}/deployments/${encodeURIComponent(deploymentId)}/runtime-logs${teamId ? `?teamId=${encodeURIComponent(teamId)}` : ''}`
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
