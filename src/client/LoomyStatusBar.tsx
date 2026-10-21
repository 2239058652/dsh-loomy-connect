/** Compact sign-in and points line for the Models-page provider card. */

import type { ReactElement } from 'react'
import {
  Button,
  IconRefreshOutlineMedium,
  StateDot,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import type { LoomyWebStatus } from '../status-paths.ts'
import { CSS } from './card-css.ts'
import { useLoomyStatus } from './use-loomy-status.ts'
import type { Translate } from './use-loomy-status.ts'

/** Owner props of `settings.models.provider-card`. */
export interface LoomyStatusBarProps {
  t: Translate
  /** The directory row this card extends; only its display name is used. */
  provider?: { displayName?: string }
  configured?: boolean
  keyConfigured?: boolean
}

function dotState(status: LoomyWebStatus['status']): StateDotState {
  switch (status) {
    case 'signed-in': return 'done'
    case 'error': return 'error'
    default: return 'idle'
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined).format(value)
}

/** One line: sign-in state, permanent balance, refresh. */
export function LoomyStatusBar({ t }: LoomyStatusBarProps): ReactElement {
  const { status, busy, refresh } = useLoomyStatus(t, { pollMs: 60_000 })
  const label =
    status.status === 'signed-in'
      ? status.account === undefined
        ? t('signedIn')
        : t('signedInAs', { account: status.account })
      : status.status === 'error'
        ? t('requestFailed')
        : t('signedOut')
  const permanent = status.status === 'signed-in' ? status.points?.permanent : undefined

  return (
    <div className={CSS.statusBar} role="status">
      <StateDot state={dotState(status.status)} />
      <span className={CSS.statusBarText}>{label}</span>
      {permanent === undefined
        ? null
        : <span className={CSS.statusBarMeta}>{t('statusPoints', { value: formatNumber(permanent) })}</span>}
      {status.status === 'signed-in'
        ? null
        : <span className={CSS.statusBarMeta}>{t('signedOutHint')}</span>}
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => void refresh(true)}
      >
        <span className={CSS.refreshInner}>
          <IconRefreshOutlineMedium className={busy ? CSS.refreshSpin : undefined} />
          <span>{busy ? t('refreshing') : t('refresh')}</span>
        </span>
      </Button>
    </div>
  )
}
