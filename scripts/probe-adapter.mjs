/**
 * Probe the adapter seam alone: prints every raw chunk (and any throw) from
 * `PiAiAdapter.stream`, so a short-circuit above the gateway is visible.
 *
 *   node scripts/probe-adapter.mjs [model-id]
 */

import { createLoomyAdapter, createLoomyShim, LoomyCatalog } from '../lib/index.js'

const model = process.argv[2] ?? 'deepseek-v4-flash'

const catalog = new LoomyCatalog()
await catalog.refresh()

let requests = 0
const shim = createLoomyShim({
  catalog,
  logger: { warn: (...a) => console.warn('[shim]', ...a) },
})
await shim.ready

// Count what actually reaches the gateway.
const realFetch = globalThis.fetch
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input.url
  if (url.startsWith(shim.baseUrl())) {
    requests++
    console.log('[gateway] <-- ' + (init?.method ?? 'GET') + ' ' + url.replace(shim.baseUrl(), ''))
  }
  return realFetch(input, init)
}

const { adapter } = createLoomyAdapter(catalog, shim)
const info = await adapter.resolveModel('loomy', model)
console.log('resolveModel ->', JSON.stringify(info))

try {
  for await (const chunk of adapter.stream({
    provider: 'loomy',
    model,
    system: '你是简洁的中文助手。',
    messages: [{
      id: 'p-1',
      role: 'user',
      content: [{ type: 'text', text: '只回复八个字以内：链路验证成功' }],
      source: { kind: 'user' },
    }],
  })) {
    console.log('chunk ->', JSON.stringify(chunk).slice(0, 400))
  }
} catch (error) {
  console.log('THREW ->', error?.stack ?? String(error))
}

console.log('gateway requests observed:', requests)
await shim.close()
