/** Shared status transport for every browser surface this plugin contributes. */

import { useCallback, useEffect, useRef, useState } from 'react'
import { LOOMY_STATUS_PATH } from '../status-paths.ts'
import type { LoomyWebStatus } from '../status-paths.ts'
import type { LoomySettingsKey } from './locales.ts'

/** Translation function bound to this plugin's locale namespace. */
export type Translate = (key: LoomySettingsKey, params?: Record<string, unknown>) => string

/** What a card needs to render and refresh the host status document. */
export interface LoomyStatusController {
  status: LoomyWebStatus
  busy: boolean
  /** `true` asks the host to re-pull Loomy's catalog and points cache. */
  refresh: (force?: boolean) => Promise<void>
}

/** Shortest time the refresh control stays visibly busy. */
const MIN_BUSY_MS = 600

/**
 * Poll the host status route.
 *
 * `pollMs` is optional: the compact provider card fetches once and refreshes
 * on demand, while the two full pages keep the account fresh in the background
 * only while the account is signed in.
 */
export function useLoomyStatus(
  t: Translate,
  options: { pollMs?: number } = {},
): LoomyStatusController {
  const { pollMs } = options
  const [status, setStatus] = useState<LoomyWebStatus>({ status: 'signed-out' })
  const [busy, setBusy] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const load = useCallback(async (signal?: AbortSignal, force = false): Promise<void> => {
    try {
      // `force` is the manual button: it makes the host re-pull the catalog
      // and re-read Loomy's points cache instead of answering from memory.
      const response = await fetch(force ? `${LOOMY_STATUS_PATH}?refresh=1` : LOOMY_STATUS_PATH, {
        headers: { accept: 'application/json' },
        credentials: 'same-origin',
        ...signal === undefined ? {} : { signal },
      })
      const value = (await response.json().catch(() => undefined)) as LoomyWebStatus | undefined
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      if (mounted.current && signal?.aborted !== true && value !== undefined) setStatus(value)
    } catch (error) {
      if (mounted.current && signal?.aborted !== true) {
        setStatus({ status: 'error', message: error instanceof Error ? error.message : t('requestFailed') })
      }
    }
  }, [t])

  const refresh = useCallback(async (force = false): Promise<void> => {
    setBusy(true)
    const started = Date.now()
    try {
      await load(undefined, force)
    } finally {
      // A reply fast enough to skip the animation reads as a dead button, so
      // hold the busy state long enough to be seen.
      const elapsed = Date.now() - started
      if (elapsed < MIN_BUSY_MS) await new Promise(resolve => window.setTimeout(resolve, MIN_BUSY_MS - elapsed))
      if (mounted.current) setBusy(false)
    }
  }, [load])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => {
      controller.abort()
    }
  }, [load])

  useEffect(() => {
    if (pollMs === undefined || status.status !== 'signed-in') return
    const controller = new AbortController()
    const timer = window.setInterval(() => {
      void load(controller.signal)
    }, pollMs)
    return () => {
      window.clearInterval(timer)
      controller.abort()
    }
  }, [load, pollMs, status.status])

  return { status, busy, refresh }
}
