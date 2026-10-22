/**
 * The `llm-loomy` row page on the Plugins screen: the two path overrides DSH
 * 0.2.x lets this plugin write, plus a compact status line.
 *
 * DSH 0.2.x only passes an editable form to `plugins.row.config`; the bundle
 * page is read-only. Writes go through `form.mutate`, which fences on the
 * revision the page read and persists into the profile patch.
 */

import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { CSS } from './card-css.ts'
import { LoomyStatusBar } from './LoomyStatusBar.tsx'
import { useLoomyStatus } from './use-loomy-status.ts'
import type { Translate } from './use-loomy-status.ts'

/** One path-addressed edit accepted by the settings form. */
type PathOp =
  | { op: 'set'; path: string[]; value: unknown }
  | { op: 'unset'; path: string[] }

/** The slice of `ConfigPageForm` this page uses. */
interface ConfigPageFormLike {
  state: {
    status: 'loading' | 'ready' | 'unavailable'
    value?: Record<string, unknown>
    revision?: number
    writable: boolean
  }
  mutate: (ops: readonly PathOp[], expectedRevision?: number) => Promise<boolean>
}

/** Owner props of `plugins.row.config`. */
export interface LoomyRowConfigProps {
  t: Translate
  form?: ConfigPageFormLike
}

function textField(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** The stored disabled-model list, ignoring anything not a non-empty string. */
function idList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is string => typeof id === 'string' && id !== '')
}

/**
 * The name without the rate/promo tag Loomy appends, which is what the switch
 * list shows; the tag stays visible in the Models tab of the bundle page.
 */
const NAME_TAG = /[（(]\s*(?:x\s*[0-9]+(?:\.[0-9]+)?|[^（）()]*免费[^（）()]*)\s*[）)]\s*$/u

function modelName(name: string): string {
  return name.replace(NAME_TAG, '').trim()
}

