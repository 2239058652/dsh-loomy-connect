/**
 * Probe Loomy endpoints for a credit/balance answer.
 *
 * The app bundle calls `${baseUrl.origin}/v1/credits` (i.e. https://loomyad.xunfei.cn/v1/credits)
 * and validates it against `{ balance: string, total_used: string }`. That shape is a single
 * total, so this probe also tries neighbouring paths in case a per-package breakdown exists.
 *
 * Usage: node scripts/probe-credits.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const authCandidates = [
  join(homedir(), 'Library', 'Application Support', 'loomy', 'auth-session.json'),
  join(homedir(), '.config', 'loomy', 'auth-session.json'),
  ...(process.env.APPDATA ? [join(process.env.APPDATA, 'loomy', 'auth-session.json')] : []),
]
const authFile = process.env.LOOMY_AUTH_FILE ?? authCandidates.find(c => existsSync(c)) ?? authCandidates[0]
const auth = JSON.parse(readFileSync(authFile, 'utf8'))
const headers = {
  Accept: 'application/json',
  Authorization: `Bearer ${auth.session}`,
  token: auth.session,
  'X-User-Id': auth.userid,
}

const candidates = [
  'https://loomyad.xunfei.cn/v1/credits',
  'https://loomyad.xunfei.cn/api/v1/credits',
  'https://loomyad.xunfei.cn/v1/points',
  'https://loomyad.xunfei.cn/api/v1/points',
  'https://loomyad.xunfei.cn/v1/user/credits',
  'https://loomyad.xunfei.cn/v1/quota',
  'https://loomyad.xunfei.cn/api/v1/user/info',
  'https://loomyad.xunfei.cn/v1/user/info',
  'https://loomyad.xunfei.cn/v1/models',
]

for (const url of candidates) {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(12_000) })
    const text = (await response.text()).slice(0, 600)
    console.log(`${response.status}  ${url}`)
    console.log(`     ${text.replace(/\s+/g, ' ')}`)
  } catch (error) {
    console.log(`ERR  ${url}  ${error instanceof Error ? error.message : String(error)}`)
  }
}
