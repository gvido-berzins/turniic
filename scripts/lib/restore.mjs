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
