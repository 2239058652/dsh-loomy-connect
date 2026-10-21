/**
 * Shared readers for Chromium's LevelDB-backed `localStorage`.
 *
 * Loomy is an Electron app, so its renderer state lives in a LevelDB log under
 * `Local Storage/leveldb`. The log is append-only: a key's older values stay in
 * the file behind newer ones, so callers must expect several records per key
 * and pick the one they want rather than trusting the first hit.
 *
 * @module dsh-loomy-connect/leveldb
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Slice one balanced JSON object starting at `start`.
 *
 * Braces inside strings are skipped, and the scan stops at an unbalanced
 * closing brace so a truncated tail never swallows the record after it.
 */
export function readJsonObject(text: string, start: number): string | undefined {
  if (text[start] !== '{') return undefined
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i += 1) {
    const char = text[i]
    if (char === undefined) break
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') inString = true
    else if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return text.slice(start, i + 1)
      if (depth < 0) return undefined
    }
  }
  return undefined
}

/** Every JSON object stored under `key`, in the order it appears in the log. */
export function extractLevelDbRecords(text: string, key: string): string[] {
  const found: string[] = []
  let index = text.indexOf(key)
  while (index !== -1) {
    const brace = text.indexOf('{', index + key.length)
    if (brace !== -1) {
      const raw = readJsonObject(text, brace)
      if (raw !== undefined) found.push(raw)
    }
    index = text.indexOf(key, index + key.length)
  }
  return found
}

/** The log files Chromium keeps live records in. */
export function levelDbFileNames(entries: readonly string[]): string[] {
  return entries.filter(name => name.endsWith('.log') || name.endsWith('.ldb'))
}

/**
 * Read every log file in `dir`, oldest-first by name. `latin1` keeps every byte
 * so offsets stay honest; the JSON we want is pure ASCII either way.
 */
export async function readLevelDbTexts(dir: string): Promise<string[]> {
  const names = levelDbFileNames(await readdir(dir)).sort()
  const texts: string[] = []
  for (const name of names) texts.push(await readFile(join(dir, name), 'latin1'))
  return texts
}

/**
 * A cheap fingerprint of the directory's contents. Callers memoize on it so a
 * polling reader does not re-scan a multi-megabyte log on every tick.
 */
export async function fingerprintLevelDbDir(dir: string): Promise<string> {
  let fingerprint = dir
  try {
    const info = await stat(dir)
    fingerprint = `${dir}:${info.mtimeMs}:${info.size}`
    for (const name of levelDbFileNames(await readdir(dir))) {
      const file = await stat(join(dir, name))
      fingerprint += `|${name}:${file.mtimeMs}:${file.size}`
    }
  } catch { /* an unreadable dir is its own stable fingerprint */ }
  return fingerprint
}
