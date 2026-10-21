/** Discover the models Loomy currently offers, with the rates it bills them at. */
import { readFile } from 'node:fs/promises'
import { defaultLoomyConfigPath, LOOMY_CONFIG_FILE_ENV } from './auth.ts'
import type { LoomyCredential } from './auth.ts'
import { LoomyUpstreamClient } from './upstream.ts'

export interface LoomyModel {
  id: string
  name: string
  /**
   * Context window in tokens, exactly when the source carries one.
   *
   * Loomy's `/v1/models` fills `context_length` for chat models but leaves it
   * off some image generators, and the offline snapshot should not invent
   * numbers either — `undefined` means unknown, which the card renders as
   * `未提供` instead of a plausible-looking guess.
   */
  contextWindow: number | undefined
  maxTokens: number | undefined
  supportsImages: boolean
  reasoning: boolean
  /** Points multiplier Loomy prints in the model name — 3 for `x3.0`. */
  rate?: number
  /** Promotional label Loomy prints in the model name, e.g. 限时免费. */
  promo?: string
  /** True for image generators: listed for reference, never served to DSH. */
  image?: boolean
}

/**
 * Last resort when neither the API nor Loomy's own config can be read.
 *
 * A snapshot of Loomy's text models, so an offline start still yields a usable
 * provider instead of an empty one.
 */
const FALLBACK: readonly LoomyModel[] = [
  { id: 'deepseek-v4-flash-0731', name: 'DeepSeek V4 Flash 0731', contextWindow: 1_048_576, maxTokens: 384_000, supportsImages: false, reasoning: true },
  { id: 'mimo-v2.5', name: 'MiMo V2.5', contextWindow: 1_048_576, maxTokens: 131_072, supportsImages: true, reasoning: true },
  { id: 'MiniMax-M3', name: 'MiniMax M3', contextWindow: 1_048_576, maxTokens: 512_000, supportsImages: true, reasoning: true },
  { id: 'Kimi-k2.6', name: 'Kimi k2.6', contextWindow: 262_144, maxTokens: 65_536, supportsImages: true, reasoning: true },
  { id: 'qwen-3.8-max', name: 'Qwen 3.8 Max', contextWindow: 1_000_000, maxTokens: 65_536, supportsImages: false, reasoning: true },
  { id: 'GLM-5.3-Flash', name: 'GLM 5.3 Flash', contextWindow: 1_048_576, maxTokens: 131_072, supportsImages: true, reasoning: true },
  { id: 'qwen3.8-flash', name: 'Qwen 3.8 Flash', contextWindow: 1_000_000, maxTokens: 131_072, supportsImages: true, reasoning: true },
  { id: 'DeepSeek-V4-Pro-0813', name: 'DeepSeek V4 Pro 0813', contextWindow: 1_000_000, maxTokens: 393_216, supportsImages: false, reasoning: true },
  { id: 'spark-x', name: 'Spark X2.5', contextWindow: 1_048_576, maxTokens: 65_536, supportsImages: false, reasoning: true },
  { id: 'doubao-seed-2.0-mini', name: 'Doubao Seed 2.0 mini', contextWindow: 262_144, maxTokens: 131_072, supportsImages: true, reasoning: true },
  { id: 'qwen3.5-flash', name: 'Qwen3.5 Flash', contextWindow: 1_000_000, maxTokens: 65_536, supportsImages: true, reasoning: true },
]

/** A positive number, or `undefined` when the source does not carry one. */
function positiveOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && value > 0 ? value : undefined
}

/**
 * Loomy prints the billing rate inside the model name — `…（x3.0）`,
 * `…(x12.0)` — and flags giveaways there too, as `…（限时免费）`.
 */
const RATE_TAG = /[（(]\s*x\s*([0-9]+(?:\.[0-9]+)?)\s*[）)]/iu
const PROMO_TAG = /[（(]([^（）()]*免费[^（）()]*)[）)]/u

function rateOf(name: string): number | undefined {
  const match = RATE_TAG.exec(name)
  if (match?.[1] === undefined) return undefined
  const value = Number(match[1])
  return Number.isFinite(value) ? value : undefined
}

function promoOf(name: string): string | undefined {
  return PROMO_TAG.exec(name)?.[1]?.trim()
}

