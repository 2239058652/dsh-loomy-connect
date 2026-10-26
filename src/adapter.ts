import { createProvider } from '@earendil-works/pi-ai'
import type { Api, AuthContext, CredentialStore, Model, ModelThinkingLevel, Provider, ThinkingLevelMap } from '@earendil-works/pi-ai'
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy'
import { resolveImageAttachmentAccess, resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import type { AttachmentStore } from '@deepseek-ai/dsh-attachment'
import { PiAiAdapter, type ResolvedPiAiProviderProfile } from '@deepseek-ai/dsh-llm-pi-ai'
import { LOOMY_PROVIDER } from './entry-id.ts'
import type { LoomyCatalog, LoomyModel } from './catalog.ts'
import type { LoomyShim } from './shim.ts'

export { LOOMY_PROVIDER }

const inertAuth: { credentials: CredentialStore; authContext: AuthContext } = {
  credentials: { async read() { return undefined }, async list() { return [] }, async modify() { throw new Error('Loomy credentials are managed by the Loomy desktop app') }, async delete() {} },
  authContext: { async env() { return undefined }, async fileExists() { return false } },
}
const noCost = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } as const

function modelFields(model: LoomyModel, baseUrl: string): Model<Api> {
  const thinking: Record<ModelThinkingLevel, string | null> = { off: null, minimal: null, low: 'low', medium: 'medium', high: 'high', xhigh: null, max: null }
  return {
    id: model.id, name: model.name, provider: LOOMY_PROVIDER, api: 'openai-completions', baseUrl,
    input: model.supportsImages ? ['text', 'image'] : ['text'],
    reasoning: model.reasoning,
    ...(model.reasoning ? { thinkingLevelMap: thinking as ThinkingLevelMap } : {}),
    // pi-ai needs real numbers here for its truncation math, so unknown values
    // fall back to Loomy's observed floor; the card, by contrast, shows the
    // honest `未提供` when the catalog could not learn the real size.
    contextWindow: model.contextWindow ?? 128_000, maxTokens: model.maxTokens ?? 16_384, cost: noCost,
  } as unknown as Model<Api>
}

/** What {@link createLoomyAdapter} hands back. */
export interface LoomyAdapter {
  adapter: PiAiAdapter
  /** Rebuild the adapter's provider snapshot; call after a catalog update. */
  invalidate(): void
}

/**
 * The services the adapter reads at request time.
 *
 * Both are looked up through `ctx.get` on every call rather than captured once,
 * because `attachments` and `fs` are optional services a profile may mount or
 * replace while this plugin keeps running.
 */
export interface LoomyAdapterServices {
  /**
   * Durable attachment service. Without it pi-ai refuses image input outright,
   * before the gateway is ever reached.
   */
  attachments: () => AttachmentStore | undefined
  /** Maps a stored host path into the path the model tool can read. */
  processPathFromHostPath: ((hostPath: string) => string | undefined) | undefined
}

export function createLoomyAdapter(
  catalog: LoomyCatalog,
  shim: LoomyShim,
  services: LoomyAdapterServices,
): LoomyAdapter {
  const models = (): Model<Api>[] => catalog.current().map(model => modelFields(model, `${shim.baseUrl()}/v1`))
  const base = createProvider({
    id: LOOMY_PROVIDER, name: 'Loomy', models: models(), api: openAICompletionsApi(),
    auth: {
      apiKey: {
        name: 'Loomy desktop session (loopback gateway)',
        /**
         * pi-ai hands the request-level override the adapter supplies through
         * `resolveApiKey` back here as `credential.key`, and treats an
         * `undefined` return as "this provider is not configured" — the stream
         * then ends in a PI_AI_ERROR without ever reaching the gateway.
         *
         * The value consumed here is the gateway's per-process secret, never
         * the Loomy session token: the gateway resolves that from disk itself,
         * once per request.
         */
        resolve({ credential }) {
          const apiKey = credential?.key ?? shim.token()
          return Promise.resolve({ auth: { apiKey }, source: 'Loomy desktop session' })
        },
      },
    },
  })
  const provider: Provider = { ...base, getModels: models }
  const profile: ResolvedPiAiProviderProfile = {
    provider: LOOMY_PROVIDER, displayName: 'Loomy', streamIdleTimeoutMs: 1_200_000,
    retryPolicy: resolveRetryPolicy(undefined, 'dsh-loomy-connect retryPolicy'), configuredMaxTokens: new Map(), modelErrors: new Map(),
    maxRequestImageBytes: 20_971_520, requestImagePixelBudget: 4_194_304, requestImageMaxBytes: 1_048_576, piProvider: provider,
  }
  let profiles = new Map([[LOOMY_PROVIDER, profile]])
  // Without these two hooks the adapter throws UNSUPPORTED_CONTENT on any
  // message carrying an image, before the gateway is ever reached: pi-ai has no
  // way to turn a durable attachment reference into the bytes it must inline.
  const adapter = new PiAiAdapter({
    profiles: () => profiles,
    auth: inertAuth,
    resolveApiKey: async () => shim.token(),
    resolveAttachments: () => services.attachments(),
    resolveImageAccess: (attachments, ref) => resolveImageAttachmentAccess(
      attachments,
      hostPath => services.processPathFromHostPath?.(hostPath),
      ref,
    ),
  })
  return { adapter, invalidate() { profiles = new Map([[LOOMY_PROVIDER, profile]]) } }
}
