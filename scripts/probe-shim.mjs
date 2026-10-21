/**
 * Probe the loopback gateway's chat endpoint directly — no pi-ai, no adapter —
 * so a failure is attributable to the shim rather than to the seam above it.
 *
 *   node scripts/probe-shim.mjs [model-id]
 */

import { createLoomyShim, LoomyCatalog } from '../lib/index.js'

const model = process.argv[2] ?? 'deepseek-v4-flash'

const catalog = new LoomyCatalog()
await catalog.refresh()
const shim = createLoomyShim({ catalog, logger: { warn: (...a) => console.warn('[shim warn]', ...a) } })
await shim.ready
console.log('shim at', shim.baseUrl())

const response = await fetch(`${shim.baseUrl()}/v1/chat/completions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${shim.token()}` },
  body: JSON.stringify({
    model,
    stream: true,
    messages: [{ role: 'user', content: '只回复八个字以内：链路验证成功' }],
  }),
})

console.log('status:', response.status, response.headers.get('content-type'))
if (!response.ok) {
  console.log('error body:', (await response.text()).slice(0, 800))
} else {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let count = 0
  let bytes = 0
  let firstText = ''
  while (count < 8) {
    const { value, done } = await reader.read()
    if (done) break
    const text = decoder.decode(value, { stream: true })
    bytes += text.length
    if (count < 8) { console.log('chunk:', JSON.stringify(text.slice(0, 200))); count++ }
    firstText += text
    if (bytes > 3000) break
  }
  await reader.cancel()
  console.log('bytes:', bytes, '| saw content delta:', firstText.includes('"content"'))
}

await shim.close()
