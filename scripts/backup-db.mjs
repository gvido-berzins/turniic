#!/usr/bin/env node
// Dumps every row from every app table to a timestamped JSON file under backups/.
// Read-only: works with the anon key since all tables allow public SELECT.
//
// Usage: npm run db:backup

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
