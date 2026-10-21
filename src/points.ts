/**
 * Read Loomy's own points summary straight off disk.
 *
 * Loomy is an Electron app whose renderer keeps the account's points summary in
 * `localStorage` under the key `loomy-points-summary`, shaped
 * `{ balance, dailyBalance, updatedAt, … }`. Loomy's own sidebar reads that
 * cache to render 永久积分 / 每日赠送积分, so the numbers the card shows are
 * the same numbers the user sees in the app.
 *
 * There is no documented HTTP endpoint for this: the model gateway at
 * `loomyad.xunfei.cn` answers 404 for `/v1/credits`, and the points calls the
 * renderer makes go through `window.electronAPI.points.*` IPC, which only the
 * running app can serve. Reading the cache is therefore the only external way
 * to get these numbers, and it is read-only.
 *
 * Chromium's `localStorage` lives in a LevelDB log, which is append-only: a
 * key's old values stay in the file behind newer ones. We parse every candidate
 * record and keep the newest by `updatedAt` rather than trusting file order.
 *
 * @module dsh-loomy-connect/points
 */

import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { extractLevelDbRecords, fingerprintLevelDbDir, readLevelDbTexts } from './leveldb.ts'

/** The localStorage key Loomy's renderer writes the points summary to. */
export const LOOMY_POINTS_KEY = 'loomy-points-summary'

/**
 * Candidate locations of Loomy's Electron `Local Storage/leveldb` cache,
 * most-likely platform first. Loomy is an Electron app, so its data dir
 * follows the platform convention: macOS `~/Library/Application Support/loomy`,
 * Windows `%APPDATA%/loomy`. Searching every candidate keeps the points card
 * working on whichever of the two Loomy was installed on.
 */
export function defaultLoomyLocalStorageCandidates(): string[] {
  const appData = process.env.APPDATA
  const candidates = [join(homedir(), 'Library', 'Application Support', 'loomy', 'Local Storage', 'leveldb')]
  if (appData !== undefined) candidates.push(join(appData, 'loomy', 'Local Storage', 'leveldb'))
  return candidates
}

/** The first existing localStorage dir, or the primary platform default when none yet. */
export function defaultLoomyLocalStorageDir(): string {
  for (const candidate of defaultLoomyLocalStorageCandidates()) {
    if (existsSync(candidate)) return candidate
  }
  return defaultLoomyLocalStorageCandidates()[0]
}

/** One account's points split the way Loomy's own UI presents it. */
export interface LoomyPointsSummary {
  /** Long-lived points — Loomy labels these 永久积分. */
  permanent: number
  /** Points refilled each sign-in day — Loomy labels these 每日赠送积分. */
  daily: number
  /** ISO timestamp of the last time Loomy refreshed the summary. */
  updatedAt?: string
}

/** Parse one cached record, keeping only the fields the card renders. */
export function parseLoomyPointsRecord(raw: string): LoomyPointsSummary | undefined {
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
    const record = value as Record<string, unknown>
    const permanent = Number(record.balance)
    const daily = Number(record.dailyBalance)
    if (!Number.isFinite(permanent) && !Number.isFinite(daily)) return undefined
    const updatedAt = typeof record.updatedAt === 'string' ? record.updatedAt : undefined
    return {
      permanent: Number.isFinite(permanent) ? permanent : 0,
      daily: Number.isFinite(daily) ? daily : 0,
      ...updatedAt === undefined ? {} : { updatedAt },
    }
  } catch { return undefined }
}

/** Every cached summary in one LevelDB log, oldest first. */
export function extractLoomyPoints(text: string): LoomyPointsSummary[] {
  const found: LoomyPointsSummary[] = []
  for (const raw of extractLevelDbRecords(text, LOOMY_POINTS_KEY)) {
    const parsed = parseLoomyPointsRecord(raw)
    if (parsed !== undefined) found.push(parsed)
  }
  return found
}

/** Newest record wins; `updatedAt` decides, file order breaks ties. */
export function newestLoomyPoints(records: readonly LoomyPointsSummary[]): LoomyPointsSummary | undefined {
  let best: LoomyPointsSummary | undefined
  for (const record of records) {
    if (best === undefined) { best = record; continue }
    const bestTime = best.updatedAt === undefined ? -Infinity : Date.parse(best.updatedAt)
    const time = record.updatedAt === undefined ? -Infinity : Date.parse(record.updatedAt)
    if (time >= bestTime) best = record
  }
  return best
}

interface CacheEntry { key: string; value: LoomyPointsSummary | undefined }

/**
 * Memoize on the directory's mtime/size so a polling card does not re-read a
 * multi-megabyte log on every tick.
 */
let cache: CacheEntry | undefined

/**
 * Read the account's points summary from Loomy's localStorage.
 *
 * Returns `undefined` when Loomy has never cached a summary (or is not
 * installed) so the card can degrade instead of showing a bogus zero.
 */
export async function readLoomyPoints(dir?: string): Promise<LoomyPointsSummary | undefined> {
  const path = dir ?? process.env.LOOMY_LOCAL_STORAGE_DIR ?? defaultLoomyLocalStorageDir()
  const fingerprint = await fingerprintLevelDbDir(path)
  if (cache !== undefined && cache.key === fingerprint) return cache.value
  const records: LoomyPointsSummary[] = []
  try {
    for (const text of await readLevelDbTexts(path)) records.push(...extractLoomyPoints(text))
  } catch {
    cache = { key: fingerprint, value: undefined }
    return undefined
  }
  const value = newestLoomyPoints(records)
  cache = { key: fingerprint, value }
  return value
}

/** Drop the memoized read; tests and the status route use this. */
export function resetLoomyPointsCache(): void {
  cache = undefined
}
