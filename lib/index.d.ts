import Schema from "@deepseek-ai/schemastery";
import { PiAiAdapter } from "@deepseek-ai/dsh-llm-pi-ai";
import { IncomingMessage, ServerResponse } from "node:http";
import { Context } from "@deepseek-ai/cordis";

//#region src/entry-id.d.ts
/**
 * Identity shared by the host and browser halves.
 *
 * `LOOMY_ENTRY_ID` is the cordis patch entry id in `cordis.patch.yml`, which
 * also becomes the settings namespace in DSH 0.2.1. The browser half keys the
 * provider card and the row configuration page by it, so changing the patch id
 * without changing this constant silently unhooks both.
 */
/** Package name, used as the bundle key on the Plugins page. */
declare const LOOMY_PACKAGE = "dsh-loomy-connect";
/** Profile entry id declared by `cordis.patch.yml`. */
declare const LOOMY_ENTRY_ID = "llm-loomy";
/** LLM provider route registered with `ctx.llm`. */
declare const LOOMY_PROVIDER = "loomy";
//#endregion
//#region src/auth.d.ts
/**
 * The `localStorage` key Loomy's renderer keeps the sign-in session under.
 *
 * Only the Windows build relies on it: there Loomy keeps the session in the
 * renderer's own storage and never writes the `auth-session.json` sidecar the
 * macOS build leaves in its Electron data dir.
 */
declare const LOOMY_AUTH_SESSION_KEY = "loomy-auth-session";
interface LoomyCredential {
  session: string;
  userId: string;
  /** Already-masked phone number Loomy stores alongside the session, for display only. */
  maskedPhone?: string;
}
/** The first existing auth file, or the primary platform default when none yet. */
declare function defaultLoomyAuthPath(): string;
/** The first existing config file, or the primary platform default when none yet. */
declare function defaultLoomyConfigPath(): string;
declare function parseLoomyAuth(text: string): LoomyCredential | undefined;
/**
 * Every session cached in one LevelDB log, oldest first.
 *
 * The log is append-only, so several records can share the key; `loggedInAt`
 * decides which is current rather than file order.
 */
declare function extractLoomyAuthSessions(text: string): LoomyCredential[];
/** The newest session in Loomy's localStorage, or undefined when there is none. */
declare function readLoomySessionFromStorage(dir?: string): Promise<LoomyCredential | undefined>;
declare function readLoomyCredential(authFile?: string): Promise<LoomyCredential>;
//#endregion
//#region src/catalog.d.ts
interface LoomyModel {
  id: string;
  name: string;
  /**
   * Context window in tokens, exactly when the source carries one.
   *
   * Loomy's `/v1/models` fills `context_length` for chat models but leaves it
   * off some image generators, and the offline snapshot should not invent
   * numbers either — `undefined` means unknown, which the card renders as
   * `未提供` instead of a plausible-looking guess.
   */
  contextWindow: number | undefined;
  maxTokens: number | undefined;
  supportsImages: boolean;
  reasoning: boolean;
  /** Points multiplier Loomy prints in the model name — 3 for `x3.0`. */
  rate?: number;
  /** Promotional label Loomy prints in the model name, e.g. 限时免费. */
  promo?: string;
  /** True for image generators: listed for reference, never served to DSH. */
  image?: boolean;
}
/** Parse Loomy's `/v1/models` response; every entry that has an id survives. */
declare function parseLoomyApiModels(text: string): readonly LoomyModel[];
/** Parse Loomy's generated OpenCode config, the source the macOS build writes. */
declare function parseLoomyModels(text: string): readonly LoomyModel[];
/**
 * The account's model list.
 *
 * Loomy's `/v1/models` is authoritative and carries the rates, so it is the
 * preferred source; the generated OpenCode config is the fallback for builds
 * or sessions where the API cannot be reached.
 */
