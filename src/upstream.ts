/** Loomy's OpenAI-compatible iModel endpoint. */
import type { LoomyCredential } from './auth.ts'

export const LOOMY_API_BASE = 'https://loomyad.xunfei.cn/api/v1'

export class LoomyUpstreamClient {
  /**
   * The account's model list, carrying Loomy's own rate labels.
   *
   * Preferred over Loomy's generated OpenCode config: it is the same list the
   * app renders, it exists on every platform, and it is the only source that
   * says what each model costs.
   */
  async models(credential: LoomyCredential, signal?: AbortSignal): Promise<string> {
    const response = await fetch(`${LOOMY_API_BASE}/models`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${credential.session}`,
        token: credential.session,
        'X-User-Id': credential.userId,
      },
      ...(signal === undefined ? {} : { signal }),
    })
    if (!response.ok) throw new Error(`Loomy model list failed (HTTP ${response.status})`)
    return response.text()
  }

  async chatStream(credential: LoomyCredential, body: string, signal?: AbortSignal): Promise<Response> {
    const response = await fetch(`${LOOMY_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credential.session}`,
        token: credential.session,
        'X-User-Id': credential.userId,
      },
      body,
      ...(signal === undefined ? {} : { signal }),
    })
    if (!response.ok) throw new Error(`Loomy request failed (HTTP ${response.status}): ${(await response.text()).slice(0, 400)}`)
    return response
  }
}

/** Preserve tool calls; add the options Loomy sends for agent conversations. */
export function prepareLoomyBody(source: string): string {
  try {
    const value: unknown = JSON.parse(source)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return source
    const body = value as Record<string, unknown>
    body.stream = true
    if (typeof body.reasoning_effort === 'string') body.reasoningEffort = body.reasoning_effort
    // Loomy's service accepts OpenAI messages but expects system rather than
    // the newer developer role used by some OpenAI-compatible clients.
    if (Array.isArray(body.messages)) {
      for (const item of body.messages) {
        if (typeof item === 'object' && item !== null && (item as Record<string, unknown>).role === 'developer') {
          (item as Record<string, unknown>).role = 'system'
        }
      }
    }
    return JSON.stringify(body)
  } catch { return source }
}