/** Path overrides for non-standard Loomy installations, plus the model switch. */
export function LoomyRowConfig({ t, form }: LoomyRowConfigProps): ReactElement {
  const section = form?.state.value ?? {}
  const [authFile, setAuthFile] = useState('')
  const [configFile, setConfigFile] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | undefined>(undefined)
  const [pending, setPending] = useState<string[] | undefined>(undefined)
  const [modelsMessage, setModelsMessage] = useState<string | undefined>(undefined)
  const [modelsSaving, setModelsSaving] = useState(false)
  const { status } = useLoomyStatus(t)

  // Adopt host values until the user starts editing; after that a background
  // revision must not overwrite the draft.
  useEffect(() => {
    if (dirty) return
    setAuthFile(textField(section.authFile))
    setConfigFile(textField(section.configFile))
  }, [section.authFile, section.configFile, dirty])

  // The switch follows the stored list, not the draft, so a write that the Host
  // rejects leaves the checkboxes showing what is actually in effect.
  const stored = idList(section.disabledModels)
  const selected = pending ?? stored
  const models = status.status === 'signed-in' ? (status.models ?? []) : []

  const editable = form !== undefined && form.state.status === 'ready' && form.state.writable

  const save = async (): Promise<void> => {
    if (form === undefined) return
    setSaving(true)
    setMessage(undefined)
    const ops: PathOp[] = []
    const auth = authFile.trim()
    const config = configFile.trim()
    ops.push(auth === ''
      ? { op: 'unset', path: ['authFile'] }
      : { op: 'set', path: ['authFile'], value: auth })
    ops.push(config === ''
      ? { op: 'unset', path: ['configFile'] }
      : { op: 'set', path: ['configFile'], value: config })
    try {
      const accepted = await form.mutate(ops, form.state.revision)
      setMessage(accepted ? t('saved') : t('saveFailed'))
      if (accepted) setDirty(false)
    } catch {
      setMessage(t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  /**
   * Write the whole list in one mutation.
   *
   * Array paths would work too, but a wholesale set keeps the stored order
   * equal to the check order and produces one revision bump per click.
   */
  const writeModels = async (ids: string[]): Promise<void> => {
    if (form === undefined) return
    setModelsSaving(true)
    setModelsMessage(undefined)
    setPending(ids)
    try {
      const accepted = await form.mutate(
        [ids.length === 0
          ? { op: 'unset', path: ['disabledModels'] }
          : { op: 'set', path: ['disabledModels'], value: ids }],
        form.state.revision,
      )
      setModelsMessage(accepted ? t('modelsSaved') : t('saveFailed'))
      // A rejected write keeps the Host's list, so drop the optimistic copy.
      if (accepted) setPending(undefined)
    } catch {
      setModelsMessage(t('saveFailed'))
      setPending(undefined)
    } finally {
      setModelsSaving(false)
    }
  }

  const toggleModel = (id: string, on: boolean): void => {
    const next = on ? [...selected, id] : selected.filter(item => item !== id)
    void writeModels(next)
  }

  return (
    <div className={CSS.page}>
      <LoomyStatusBar t={t} />
      <div className={CSS.section}>
        <h3 className={CSS.heading}>{t('configPaths')}</h3>
        <p className={CSS.hint}>{t('configHint')}</p>
        <div className={CSS.field}>
          <label className={CSS.fieldLabel} htmlFor="dlc-auth-file">{t('authFile')}</label>
          <input
            id="dlc-auth-file"
            className={CSS.input}
            value={authFile}
            placeholder={t('authFileHint')}
            disabled={!editable || saving}
            onChange={event => {
              setDirty(true)
              setMessage(undefined)
              setAuthFile(event.target.value)
            }}
          />
        </div>
        <div className={CSS.field}>
          <label className={CSS.fieldLabel} htmlFor="dlc-config-file">{t('configFile')}</label>
          <input
            id="dlc-config-file"
            className={CSS.input}
            value={configFile}
            placeholder={t('configFileHint')}
            disabled={!editable || saving}
            onChange={event => {
              setDirty(true)
              setMessage(undefined)
              setConfigFile(event.target.value)
            }}
          />
        </div>
        <div className={CSS.actions}>
          <Button
            variant="primary"
            size="sm"
            disabled={!editable || saving || !dirty}
            onClick={() => void save()}
          >
            {saving ? t('saving') : t('save')}
          </Button>
          {form === undefined || form.state.status === 'unavailable'
            ? <span className={CSS.hint}>{t('namespaceUnavailable')}</span>
            : null}
          {message === undefined ? null : <span className={CSS.hint}>{message}</span>}
        </div>
      </div>
      <div className={CSS.section}>
        <h3 className={CSS.heading}>{t('disableModelsHeading')}</h3>
        <p className={CSS.hint}>{t('disableModelsHint')}</p>
        {status.status !== 'signed-in'
          ? <p className={CSS.hint}>{t('signedOutHint')}</p>
          : models.filter(model => model.image !== true).length === 0
            ? <p className={CSS.hint}>{t('disableModelsEmpty')}</p>
            : (
              <div className={CSS.switchList} role="group" aria-label={t('disableModelsHeading')}>
                {models.filter(model => model.image !== true).map(model => (
                  <label key={model.id} className={CSS.switchRow}>
                    <input
                      type="checkbox"
                      className={CSS.switchBox}
                      checked={!selected.includes(model.id)}
                      disabled={!editable || modelsSaving}
                      onChange={event => toggleModel(model.id, !event.target.checked)}
                    />
                    <span className={CSS.switchLabel}>{modelName(model.name)}</span>
                    <span className={CSS.switchId}>{model.id}</span>
                  </label>
                ))}
              </div>
            )}
        <div className={CSS.actions}>
          <span className={CSS.hint}>
            {t('disableModelsCount', { count: selected.length })}
          </span>
          {modelsMessage === undefined ? null : <span className={CSS.hint}>{modelsMessage}</span>}
        </div>
      </div>
    </div>
  )
}