declare class LoomyCatalog {
  private served;
  private discovered;
  private blocked;
  /** Models DSH can actually call: text models the user has not disabled. */
  current(): readonly LoomyModel[];
  /** Everything Loomy lists, image generators included, for the card to show. */
  all(): readonly LoomyModel[];
  /** The ids the user switched off, as the profile stored them. */
  blockedIds(): readonly string[];
  /** Whether the user switched this model off in the plugin's own settings. */
  isBlocked(id: string): boolean;
  /**
   * Apply the user's disabled-model list.
   *
   * The filter runs over whatever the catalog holds, so it survives a refresh:
   * `accept()` recomputes the served list from the same set. Disabling every
   * model legitimately leaves nothing served — the provider then offers no
   * models, which is what the switch means.
   */
  setBlocked(ids: readonly string[]): void;
  private recompute;
  private accept;
  refreshFromApi(credential: LoomyCredential, signal?: AbortSignal): Promise<void>;
  refreshFromFile(configFile?: string): Promise<void>;
}
//#endregion
//#region src/shim.d.ts
interface LoomyShim {
  ready: Promise<void>;
  baseUrl(): string;
  token(): string;
  close(): Promise<void>;
}
/**
 * Where the desktop app's auth file lives. A thunk is accepted so the value the
 * Plugin configuration card writes takes effect on the next request instead of
 * only after a Harness restart — the shim is built before settings attach.
 */
type LoomyAuthFile = string | (() => string | undefined);
interface LoomyShimOptions {
  catalog: LoomyCatalog;
  authFile?: LoomyAuthFile;
  logger?: {
    warn(...args: unknown[]): void;
  };
}
/** Resolve a possibly-dynamic auth-file location at call time. */
declare function resolveAuthFile(value: LoomyAuthFile | undefined): string | undefined;
declare function createLoomyShim(options: LoomyShimOptions): LoomyShim;
//#endregion
//#region src/adapter.d.ts
/** What {@link createLoomyAdapter} hands back. */
interface LoomyAdapter {
  adapter: PiAiAdapter;
  /** Rebuild the adapter's provider snapshot; call after a catalog update. */
  invalidate(): void;
}
declare function createLoomyAdapter(catalog: LoomyCatalog, shim: LoomyShim): LoomyAdapter;
//#endregion
//#region src/upstream.d.ts
declare const LOOMY_API_BASE = "https://loomyad.xunfei.cn/api/v1";
declare class LoomyUpstreamClient {
  /**
   * The account's model list, carrying Loomy's own rate labels.
   *
   * Preferred over Loomy's generated OpenCode config: it is the same list the
   * app renders, it exists on every platform, and it is the only source that
   * says what each model costs.
   */
  models(credential: LoomyCredential, signal?: AbortSignal): Promise<string>;
  chatStream(credential: LoomyCredential, body: string, signal?: AbortSignal): Promise<Response>;
}
/** Preserve tool calls; add the options Loomy sends for agent conversations. */
declare function prepareLoomyBody(source: string): string;
//#endregion
//#region src/loopback.d.ts
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
declare function loopbackHost(value: string | undefined): boolean;
/**
 * A browser-sent `Origin` must be loopback. Non-browser clients (the OpenAI
 * client pi-ai drives) send no `Origin` at all and pass.
 */
declare function loopbackOrigin(value: string | undefined): boolean;
//#endregion
//#region src/points.d.ts
/**
 * Read Loomy's own points summary straight off disk.
 *
 * Loomy is an Electron app whose renderer keeps the account's points summary in
 * `localStorage` under the key `loomy-points-summary`, shaped
 * `{ balance, dailyBalance, updatedAt, … }`. Loomy's own sidebar reads that
 * cache to render 永久积分 / 每日赠送积分, so the numbers the card shows are
 * the same numbers the user sees in the app.
 *
 * There is no documented HTTP endpoint for this: the model gateway at
 * `loomyad.xunfei.cn` answers 404 for `/v1/credits`, and the points calls the
 * renderer makes go through `window.electronAPI.points.*` IPC, which only the
 * running app can serve. Reading the cache is therefore the only external way
 * to get these numbers, and it is read-only.
 *
 * Chromium's `localStorage` lives in a LevelDB log, which is append-only: a
 * key's old values stay in the file behind newer ones. We parse every candidate
 * record and keep the newest by `updatedAt` rather than trusting file order.
 *
 * @module dsh-loomy-connect/points
 */
