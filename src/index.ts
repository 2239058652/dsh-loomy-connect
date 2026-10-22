/** DSH provider registration for the models included in the Loomy desktop app. */
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-settings'
import { LoomyCatalog } from './catalog.ts'
import { createLoomyAdapter, LOOMY_PROVIDER } from './adapter.ts'
import { readLoomyCredential } from './auth.ts'
import { LOOMY_ENTRY_ID } from './entry-id.ts'
import { createLoomyShim } from './shim.ts'
import { readLoomyPoints, resetLoomyPointsCache } from './points.ts'
import { registerLoomyStatusRoute } from './web-status.ts'

export const name = 'llm-loomy'
export const inject = ['llm']

/**
 * Runtime config schema. cordis resolves a loader entry's config through this
 * schema before calling `apply`.
 *
 * DSH 0.2.x only exposes fields marked `.volatile()` to the settings forms,
 * and commits a live edit into the running config reference instead of
 * remounting the plugin. The two paths are therefore read through
 * {@link readField} on every request rather than copied into a closure.
 */
export const Config = Schema.object({
  authFile: Schema.string()
    .description('Loomy desktop auth file (defaults to the app\'s own location)')
    .volatile(),
  configFile: Schema.string()
    .description('Loomy model configuration file (defaults to the app\'s own location)')
    .volatile(),
  disabledModels: Schema.array(Schema.string())
    .description('Model ids to hide from DSH; toggled on the plugin page')
    .default([])
    .volatile(),
})

/** One config field: a plain value, or a reference the loader commits into. */
type Field<T> = T | { get(): T } | undefined

/** Config as seen inside {@link apply}. */
export interface ConfigShape {
  authFile?: Field<string>
  configFile?: Field<string>
  disabledModels?: Field<string[]>
}

/**
 * Read a config field whether the loader handed us the plain value or the
 * volatile reference DSH 0.2.x commits edits into.
 */
function readField<T>(value: Field<T>): T | undefined {
  if (value === undefined) return undefined
  const reference = value as { get?: unknown }
  return typeof reference.get === 'function' ? (value as { get(): T }).get() : value as T
}

/** Minimum gap between two forced refreshes; each one costs an upstream call. */
const REFRESH_THROTTLE_MS = 5_000

/**
 * Whether every edited path belongs to the disabled-model switch.
 *
 * Such an edit changes only which of the already-discovered models the provider
 * exposes, so it applies without re-reading Loomy. An empty path list is not
 * considered here — the caller filters that out first.
 */
function touchesOnlyDisabled(paths: readonly (readonly string[])[]): boolean {
  return paths.every(path => path[0] === 'disabledModels')
}

