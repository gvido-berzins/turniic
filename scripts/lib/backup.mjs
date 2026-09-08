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