/** The localStorage key Loomy's renderer writes the points summary to. */
declare const LOOMY_POINTS_KEY = "loomy-points-summary";
/** The first existing localStorage dir, or the primary platform default when none yet. */
declare function defaultLoomyLocalStorageDir(): string;
/** One account's points split the way Loomy's own UI presents it. */
interface LoomyPointsSummary {
  /** Long-lived points — Loomy labels these 永久积分. */
  permanent: number;
  /** Points refilled each sign-in day — Loomy labels these 每日赠送积分. */
  daily: number;
  /** ISO timestamp of the last time Loomy refreshed the summary. */
  updatedAt?: string;
}
/** Parse one cached record, keeping only the fields the card renders. */
declare function parseLoomyPointsRecord(raw: string): LoomyPointsSummary | undefined;
/** Every cached summary in one LevelDB log, oldest first. */
declare function extractLoomyPoints(text: string): LoomyPointsSummary[];
/** Newest record wins; `updatedAt` decides, file order breaks ties. */
declare function newestLoomyPoints(records: readonly LoomyPointsSummary[]): LoomyPointsSummary | undefined;
/**
 * Read the account's points summary from Loomy's localStorage.
 *
 * Returns `undefined` when Loomy has never cached a summary (or is not
 * installed) so the card can degrade instead of showing a bogus zero.
 */
declare function readLoomyPoints(dir?: string): Promise<LoomyPointsSummary | undefined>;
/** Drop the memoized read; tests and the status route use this. */
declare function resetLoomyPointsCache(): void;
//#endregion
//#region src/status-paths.d.ts
/** Node-free constants and types shared by the Host and browser halves. */
/** Plugin-owned status endpoint consumed by its browser half. */
declare const LOOMY_STATUS_PATH = "/plugins/dsh-loomy-connect/status";
/** The account's points split the way Loomy's own UI presents it. */
interface LoomyWebPoints {
  /** Long-lived points — Loomy labels these 永久积分. */
  permanent: number;
  /** Points refilled each sign-in day; 每日赠送积分. Resets to 5000 daily. */
  daily: number;
  /** ISO timestamp of Loomy's last refresh, so the card can show staleness. */
  updatedAt?: string;
}
/** One model as Loomy lists it, including the rate it bills at. */
interface LoomyWebModel {
  id: string;
  /** Loomy's own display name, which carries the rate (e.g. `…（x3.0）`). */
  name: string;
  /** Points multiplier Loomy prints in the name — 3 for `x3.0`. */
  rate?: number;
  /** Promotional label Loomy prints in the name, e.g. 限时免费. */
  promo?: string;
  /** True for image generators: listed for reference, never served to DSH. */
  image?: boolean;
  /**
   * Context window in tokens, when Loomy's list carries one. Absent means
   * unknown — e.g. some image generators ship without `context_length` — and
   * the card renders that as `未提供` rather than guessing.
   */
  contextWindow?: number;
  /**
   * True when the user switched this model off. The card still lists it so it
   * can be switched back on; the provider never serves it.
   */
  disabled?: boolean;
}
/** The JSON document the plugin card renders. */
type LoomyWebStatus = {
  status: 'signed-out';
} | {
  status: 'signed-in'; /** Masked sign-in identity (Loomy stores a masked phone number). */
  account?: string; /** How many models the plugin is currently serving. */
  modelCount: number; /** Every model the account can reach, including image generators. */
  models?: LoomyWebModel[]; /** Ids the user switched off, in the order the profile stores them. */
  blockedModels?: string[];
  points?: LoomyWebPoints;
  pointsError?: string;
} | {
  status: 'error';
  message: string;
};
//#endregion
//#region src/web-status.d.ts
/** Constructor dependencies. */
interface LoomyStatusRouteOptions {
  /** Current sign-in state; `undefined` means signed out. */
  credential: () => Promise<LoomyCredential | undefined>;
  /** Points summary, or `undefined` when Loomy has not cached one. */
  points: () => Promise<LoomyPointsSummary | undefined>;
  /** How many models the plugin currently serves. */
  modelCount: () => number;
  /** Every model the account can reach, for the card to list with its rate. */
  models?: () => LoomyWebModel[];
  /** Ids the user switched off, so the card can mark them without guessing. */
  blockedModels?: () => readonly string[];
  /**
   * Re-pull the catalog and drop the memoized points read. Called for an
   * explicit refresh only — the card's polling pass must stay cheap.
   */
  refresh?: () => Promise<void>;
}
/**
 * Assemble the card's status document.
 *
 * `force` re-reads everything before answering: the model list is re-pulled and
 * the memoized points read is dropped. Without it the answer is assembled from
 * whatever the host already holds, which is what the card's polling wants.
 *
 * Points come from Loomy's own cache, so a missing or unreadable cache
 * degrades to `pointsError` rather than failing the whole document.
 */