/** Read a model entry out of Loomy's `/v1/models` list. */
function fromApiEntry(entry: Record<string, unknown>): LoomyModel | undefined {
  const id = typeof entry.id === 'string' ? entry.id.trim() : ''
  if (id === '') return undefined
  const name = typeof entry.name === 'string' && entry.name.trim() !== '' ? entry.name.trim() : id
  const capabilities = (typeof entry.capabilities === 'object' && entry.capabilities !== null && !Array.isArray(entry.capabilities))
    ? entry.capabilities as Record<string, unknown>
    : {}
  const arrayOf = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  const input = arrayOf(capabilities.input_modalities)
  const output = arrayOf(capabilities.output_modalities)
  const image = entry.type === 'image' || (output.length > 0 && !output.includes('text'))
  return {
    id,
    name,
    contextWindow: positiveOrUndefined(entry.context_length),
    maxTokens: positiveOrUndefined(entry.max_output_tokens),
    supportsImages: input.includes('image'),
    reasoning: capabilities.reasoning === true,
    ...image ? { image: true } : {},
    ...rateOf(name) === undefined ? {} : { rate: rateOf(name) },
    ...promoOf(name) === undefined ? {} : { promo: promoOf(name) },
  }
}

/** Parse Loomy's `/v1/models` response; every entry that has an id survives. */
export function parseLoomyApiModels(text: string): readonly LoomyModel[] {
  try {
    const document: unknown = JSON.parse(text)
    if (typeof document !== 'object' || document === null) return []
    const data = (document as Record<string, unknown>).data
    if (!Array.isArray(data)) return []
    const models: LoomyModel[] = []
    for (const entry of data) {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue
      const model = fromApiEntry(entry as Record<string, unknown>)
      if (model !== undefined) models.push(model)
    }
    return models
  } catch { return [] }
}

/** Parse Loomy's generated OpenCode config, the source the macOS build writes. */
export function parseLoomyModels(text: string): readonly LoomyModel[] {
  try {
    const document: unknown = JSON.parse(text)
    if (typeof document !== 'object' || document === null || Array.isArray(document)) return []
    const provider = (document as Record<string, unknown>).provider
    if (typeof provider !== 'object' || provider === null || Array.isArray(provider)) return []
    const imodel = (provider as Record<string, unknown>).imodel
    if (typeof imodel !== 'object' || imodel === null || Array.isArray(imodel)) return []
    const models = (imodel as Record<string, unknown>).models
    if (typeof models !== 'object' || models === null || Array.isArray(models)) return []
    const result: LoomyModel[] = []
    for (const [id, value] of Object.entries(models as Record<string, unknown>)) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) continue
      const model = value as Record<string, unknown>
      const modalities = model.modalities as Record<string, unknown> | undefined
      const input = Array.isArray(modalities?.input) ? modalities.input : []
      // DSH is a chat surface: do not expose image-generation-only rows.
      const output = Array.isArray(modalities?.output) ? modalities.output : ['text']
      const name = typeof model.name === 'string' && model.name.trim() !== '' ? model.name : id
      const limit = model.limit as Record<string, unknown> | undefined
      result.push({
        id,
        name,
        contextWindow: positiveOrUndefined(limit?.context),
        maxTokens: positiveOrUndefined(limit?.output),
        supportsImages: input.includes('image'),
        reasoning: model.reasoning === true || typeof model.variants === 'object',
        ...!output.includes('text') ? { image: true } : {},
        ...rateOf(name) === undefined ? {} : { rate: rateOf(name) },
        ...promoOf(name) === undefined ? {} : { promo: promoOf(name) },
      })
    }
    return result
  } catch { return [] }
}

/**
 * The account's model list.
 *
 * Loomy's `/v1/models` is authoritative and carries the rates, so it is the
 * preferred source; the generated OpenCode config is the fallback for builds
 * or sessions where the API cannot be reached.
 */
export class LoomyCatalog {
  private served: readonly LoomyModel[] = FALLBACK
  private discovered: readonly LoomyModel[] = FALLBACK

  /** Models DSH can actually call. */
  current(): readonly LoomyModel[] { return this.served }

  /** Everything Loomy lists, image generators included, for the card to show. */
  all(): readonly LoomyModel[] { return this.discovered }

  private accept(models: readonly LoomyModel[]): void {
    if (models.length === 0) return
    this.discovered = models
    const text = models.filter(model => model.image !== true)
    if (text.length > 0) this.served = text
  }

  async refreshFromApi(credential: LoomyCredential, signal?: AbortSignal): Promise<void> {
    this.accept(parseLoomyApiModels(await new LoomyUpstreamClient().models(credential, signal)))
  }

  async refreshFromFile(configFile?: string): Promise<void> {
    const path = configFile ?? process.env[LOOMY_CONFIG_FILE_ENV] ?? defaultLoomyConfigPath()
    this.accept(parseLoomyModels(await readFile(path, 'utf8')))
  }
}
