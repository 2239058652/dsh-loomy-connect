/** Browser half: Loomy account status in the Plugins page and Models page. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-models/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LOOMY_ENTRY_ID, LOOMY_PACKAGE } from '../entry-id.ts'
import { LoomyPluginPage } from './LoomyPluginPage.tsx'
import { LoomyRowConfig } from './LoomyRowConfig.tsx'
import { LoomyStatusBar } from './LoomyStatusBar.tsx'
import { en, zh } from './locales.ts'
import type { LoomySettingsKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Loomy plugin copy. */
    'settings.loomy': LoomySettingsKey
  }
}

/** Stable browser-plugin name. */
export const name = 'dsh-loomy-connect-client'

/**
 * Client services required by the contributions. The three slot declarers are
 * named in the package's `dsh.client.inject` list, so cordis has materialized
 * them before this plugin's fiber starts.
 */
export const inject = ['slots', 'locale']

const LOCALE_NAMESPACE = 'settings.loomy'

/**
 * Register card copy and the three Loomy surfaces.
 *
 * Each registration is wrapped separately: a DSH slot-API change on one
 * surface degrades to a `console.error` instead of throwing into the loader
 * and taking the provider channel down with it.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(LOCALE_NAMESPACE, { zh, en }), 'dsh-loomy-connect: settings copy')
  const t = ctx.locale.bind(LOCALE_NAMESPACE) as (key: LoomySettingsKey, params?: Record<string, unknown>) => string
  const injected = (): { t: typeof t } => ({ t })

  try {
    // The bundle page: full account, points and model table.
    ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
      name: 'plugins.bundle.config',
      key: LOOMY_PACKAGE,
      locale: LOCALE_NAMESPACE,
      inject: injected,
    }, LoomyPluginPage))
  } catch (error: unknown) {
    console.error('[dsh-loomy-connect] bundle configuration page failed to load:', error)
  }

  try {
    // The row page: the two path overrides, with its own Configure control.
    ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
      name: 'plugins.row.config',
      key: `${LOOMY_PACKAGE}#${LOOMY_ENTRY_ID}`,
      locale: LOCALE_NAMESPACE,
      inject: injected,
    }, LoomyRowConfig))
  } catch (error: unknown) {
    console.error('[dsh-loomy-connect] row configuration page failed to load:', error)
  }

  try {
    // The Models page: a one-line status bar inside the Loomy provider card.
    ctx.slots.inject('settings.models.provider-card', () => ctx.slots.register({
      name: 'settings.models.provider-card',
      key: LOOMY_ENTRY_ID,
      locale: LOCALE_NAMESPACE,
      inject: injected,
    }, LoomyStatusBar))
  } catch (error: unknown) {
    console.error('[dsh-loomy-connect] provider status bar failed to load:', error)
  }
}
