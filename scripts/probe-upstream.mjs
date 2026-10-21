/**
 * Probe Loomy's OpenAI-compatible upstream directly with the desktop
 * credential — no shim, no adapter. Prints the raw status and first bytes so a
 * protocol mismatch is visible instead of being swallowed.
 *
 *   node scripts/probe-upstream.mjs [model-id] [effort]
 */

import { readLoomyCredential, LOOMY_API_BASE } from '../lib/index.js'

const model = process.argv[2] ?? 'deepseek-v4-flash'
const effort = process.argv[3]

const credential = await readLoomyCredential()

const body = {
  model,
  stream: true,
  messages: [
    { role: 'system', content: '你是简洁的中文助手。' },
    { role: 'user', content: '只回复八个字以内：链路验证成功' },
  ],
  ...(effort === undefined ? {} : { reasoning_effort: effort }),
}

const headerVariants = {
  'bearer+token+userId': {
    Authorization: `Bearer ${credential.session}`,
    token: credential.session,
    'X-User-Id': credential.userId,
  },
  'session-header': {
    Authorization: `Bearer ${credential.session}`,
    'X-User-Id': credential.userId,
  },
}

for (const [label, headers] of Object.entries(headerVariants)) {
  console.log('\n=== ' + label + ' -> POST ' + LOOMY_API_BASE + '/chat/completions model=' + model + ' ===')
  try {
    const response = await fetch(`${LOOMY_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    })
    console.log('status:', response.status, response.headers.get('content-type'))
    if (!response.ok) {
      console.log('body:', (await response.text()).slice(0, 600))
      continue
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let seen = 0
    let printed = 0
    while (printed < 6) {
      const { value, done } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      seen += text.length
      if (printed < 6) { console.log('chunk:', JSON.stringify(text.slice(0, 220))); printed++ }
      if (seen > 4000) break
    }
    await reader.cancel()
    console.log('total bytes read:', seen)
  } catch (error) {
    console.log('threw:', String(error))
  }
}
