/** A credential-protected loopback gateway; DSH never receives Loomy's session token. */
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { readLoomyCredential } from './auth.ts'
import type { LoomyCatalog } from './catalog.ts'
import { loopbackHost, loopbackOrigin } from './loopback.ts'
import { LoomyUpstreamClient, prepareLoomyBody } from './upstream.ts'

export interface LoomyShim { ready: Promise<void>; baseUrl(): string; token(): string; close(): Promise<void> }
/**
 * Where the desktop app's auth file lives. A thunk is accepted so the value the
 * Plugin configuration card writes takes effect on the next request instead of
 * only after a Harness restart — the shim is built before settings attach.
 */
export type LoomyAuthFile = string | (() => string | undefined)
export interface LoomyShimOptions { catalog: LoomyCatalog; authFile?: LoomyAuthFile; logger?: { warn(...args: unknown[]): void } }

/** Resolve a possibly-dynamic auth-file location at call time. */
export function resolveAuthFile(value: LoomyAuthFile | undefined): string | undefined {
  return typeof value === 'function' ? value() : value
}

const REQUEST_BODY_LIMIT = 64 * 1024 * 1024
const REQUEST_TIMEOUT_MS = 20 * 60 * 1000

function json(res: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
}
function authorized(req: IncomingMessage, secret: string): boolean {
  const bearer = /^Bearer\s+(.+)$/iu.exec(req.headers.authorization ?? '')?.[1]
  if (bearer === undefined) return false
  const a = Buffer.from(bearer); const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}
function isJson(req: IncomingMessage): boolean {
  const type = req.headers['content-type']
  return typeof type === 'string' && type.trim().toLowerCase().startsWith('application/json')
}
async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []; let length = 0
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk); length += buffer.length
    if (length > REQUEST_BODY_LIMIT) throw new Error('request body too large')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

export function createLoomyShim(options: LoomyShimOptions): LoomyShim {
  const secret = randomBytes(32).toString('base64url')
  const client = new LoomyUpstreamClient()
  const server = createServer((req, res) => { void handle(req, res) })
  const ready = new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject) })
  server.listen(0, '127.0.0.1')
  const baseUrl = (): string => {
    const address = server.address(); if (address === null || typeof address === 'string') throw new Error('Loomy gateway is not listening')
    return `http://127.0.0.1:${address.port}`
  }
  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!loopbackHost(req.headers.host)) return json(res, 403, { error: { message: 'loopback host required' } })
    if (!loopbackOrigin(req.headers.origin)) return json(res, 403, { error: { message: 'loopback origin required' } })
    if (!authorized(req, secret)) return json(res, 401, { error: { message: 'invalid gateway credential' } })
    const url = req.url ?? '/'
    if (req.method === 'GET' && url.startsWith('/healthz')) return json(res, 200, { ok: true })
    if (req.method === 'GET' && url.startsWith('/v1/models')) return json(res, 200, { object: 'list', data: options.catalog.current().map(model => ({ id: model.id, object: 'model', created: 0, owned_by: 'loomy' })) })
    if (req.method !== 'POST' || !url.startsWith('/v1/chat/completions')) return json(res, 404, { error: { message: 'not found' } })
    if (!isJson(req)) return json(res, 415, { error: { message: 'Content-Type must be application/json' } })
    // Abort upstream work as soon as the caller goes away, with a hard ceiling
    // in case a stream stalls without ever closing.
    //
    // The signal must hang off the *response*: an IncomingMessage emits
    // 'close' once its body has been fully consumed, which is immediately for
    // every request here, and aborting there would cancel the upstream call
    // before it ever produced a token.
    const controller = new AbortController()
    res.on('close', () => { if (!res.writableEnded) controller.abort() })
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
    try {
      const credential = await readLoomyCredential(resolveAuthFile(options.authFile))
      const response = await client.chatStream(credential, prepareLoomyBody(await readBody(req)), signal)
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
      if (response.body === null) { res.end('data: [DONE]\n\n'); return }
      const stream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0])
      let sawDone = false
      stream.on('data', (chunk: Buffer) => { if (chunk.includes('[DONE]')) sawDone = true })
      stream.on('error', (error: unknown) => {
        options.logger?.warn('dsh-loomy-connect: upstream stream failed mid-flight', error)
        if (!sawDone && res.writable) res.end('data: [DONE]\n\n')
      })
      stream.pipe(res)
    } catch (error: unknown) {
      if (!res.headersSent) json(res, 502, { error: { message: String(error) } })
      else res.end()
    }
  }
  return { ready, baseUrl, token: () => secret, close: () => new Promise((resolve, reject) => { server.close(error => error === undefined ? resolve() : reject(error)); server.closeAllConnections() }) }
}
