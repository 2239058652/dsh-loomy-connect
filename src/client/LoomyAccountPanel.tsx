/**
 * Account, points and model table for the full-page surfaces.
 *
 * The component is presentational: the page owns the status transport, so a
 * single poll feeds everything below.
 */

import { useState } from 'react'
import type { ReactElement } from 'react'
import {
  Button,
  IconRefreshOutlineMedium,
  StateDot,
  Tag,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import type { LoomyWebModel, LoomyWebStatus } from '../status-paths.ts'
import type { Translate } from './use-loomy-status.ts'
import { CSS } from './card-css.ts'

/** Map our transport outcome onto the primitive's state vocabulary. */
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

function formatTime(ms: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms))
}

/**
 * The rate or promo Loomy appends to a model name — `…（x3.0）`, `…（限时免费）`.
 *
 * Mirrors the tags `catalog.ts` parses, anchored to the end so a name that
 * legitimately contains parentheses keeps them.
 */
const NAME_TAG = /[（(]\s*(?:x\s*[0-9]+(?:\.[0-9]+)?|[^（）()]*免费[^（）()]*)\s*[）)]\s*$/u

/** The model name without the rate tag, which the table shows in its own column. */
function modelName(name: string): string {
  return name.replace(NAME_TAG, '').trim()
}

/** Loomy's own spelling, one decimal: 3 → `x3.0`, 3.3 → `x3.3`. */
function formatRate(rate: number): string {
  return `x${Number.isInteger(rate) ? rate.toFixed(1) : rate}`
}

/** Compact token count: 262144 → `262K`, 1_048_576 → `1M`. */
function formatContext(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    return `${Math.round(millions * 10) / 10}M`
  }
  if (value >= 1000) return `${Math.round(value / 1000)}K`
  return String(value)
}

/** Localize the promotional label, falling back to Loomy's own wording. */
function promoLabel(promo: string, t: Translate): string {
  return /免费/u.test(promo) ? t('badgeLimitedFree') : promo
}

function renderModelRow(model: LoomyWebModel, t: Translate): ReactElement {
  const off = model.disabled === true
  return (
    <div key={model.id} className={CSS.tableRow} role="row">
      <span className={CSS.tableCell} role="gridcell">
        <span className={off ? `${CSS.listName} ${CSS.listNameOff}` : CSS.listName}>{modelName(model.name)}</span>
        {off ? <span className={CSS.pillOff}>{t('badgeDisabled')}</span> : null}
      </span>
      <span className={CSS.tableCell} role="gridcell">
        {model.contextWindow === undefined
          ? <span className={CSS.ctx}>{t('modelsContextNone')}</span>
          : <span className={CSS.ctx}>{formatContext(model.contextWindow)}</span>}
      </span>
      <span className={CSS.tableCell} role="gridcell">
        {model.rate === undefined && model.promo === undefined
          ? <span className={CSS.dash}>—</span>
          : <span className={CSS.listMeta}>
              {model.rate === undefined
                ? null
                : <span className={CSS.pill}>{formatRate(model.rate)}</span>}
              {model.promo === undefined
                ? null
                : <span className={CSS.pill}>{promoLabel(model.promo, t)}</span>}
            </span>}
      </span>
    </div>
  )
}

/** One labelled number: the permanent or the daily-gift balance. */
function PointsTile({ label, value, hint }: { label: string; value: number; hint: string }): ReactElement {
  return (
    <div className={CSS.tile}>
      <div className={CSS.tileLabel}>{label}</div>
      <div className={CSS.tileValue}>{formatNumber(value)}</div>
      <div className={CSS.tileHint}>{hint}</div>
    </div>
  )
}

/** Props for {@link LoomyAccountPanel}. */
export interface LoomyAccountPanelProps {
  t: Translate
  status: LoomyWebStatus
  busy: boolean
  onRefresh: () => void
}