export function apply(ctx: Context, config: ConfigShape = {}): void {
  const authFile = (): string | undefined => readField(config.authFile)
  const configFile = (): string | undefined => readField(config.configFile)
  const disabledModels = (): readonly string[] => {
    const value = readField(config.disabledModels)
    if (!Array.isArray(value)) return []
    return value.filter((id): id is string => typeof id === 'string' && id !== '')
  }

  // The settings namespace in DSH 0.2.x is the loader entry id, not the
  // provider route. Both the provider card and the row configuration page key
  // on it, so it has to be the id the patch actually declared. `entry` is not
  // part of the public Fiber type, but it is the identity the loader stamps on
  // the running fiber (official adapters read it the same way).
  const entryId = (ctx.fiber as unknown as { entry?: { options?: { id?: string } } })
    ?.entry?.options?.id
  const settingsNs = entryId ?? LOOMY_ENTRY_ID

  const catalog = new LoomyCatalog()
  // The switch is read before the provider is created and again on every
  // volatile write, so a model disabled from the row page leaves the provider
  // without needing a restart.
  catalog.setBlocked(disabledModels())
  const shim = createLoomyShim({ catalog, authFile, logger: ctx.logger })

  // The settings card lives in the browser, so it needs a host route to ask.
  // webServer is optional (a headless profile serves no browser).
  ctx.inject(['webServer'], webCtx => registerLoomyStatusRoute(webCtx, {
    credential: async () => {
      try { return await readLoomyCredential(authFile()) } catch { return undefined }
    },
    points: () => readLoomyPoints(),
    modelCount: () => catalog.current().length,
    blockedModels: () => [...disabledModels()],
    models: () => catalog.all().map(model => ({
      id: model.id,
      name: model.name,
      ...model.rate === undefined ? {} : { rate: model.rate },
      ...model.promo === undefined ? {} : { promo: model.promo },
      ...model.image === true ? { image: true } : {},
      ...model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow },
    })),
    refresh: async () => {
      // The card's button is the only caller, but it can be clicked repeatedly:
      // one refresh per window is plenty, and each one hits Loomy's API.
      const now = Date.now()
      if (now - lastRefresh < REFRESH_THROTTLE_MS) return
      lastRefresh = now
      resetLoomyPointsCache()
      await reapply?.()
    },
  }))

  // Set once the provider is live, so an early refresh request is a no-op.
  let reapply: ((refreshCatalog?: boolean) => Promise<void>) | undefined
  let lastRefresh = 0
  let closed = false

  // DSH 0.2.x builds the configuration page from the Config schema; this
  // plugin ships its own page, so it turns the automatic one off.
  const ownerFiber = ctx.fiber
  ctx.inject(['settings'], settingsCtx => {
    settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ownerFiber))
  })

  // A volatile write is committed before this event fires, so reading the
  // fields again is all that is needed; re-pull the catalog for the new paths.
  ctx.effect(() => ctx.on(
    'loader/volatile-update' as never,
    ((paths: readonly (readonly string[])[]) => {
      if (paths.length === 0) return
      // A disabled-model edit changes what the provider serves, not what Loomy
      // offers, so it must not cost an upstream catalog re-pull.
      catalog.setBlocked(disabledModels())
      void reapply?.(!touchesOnlyDisabled(paths))
    }) as never,
  ))

  ctx.effect(() => () => { closed = true; void shim.close() })
  void shim.ready.then(async () => {
    if (closed) return
    const loomy = createLoomyAdapter(catalog, shim)
    const releaseAdapter = ctx.llm.registerAdapter([LOOMY_PROVIDER], loomy.adapter)
    const releaseDirectory = ctx.llm.registerConfigurableProviders([{
      provider: LOOMY_PROVIDER,
      displayName: 'Loomy',
      settingsNs,
      settingsPath: [],
      declared: false,
    }])
    ctx.effect(() => () => { releaseAdapter(); releaseDirectory() })
    reapply = async (refreshCatalog = true) => {
      if (closed) return
      // A disabled-model edit only changes what the provider exposes, so the
      // adapter is refreshed without paying for an upstream catalog call.
      if (!refreshCatalog) { loomy.invalidate(); return }
      // Loomy's own list is authoritative and carries the rates; the generated
      // OpenCode config is the fallback when the API cannot be reached.
      try {
        try { await catalog.refreshFromApi(await readLoomyCredential(authFile())) }
        catch { await catalog.refreshFromFile(configFile()) }
        loomy.invalidate()
      } catch (error) {
        ctx.logger.warn('dsh-loomy-connect: using fallback catalog; unable to read Loomy model configuration', error)
      }
    }
    await reapply()
  }).catch(error => ctx.logger.error('dsh-loomy-connect: failed to start loopback gateway', error))
}

export { createLoomyAdapter, LOOMY_PROVIDER, type LoomyAdapter } from './adapter.ts'
export { createLoomyShim, resolveAuthFile, type LoomyAuthFile, type LoomyShim, type LoomyShimOptions } from './shim.ts'
export { LoomyCatalog, parseLoomyApiModels, parseLoomyModels, type LoomyModel } from './catalog.ts'
export {
  defaultLoomyAuthPath,
  defaultLoomyConfigPath,
  extractLoomyAuthSessions,
  LOOMY_AUTH_SESSION_KEY,
  parseLoomyAuth,
  readLoomyCredential,
  readLoomySessionFromStorage,
  type LoomyCredential,
} from './auth.ts'
export { LOOMY_API_BASE, LoomyUpstreamClient, prepareLoomyBody } from './upstream.ts'
export { loopbackHost, loopbackOrigin } from './loopback.ts'
export {
  LOOMY_POINTS_KEY,
  defaultLoomyLocalStorageDir,
  extractLoomyPoints,
  newestLoomyPoints,
  parseLoomyPointsRecord,
  readLoomyPoints,
  resetLoomyPointsCache,
  type LoomyPointsSummary,
} from './points.ts'
export { LOOMY_STATUS_PATH, type LoomyWebPoints, type LoomyWebStatus } from './status-paths.ts'
export { loomyStatusHandler, loomyWebStatus, registerLoomyStatusRoute, type LoomyStatusRouteOptions } from './web-status.ts'
export { LOOMY_ENTRY_ID, LOOMY_PACKAGE } from './entry-id.ts'
