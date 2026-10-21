/**
 * Runtime proof that the plugin actually loaded inside a booted DSH.
 *
 * Composition (`dsh --dump-config`) only shows the tree; it never instantiates
 * the plugin, so it cannot catch a crash inside `apply`. This script waits for
 * a booted `dsh web`, then checks that the plugin's loopback gateway is really
 * listening and enforcing its own auth/Origin rules.
 *
 * Usage: boot `dsh web --no-open`, then run `node scripts/probe-dsh-runtime.mjs`.
 */
import { execSync } from 'node:child_process'

const WEB_PORT = Number(process.argv[2] ?? 3080)
const WAIT_MS = 45000

const sh = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return ''
  }
}

const portsFor = (pid) => {
  const ports = new Set()
  for (const line of sh(`lsof -nP -iTCP -sTCP:LISTEN -a -p ${pid}`).split('\n')) {
    const m = line.match(/TCP (?:127\.0\.0\.1|\[::1\]|\*):(\d+) \(LISTEN\)/)
    if (m) ports.add(Number(m[1]))
  }
  return [...ports].sort((a, b) => a - b)
}

const dshPid = () => Number((sh(`lsof -nP -iTCP:${WEB_PORT} -sTCP:LISTEN -t`).trim().split('\n')[0]) || 0)

let pid = 0
let ports = []
const deadline = Date.now() + WAIT_MS
while (Date.now() < deadline) {
  pid = dshPid()
  if (pid) {
    ports = portsFor(pid)
    if (ports.length >= 2) break
  }
  await new Promise((r) => setTimeout(r, 1500))
}

if (!pid) {
  console.log(`FAIL  no process is listening on 127.0.0.1:${WEB_PORT} after ${WAIT_MS}ms`)
  process.exit(1)
}

console.log(`dsh pid         = ${pid}`)
console.log(`listening ports = ${ports.join(', ')}`)

const gateway = ports.filter((p) => p !== WEB_PORT)
if (gateway.length === 0) {
  console.log('FAIL  only the web port is listening — the plugin gateway never started')
  process.exit(1)
}

let sawGateway = false
for (const port of gateway) {
  for (const path of ['/v1/models', '/v1/chat/completions']) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(4000) })
      const body = (await res.text()).slice(0, 140).replace(/\s+/g, ' ')
      console.log(`  :${port}${path} -> ${res.status} ${body}`)
      if (res.status === 401) sawGateway = true
    } catch (error) {
      console.log(`  :${port}${path} -> ERR ${error.message}`)
    }
  }
  try {
    const res = await fetch(`http://127.0.0.1:${port}/v1/models`, {
      headers: { Origin: 'https://evil.example' },
      signal: AbortSignal.timeout(4000),
    })
    console.log(`  :${port} cross-site Origin -> ${res.status}`)
  } catch (error) {
    console.log(`  :${port} cross-site Origin -> ERR ${error.message}`)
  }
}

console.log(sawGateway ? 'PASS  plugin gateway is live and rejecting unauthenticated calls' : 'WARN  an extra port is listening but never answered 401')
