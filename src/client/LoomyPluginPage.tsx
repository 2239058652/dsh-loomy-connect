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
  const disabled = status.status === 'signed-in' ? (status.blockedModels?.length ?? 0) : 0
  return (
    <div className={CSS.page}>
      <p className={CSS.text}>{t('intro')}</p>
      {/*
        DSH's Plugins page draws no callout for a row's own configuration page:
        the row id appears as a quiet button and nothing else points at it. This
        banner is the only discoverable route to the model switch, so it names
        the row to open instead of relying on that affordance.
      */}
      <div className={CSS.callout}>
        <div className={CSS.calloutHead}>
          <span className={CSS.calloutTitle}>{t('modelsSwitchTitle')}</span>
          {disabled === 0
            ? null
            : <span className={CSS.calloutCount}>{t('disableModelsCount', { count: disabled })}</span>}
        </div>
        <p className={CSS.calloutText}>{t('modelsSwitchWhere')}</p>
      </div>
      <LoomyAccountPanel
        t={t}
        status={status}
        busy={busy}
        onRefresh={() => void refresh(true)}
      />
    </div>
  )
}