declare function loomyWebStatus(deps: LoomyStatusRouteOptions, force?: boolean): Promise<LoomyWebStatus>;
/** The status route's request handler, extracted so tests can mount it on a bare server. */
declare function loomyStatusHandler(deps: LoomyStatusRouteOptions): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
/** Mount the GET status route on an optional webServer context. */
declare function registerLoomyStatusRoute(ctx: Context, deps: LoomyStatusRouteOptions): void;
//#endregion
//#region src/index.d.ts
declare const name = "llm-loomy";
declare const inject: string[];
/**
 * Runtime config schema. cordis resolves a loader entry's config through this
 * schema before calling `apply`.
 *
 * DSH 0.2.x only exposes fields marked `.volatile()` to the settings forms,
 * and commits a live edit into the running config reference instead of
 * remounting the plugin. The two paths are therefore read through
 * {@link readField} on every request rather than copied into a closure.
 */
declare const Config: Schema<Schemastery.ObjectS<NoInfer<{
  authFile: Schema<string, string, "volatile">;
  configFile: Schema<string, string, "volatile">;
  disabledModels: Schema<NoInfer<string[]>, NoInfer<string[]>, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
  authFile: Schema<string, string, "volatile">;
  configFile: Schema<string, string, "volatile">;
  disabledModels: Schema<NoInfer<string[]>, NoInfer<string[]>, "volatile-defined">;
}>>, "plain">;
/** One config field: a plain value, or a reference the loader commits into. */
type Field<T> = T | {
  get(): T;
} | undefined;
/** Config as seen inside {@link apply}. */
interface ConfigShape {
  authFile?: Field<string>;
  configFile?: Field<string>;
  disabledModels?: Field<string[]>;
}
declare function apply(ctx: Context, config?: ConfigShape): void;
//#endregion
export { Config, ConfigShape, LOOMY_API_BASE, LOOMY_AUTH_SESSION_KEY, LOOMY_ENTRY_ID, LOOMY_PACKAGE, LOOMY_POINTS_KEY, LOOMY_PROVIDER, LOOMY_STATUS_PATH, type LoomyAdapter, type LoomyAuthFile, LoomyCatalog, type LoomyCredential, type LoomyModel, type LoomyPointsSummary, type LoomyShim, type LoomyShimOptions, type LoomyStatusRouteOptions, LoomyUpstreamClient, type LoomyWebPoints, type LoomyWebStatus, apply, createLoomyAdapter, createLoomyShim, defaultLoomyAuthPath, defaultLoomyConfigPath, defaultLoomyLocalStorageDir, extractLoomyAuthSessions, extractLoomyPoints, inject, loomyStatusHandler, loomyWebStatus, loopbackHost, loopbackOrigin, name, newestLoomyPoints, parseLoomyApiModels, parseLoomyAuth, parseLoomyModels, parseLoomyPointsRecord, prepareLoomyBody, readLoomyCredential, readLoomyPoints, readLoomySessionFromStorage, registerLoomyStatusRoute, resetLoomyPointsCache, resolveAuthFile };