/** Sign-in state, points and the reachable model list. */
export function LoomyAccountPanel({ t, status, busy, onRefresh }: LoomyAccountPanelProps): ReactElement {
  /** Which of the two tabs (积分 / 模型) is showing. */
  const [tab, setTab] = useState<'account' | 'models'>('account')
  const label =
    status.status === 'signed-in'
      ? status.account === undefined
        ? t('signedIn')
        : t('signedInAs', { account: status.account })
      : status.status === 'error'
        ? t('requestFailed')
        : t('signedOut')
  const rawUpdatedAt = status.status === 'signed-in' ? status.points?.updatedAt : undefined
  const updatedMs = rawUpdatedAt === undefined ? undefined : Date.parse(rawUpdatedAt)
  const models = status.status === 'signed-in' ? status.models : undefined

  return (
    <section className={CSS.panel}>
      <div className={CSS.section}>
        <div className={CSS.row}>
          <div className={CSS.status} role="status">
            <StateDot state={dotState(status.status)} />
            <span>{label}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={onRefresh}
          >
            <span className={CSS.refreshInner}>
              <IconRefreshOutlineMedium className={busy ? CSS.refreshSpin : undefined} />
              <span>{busy ? t('refreshing') : t('refresh')}</span>
            </span>
          </Button>
        </div>
      </div>
      {status.status === 'signed-in'
        ? (
          <>
            <div className={CSS.tabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'account'}
                className={tab === 'account' ? `${CSS.tab} ${CSS.tabActive}` : CSS.tab}
                onClick={() => setTab('account')}
              >
                {t('tabPoints')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'models'}
                className={tab === 'models' ? `${CSS.tab} ${CSS.tabActive}` : CSS.tab}
                onClick={() => setTab('models')}
              >
                {t('tabModels')}
              </button>
            </div>
            {tab === 'account'
              ? (
                <div className={CSS.section}>
                  <h3 className={CSS.heading}>{t('pointsHeading')}</h3>
                  {status.points === undefined
                    ? <p className={CSS.text}>{t('pointsUnavailable')}</p>
                    : (
                      <>
                        <div className={CSS.tiles}>
                          <PointsTile
                            label={t('permanentPoints')}
                            value={status.points.permanent}
                            hint={t('permanentPointsHint')}
                          />
                          <PointsTile
                            label={t('dailyPoints')}
                            value={status.points.daily}
                            hint={t('dailyPointsHint')}
                          />
                        </div>
                        {updatedMs === undefined || Number.isNaN(updatedMs)
                          ? null
                          : <p className={CSS.hint}>{t('updatedAt', { time: formatTime(updatedMs) })}</p>}
                        <p className={CSS.hint}>{t('pointsSourceHint')}</p>
                      </>
                    )}
                  {status.pointsError === undefined
                    ? null
                    : <p className={CSS.error}>{t('pointsError', { message: status.pointsError })}</p>}
                </div>
              )
              : (
                <div className={CSS.section}>
                  <div className={CSS.row}>
                    <h3 className={CSS.heading}>{t('modelsHeading')}</h3>
                    <Tag tone="neutral">{t('modelsTag', { count: status.modelCount })}</Tag>
                  </div>
                  {models === undefined
                    ? null
                    : (
                      <div className={CSS.table} role="grid">
                        <div className={CSS.tableHeader} role="row">
                          <span role="columnheader">{t('modelsColModel')}</span>
                          <span role="columnheader">{t('modelsColContext')}</span>
                          <span role="columnheader">{t('modelsColBill')}</span>
                        </div>
                        {models.filter(model => model.image !== true).map(model => renderModelRow(model, t))}
                        {models.filter(model => model.image === true).map(model => renderModelRow(model, t))}
                      </div>
                    )}
                  {models === undefined
                    ? null
                    : <p className={CSS.hint}>{t('disableModelsWhere')}</p>}
                </div>
              )}
          </>
        )
        : null}
      {status.status === 'signed-out' ? <p className={CSS.text}>{t('signedOutHint')}</p> : null}
      {status.status === 'error' ? <p className={CSS.error}>{status.message}</p> : null}
    </section>
  )
}
