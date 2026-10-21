/**
 * Shared loopback gates for the plugin's local HTTP surfaces: the credential
 * shim and the same-origin web-status route. Both are only ever meant to be
 * addressed through the machine's loopback interface.
 *
 * @module dsh-loomy-connect/loopback
 */

/**
 * A `Host` header value names loopback. A DNS-rebinding page (an attacker
 * domain re-resolved to 127.0.0.1) still sends its own domain in `Host`, so
 * this check drops those before any routing happens.
 */
export function loopbackHost(value: string | undefined): boolean {
  if (value === undefined) return false
  const host = value.trim().toLowerCase().replace(/^\[|\]$/gu, '')
  const bare = host.replace(/:\d+$/u, '')
  return bare === '127.0.0.1' || bare === 'localhost' || bare === '::1'
}

/**
 * A browser-sent `Origin` must be loopback. Non-browser clients (the OpenAI
 * client pi-ai drives) send no `Origin` at all and pass.
 */
export function loopbackOrigin(value: string | undefined): boolean {
  if (value === undefined || value.trim() === '') return true
  try {
    const url = new URL(value)
    return loopbackHost(url.host) && (url.protocol === 'http:' || url.protocol === 'https:')
  } catch { return false }
}
