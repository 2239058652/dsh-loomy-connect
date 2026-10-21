/**
 * Live end-to-end check — NOT part of an offline suite.
 *
 * Exercises the real chain: adapter -> pi-ai -> loopback shim -> Loomy's
 * OpenAI-compatible upstream, authenticating with the Loomy desktop app's own
 * sign-in. Run from the package root:
 *
 *   node scripts/live-e2e.mjs [model-id]
 */

import {
  createLoomyAdapter,
  createLoomyShim,
  LoomyCatalog,
  readLoomyCredential,
} from '../lib/index.js'

const target = process.argv[2]

const catalog = new LoomyCatalog()
const shim = createLoomyShim({ catalog })
await shim.ready
console.log('1. shim listening at', shim.baseUrl())

// The desktop sign-in is the only credential source; nothing is written back.
const credential = await readLoomyCredential()
console.log('2. credential  session=' + credential.session.length + ' chars  userId=' + credential.userId.slice(0, 4) + '***')

try {
  await catalog.refresh()
  console.log('3. catalog     ' + catalog.current().length + ' text models from Loomy config')
  console.log('   ' + catalog.current().map(m => m.id).join(', '))
} catch (error) {
  console.warn('3. catalog     refresh FAILED, serving fallback list:', String(error))
}

// The gateway's own surface, called exactly as pi-ai calls it.
const headers = { Authorization: `Bearer ${shim.token()}` }
const listResponse = await fetch(`${shim.baseUrl()}/v1/models`, { headers })
const list = await listResponse.json()
console.log('4. gateway     GET /v1/models -> ' + listResponse.status + ' (' + list.data.length + ' models)')

// Hardening: without the process secret, and from a foreign browser Origin,
// the gateway must refuse even though the port is reachable.
const noSecret = await fetch(`${shim.baseUrl()}/v1/models`)
const foreignOrigin = await fetch(`${shim.baseUrl()}/v1/models`, {
  headers: { ...headers, Origin: 'https://evil.example' },
})
console.log(
  '5. hardening   no-secret -> ' + noSecret.status + ' (want 401)   foreign-origin -> ' + foreignOrigin.status + ' (want 403)',
)

const { adapter } = createLoomyAdapter(catalog, shim)
const advertised = await adapter.listModels('loomy')
console.log('6. adapter     ' + advertised.length + ' models advertised: ' + advertised.map(m => m.id).join(', '))

const first = advertised[0]
const resolved = await adapter.resolveModel('loomy', first.id)
console.log(
  '7. resolve     ' + resolved.id + '  contextWindow=' + String(resolved.context?.contextWindow)
    + '  efforts=' + JSON.stringify((resolved.reasoning?.efforts ?? []).map(e => e.id)),
)

const model = target ?? first.id
console.log('8. streaming   one real reply via ' + model + ' …')
const started = Date.now()
let text = ''
let reasoning = 0
let usage
const kinds = {}
let thrown
try {
  for await (const chunk of adapter.stream({
    provider: 'loomy',
    model,
    system: '你是简洁的中文助手。',
    messages: [{
      id: 'e2e-1',
      role: 'user',
      content: [{ type: 'text', text: '只回复八个字以内：链路验证成功' }],
      source: { kind: 'user' },
    }],
  })) {
    kinds[chunk.type] = (kinds[chunk.type] ?? 0) + 1
    if (chunk.type === 'text-delta') text += chunk.text
    else if (chunk.type === 'reasoning-delta') reasoning += chunk.text.length
    else if (chunk.type === 'usage') usage = chunk.usage
  }
} catch (error) {
  thrown = error
}
console.log('   chunks      ' + JSON.stringify(kinds))
if (thrown !== undefined) console.log('   THREW       ' + (thrown?.stack ?? String(thrown)))
console.log('   reply       ' + JSON.stringify(text))
console.log('   reasoning   ' + reasoning + ' chars, usage=' + (usage === undefined ? '(none)' : JSON.stringify(usage)))
console.log('   elapsed     ' + ((Date.now() - started) / 1000).toFixed(1) + 's')

await shim.close()
if (text.length === 0) {
  console.error('E2E FAILED: empty reply')
  process.exit(1)
}
console.log('E2E OK')
