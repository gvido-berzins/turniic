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
