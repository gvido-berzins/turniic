import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

// Loads KEY=VALUE pairs from .env.local into process.env without overwriting
// values the shell already provided.
function loadDotEnvLocal() {
  const envPath = resolve(ROOT, '.env.local')
  if (!existsSync(envPath)) return
  const contents = readFileSync(envPath, 'utf8')
  for (const line of contents.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadDotEnvLocal()

export function requireEnv(name, fallbackNames = []) {
  for (const candidate of [name, ...fallbackNames]) {
    if (process.env[candidate]) return process.env[candidate]
  }
  throw new Error(
    `Missing required environment variable: ${[name, ...fallbackNames].join(' or ')}\n` +
      `Set it in .env.local or export it in your shell before running this script.`
  )
}

export function getSupabaseUrl() {
  return requireEnv('SUPABASE_URL', ['NEXT_PUBLIC_SUPABASE_URL'])
}

export function getOptionalEnv(name) {
  return process.env[name] || null
}

export const BACKUPS_DIR = resolve(ROOT, 'backups')
export const LOGS_DIR = resolve(ROOT, 'logs')
