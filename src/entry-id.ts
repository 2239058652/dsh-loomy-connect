/**
 * Identity shared by the host and browser halves.
 *
 * `LOOMY_ENTRY_ID` is the cordis patch entry id in `cordis.patch.yml`, which
 * also becomes the settings namespace in DSH 0.2.1. The browser half keys the
 * provider card and the row configuration page by it, so changing the patch id
 * without changing this constant silently unhooks both.
 */

/** Package name, used as the bundle key on the Plugins page. */
export const LOOMY_PACKAGE = 'dsh-loomy-connect'

/** Profile entry id declared by `cordis.patch.yml`. */
export const LOOMY_ENTRY_ID = 'llm-loomy'

/** LLM provider route registered with `ctx.llm`. */
export const LOOMY_PROVIDER = 'loomy'
