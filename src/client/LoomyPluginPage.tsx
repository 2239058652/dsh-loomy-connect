/** Full configuration page contributed to the bundle's Plugins-page entry. */

import type { ReactElement } from 'react'
import { CSS } from './card-css.ts'
import { LoomyAccountPanel } from './LoomyAccountPanel.tsx'
import { useLoomyStatus } from './use-loomy-status.ts'
import type { Translate } from './use-loomy-status.ts'

/** Owner props of `plugins.bundle.config`; the page draws title and icon. */
export interface LoomyPluginPageProps {
  t: Translate
}

/** Account, points and model table, with the page supplying the chrome. */
export function LoomyPluginPage({ t }: LoomyPluginPageProps): ReactElement {
  const { status, busy, refresh } = useLoomyStatus(t, { pollMs: 60_000 })
  return (
    <div className={CSS.page}>
      <p className={CSS.text}>{t('intro')}</p>
      <LoomyAccountPanel
        t={t}
        status={status}
        busy={busy}
        onRefresh={() => void refresh(true)}
      />
    </div>
  )
}
