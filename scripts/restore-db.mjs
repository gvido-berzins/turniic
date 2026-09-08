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
