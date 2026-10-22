import Schema from "@deepseek-ai/schemastery";
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createProvider } from "@earendil-works/pi-ai";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import { resolveRetryPolicy } from "@deepseek-ai/dsh-llm";
import { PiAiAdapter } from "@deepseek-ai/dsh-llm-pi-ai";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { Readable } from "node:stream";
//#region src/leveldb.ts
/**
* Shared readers for Chromium's LevelDB-backed `localStorage`.
*
* Loomy is an Electron app, so its renderer state lives in a LevelDB log under
* `Local Storage/leveldb`. The log is append-only: a key's older values stay in
* the file behind newer ones, so callers must expect several records per key
* and pick the one they want rather than trusting the first hit.
*
* @module dsh-loomy-connect/leveldb
*/
/**
* Slice one balanced JSON object starting at `start`.
*
* Braces inside strings are skipped, and the scan stops at an unbalanced
* closing brace so a truncated tail never swallows the record after it.
*/
function readJsonObject(text, start) {
	if (text[start] !== "{") return void 0;
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let i = start; i < text.length; i += 1) {
		const char = text[i];
		if (char === void 0) break;
		if (inString) {
			if (escaped) escaped = false;
			else if (char === "\\") escaped = true;
			else if (char === "\"") inString = false;
			continue;
		}
		if (char === "\"") inString = true;
		else if (char === "{") depth += 1;
		else if (char === "}") {
			depth -= 1;
			if (depth === 0) return text.slice(start, i + 1);
			if (depth < 0) return void 0;
		}
	}
}
/** Every JSON object stored under `key`, in the order it appears in the log. */
function extractLevelDbRecords(text, key) {
	const found = [];
	let index = text.indexOf(key);
	while (index !== -1) {
		const brace = text.indexOf("{", index + key.length);
		if (brace !== -1) {
			const raw = readJsonObject(text, brace);
			if (raw !== void 0) found.push(raw);
		}
		index = text.indexOf(key, index + key.length);
	}
	return found;
}
/** The log files Chromium keeps live records in. */
function levelDbFileNames(entries) {
	return entries.filter((name) => name.endsWith(".log") || name.endsWith(".ldb"));
}
/**
* Read every log file in `dir`, oldest-first by name. `latin1` keeps every byte
* so offsets stay honest; the JSON we want is pure ASCII either way.
*/
async function readLevelDbTexts(dir) {
	const names = levelDbFileNames(await readdir(dir)).sort();
	const texts = [];
	for (const name of names) texts.push(await readFile(join(dir, name), "latin1"));
	return texts;
}
/**
* A cheap fingerprint of the directory's contents. Callers memoize on it so a
* polling reader does not re-scan a multi-megabyte log on every tick.
*/
async function fingerprintLevelDbDir(dir) {
	let fingerprint = dir;
	try {
		const info = await stat(dir);
		fingerprint = `${dir}:${info.mtimeMs}:${info.size}`;
		for (const name of levelDbFileNames(await readdir(dir))) {
			const file = await stat(join(dir, name));
			fingerprint += `|${name}:${file.mtimeMs}:${file.size}`;
		}
	} catch {}
	return fingerprint;
}
//#endregion
//#region src/points.ts
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
const LOOMY_POINTS_KEY = "loomy-points-summary";
/**
* Candidate locations of Loomy's Electron `Local Storage/leveldb` cache,
* most-likely platform first. Loomy is an Electron app, so its data dir
* follows the platform convention: macOS `~/Library/Application Support/loomy`,
* Windows `%APPDATA%/loomy`. Searching every candidate keeps the points card
* working on whichever of the two Loomy was installed on.
*/
function defaultLoomyLocalStorageCandidates() {
	const appData = process.env.APPDATA;
	const candidates = [join(homedir(), "Library", "Application Support", "loomy", "Local Storage", "leveldb")];
	if (appData !== void 0) candidates.push(join(appData, "loomy", "Local Storage", "leveldb"));
	return candidates;
}
/** The first existing localStorage dir, or the primary platform default when none yet. */
function defaultLoomyLocalStorageDir() {
	for (const candidate of defaultLoomyLocalStorageCandidates()) if (existsSync(candidate)) return candidate;
	return defaultLoomyLocalStorageCandidates()[0];
}
/** Parse one cached record, keeping only the fields the card renders. */
function parseLoomyPointsRecord(raw) {
	try {
		const value = JSON.parse(raw);
		if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
		const record = value;
		const permanent = Number(record.balance);
		const daily = Number(record.dailyBalance);
		if (!Number.isFinite(permanent) && !Number.isFinite(daily)) return void 0;
		const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : void 0;
		return {
			permanent: Number.isFinite(permanent) ? permanent : 0,
			daily: Number.isFinite(daily) ? daily : 0,
			...updatedAt === void 0 ? {} : { updatedAt }
		};
	} catch {
		return;
	}
}
/** Every cached summary in one LevelDB log, oldest first. */
function extractLoomyPoints(text) {
	const found = [];
	for (const raw of extractLevelDbRecords(text, LOOMY_POINTS_KEY)) {
		const parsed = parseLoomyPointsRecord(raw);
		if (parsed !== void 0) found.push(parsed);
	}
	return found;
}
/** Newest record wins; `updatedAt` decides, file order breaks ties. */
function newestLoomyPoints(records) {
	let best;
	for (const record of records) {
		if (best === void 0) {
			best = record;
			continue;
		}
		const bestTime = best.updatedAt === void 0 ? -Infinity : Date.parse(best.updatedAt);
		if ((record.updatedAt === void 0 ? -Infinity : Date.parse(record.updatedAt)) >= bestTime) best = record;
	}
	return best;
}
/**
* Memoize on the directory's mtime/size so a polling card does not re-read a
* multi-megabyte log on every tick.
*/
let cache;
/**
* Read the account's points summary from Loomy's localStorage.
*
* Returns `undefined` when Loomy has never cached a summary (or is not
* installed) so the card can degrade instead of showing a bogus zero.
*/
async function readLoomyPoints(dir) {
	const path = dir ?? process.env.LOOMY_LOCAL_STORAGE_DIR ?? defaultLoomyLocalStorageDir();
	const fingerprint = await fingerprintLevelDbDir(path);
	if (cache !== void 0 && cache.key === fingerprint) return cache.value;
	const records = [];
	try {
		for (const text of await readLevelDbTexts(path)) records.push(...extractLoomyPoints(text));
	} catch {
		cache = {
			key: fingerprint,
			value: void 0
		};
		return;
	}
	const value = newestLoomyPoints(records);
	cache = {
		key: fingerprint,
		value
	};
	return value;
}
/** Drop the memoized read; tests and the status route use this. */
function resetLoomyPointsCache() {
	cache = void 0;
}
/**
* The `localStorage` key Loomy's renderer keeps the sign-in session under.
*
* Only the Windows build relies on it: there Loomy keeps the session in the
* renderer's own storage and never writes the `auth-session.json` sidecar the
* macOS build leaves in its Electron data dir.
*/
const LOOMY_AUTH_SESSION_KEY = "loomy-auth-session";
/** Loomy's OpenCode-style config home: `~/.config` on macOS. */
function configHome() {
	return join(homedir(), ".config");
}
/**
* Candidate locations of Loomy's desktop sign-in session, most-likely platform
* first. Loomy is an Electron app, so its data dir follows the platform
* convention: macOS `~/Library/Application Support/loomy`, Windows
* `%APPDATA%/loomy`. Searching every candidate keeps the plugin working
* whichever of the two it was installed on.
*/
function defaultLoomyAuthCandidates() {
	const appData = process.env.APPDATA;
	const candidates = [join(homedir(), "Library", "Application Support", "loomy", "auth-session.json")];
	if (appData !== void 0) candidates.push(join(appData, "loomy", "auth-session.json"));
	return candidates;
}
/** The first existing auth file, or the primary platform default when none yet. */
function defaultLoomyAuthPath() {
	for (const candidate of defaultLoomyAuthCandidates()) if (existsSync(candidate)) return candidate;
	return defaultLoomyAuthCandidates()[0];
}
/**
* Candidate locations of Loomy's generated OpenCode model config, most-likely
* platform first. macOS uses `~/.config/loomy-opencode`; on Windows the same
* layout lands under `%APPDATA%/loomy-opencode`.
*/
function defaultLoomyConfigCandidates() {
	const appData = process.env.APPDATA;
	const candidates = [join(configHome(), "loomy-opencode", "opencode.json")];
	if (appData !== void 0) candidates.push(join(appData, "loomy-opencode", "opencode.json"));
	return candidates;
}
/** The first existing config file, or the primary platform default when none yet. */
function defaultLoomyConfigPath() {
	for (const candidate of defaultLoomyConfigCandidates()) if (existsSync(candidate)) return candidate;
	return defaultLoomyConfigCandidates()[0];
}
/**
* Mask an 11-digit mainland-China phone for display: `132****2249`.
*
* The macOS build stores `phone` already masked; the Windows build keeps the
* raw number there and the masked form in a separate field. Masking here —
* rather than trusting either field — keeps one full number off the card.
*/
function maskPhone(value) {
	if (value.includes("*")) return value;
	if (/^\d{11}$/.test(value)) return `${value.slice(0, 3)}****${value.slice(7)}`;
	if (value.length <= 4) return value;
	return `${value.slice(0, Math.ceil(value.length / 3))}****${value.slice(-Math.ceil(value.length / 4))}`;
}
function parseLoomyAuth(text) {
	try {
		const value = JSON.parse(text);
		if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
		const record = value;
		const session = typeof record.session === "string" ? record.session.trim() : "";
		const userId = typeof record.userid === "string" ? record.userid.trim() : "";
		if (session === "" || userId === "") return void 0;
		const string = (field) => typeof field === "string" ? field.trim() : "";
		const phone = string(record.maskedPhone) || string(record.phone);
		return {
			session,
			userId,
			...phone === "" ? {} : { maskedPhone: maskPhone(phone) }
		};
	} catch {
		return;
	}
}
/** When Loomy last signed the session in, or -Infinity when it does not say. */
function loggedInAtOf(raw) {
	try {
		const value = JSON.parse(raw);
		if (typeof value !== "object" || value === null) return -Infinity;
		const at = value.loggedInAt;
		if (typeof at !== "string") return -Infinity;
		const parsed = Date.parse(at);
		return Number.isNaN(parsed) ? -Infinity : parsed;
	} catch {
		return -Infinity;
	}
}
/**
* Every session cached in one LevelDB log, oldest first.
*
* The log is append-only, so several records can share the key; `loggedInAt`
* decides which is current rather than file order.
*/
function extractLoomyAuthSessions(text) {
	const found = [];
	for (const raw of extractLevelDbRecords(text, LOOMY_AUTH_SESSION_KEY)) {
		const credential = parseLoomyAuth(raw);
		if (credential !== void 0) found.push({
			credential,
			time: loggedInAtOf(raw)
		});
	}
	found.sort((a, b) => a.time - b.time);
	return found.map((entry) => entry.credential);
}
/** The newest session in Loomy's localStorage, or undefined when there is none. */
async function readLoomySessionFromStorage(dir) {
	const path = dir ?? process.env.LOOMY_LOCAL_STORAGE_DIR ?? defaultLoomyLocalStorageDir();
	try {
		const sessions = [];
		for (const text of await readLevelDbTexts(path)) sessions.push(...extractLoomyAuthSessions(text));
		return sessions.at(-1);
	} catch {
		return;
	}
}
async function readLoomyCredential(authFile) {
	const override = authFile ?? process.env["LOOMY_AUTH_FILE"];
	const path = override ?? defaultLoomyAuthPath();
	const text = await readFile(path, "utf8").catch(() => void 0);
	if (text !== void 0) {
		const credential = parseLoomyAuth(text);
		if (credential !== void 0) return credential;
		if (override !== void 0) throw new Error(`Loomy sign-in file is not usable: ${path}`);
	}
	const stored = await readLoomySessionFromStorage();
	if (stored !== void 0) return stored;
	throw new Error("Loomy is not signed in. Sign in through the Loomy desktop app first.");
}
//#endregion
//#region src/upstream.ts
const LOOMY_API_BASE = "https://loomyad.xunfei.cn/api/v1";
var LoomyUpstreamClient = class {
	/**
	* The account's model list, carrying Loomy's own rate labels.
	*
	* Preferred over Loomy's generated OpenCode config: it is the same list the
	* app renders, it exists on every platform, and it is the only source that
	* says what each model costs.
	*/
	async models(credential, signal) {
		const response = await fetch(`${LOOMY_API_BASE}/models`, {
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${credential.session}`,
				token: credential.session,
				"X-User-Id": credential.userId
			},
			...signal === void 0 ? {} : { signal }
		});
		if (!response.ok) throw new Error(`Loomy model list failed (HTTP ${response.status})`);
		return response.text();
	}
	async chatStream(credential, body, signal) {
		const response = await fetch(`${LOOMY_API_BASE}/chat/completions`, {
			method: "POST",
			headers: {
				Accept: "text/event-stream",
				"Content-Type": "application/json",
				Authorization: `Bearer ${credential.session}`,
				token: credential.session,
				"X-User-Id": credential.userId
			},
			body,
			...signal === void 0 ? {} : { signal }
		});
		if (!response.ok) throw new Error(`Loomy request failed (HTTP ${response.status}): ${(await response.text()).slice(0, 400)}`);
		return response;
	}
};
/** Preserve tool calls; add the options Loomy sends for agent conversations. */
function prepareLoomyBody(source) {
	try {
		const value = JSON.parse(source);
		if (typeof value !== "object" || value === null || Array.isArray(value)) return source;
		const body = value;
		body.stream = true;
		if (typeof body.reasoning_effort === "string") body.reasoningEffort = body.reasoning_effort;
		if (Array.isArray(body.messages)) {
			for (const item of body.messages) if (typeof item === "object" && item !== null && item.role === "developer") item.role = "system";
		}
		return JSON.stringify(body);
	} catch {
		return source;
	}
}
//#endregion
//#region src/catalog.ts
/** Discover the models Loomy currently offers, with the rates it bills them at. */
/**
* Last resort when neither the API nor Loomy's own config can be read.
*
* A snapshot of Loomy's text models, so an offline start still yields a usable
* provider instead of an empty one.
*/
const FALLBACK = [
	{
		id: "deepseek-v4-flash-0731",
		name: "DeepSeek V4 Flash 0731",
		contextWindow: 1048576,
		maxTokens: 384e3,
		supportsImages: false,
		reasoning: true
	},
	{
		id: "mimo-v2.5",
		name: "MiMo V2.5",
		contextWindow: 1048576,
		maxTokens: 131072,
		supportsImages: true,
		reasoning: true
	},
	{
		id: "MiniMax-M3",
		name: "MiniMax M3",
		contextWindow: 1048576,
		maxTokens: 512e3,
		supportsImages: true,
		reasoning: true
	},
	{
		id: "Kimi-k2.6",
		name: "Kimi k2.6",
		contextWindow: 262144,
		maxTokens: 65536,
		supportsImages: true,
		reasoning: true
	},
	{
		id: "qwen-3.8-max",
		name: "Qwen 3.8 Max",
		contextWindow: 1e6,
		maxTokens: 65536,
		supportsImages: false,
		reasoning: true
	},
	{
		id: "GLM-5.3-Flash",
		name: "GLM 5.3 Flash",
		contextWindow: 1048576,
		maxTokens: 131072,
		supportsImages: true,
		reasoning: true
	},
	{
		id: "qwen3.8-flash",
		name: "Qwen 3.8 Flash",
		contextWindow: 1e6,
		maxTokens: 131072,
		supportsImages: true,
		reasoning: true
	},
	{
		id: "DeepSeek-V4-Pro-0813",
		name: "DeepSeek V4 Pro 0813",
		contextWindow: 1e6,
		maxTokens: 393216,
		supportsImages: false,
		reasoning: true
	},
	{
		id: "spark-x",
		name: "Spark X2.5",
		contextWindow: 1048576,
		maxTokens: 65536,
		supportsImages: false,
		reasoning: true
	},
	{
		id: "doubao-seed-2.0-mini",
		name: "Doubao Seed 2.0 mini",
		contextWindow: 262144,
		maxTokens: 131072,
		supportsImages: true,
		reasoning: true
	},
	{
		id: "qwen3.5-flash",
		name: "Qwen3.5 Flash",
		contextWindow: 1e6,
		maxTokens: 65536,
		supportsImages: true,
		reasoning: true
	}
];
/** A positive number, or `undefined` when the source does not carry one. */
function positiveOrUndefined(value) {
	return typeof value === "number" && value > 0 ? value : void 0;
}
/**
* Loomy prints the billing rate inside the model name — `…（x3.0）`,
* `…(x12.0)` — and flags giveaways there too, as `…（限时免费）`.
*/
const RATE_TAG = /[（(]\s*x\s*([0-9]+(?:\.[0-9]+)?)\s*[）)]/iu;
const PROMO_TAG = /[（(]([^（）()]*免费[^（）()]*)[）)]/u;
function rateOf(name) {
	const match = RATE_TAG.exec(name);
	if (match?.[1] === void 0) return void 0;
	const value = Number(match[1]);
	return Number.isFinite(value) ? value : void 0;
}
function promoOf(name) {
	return PROMO_TAG.exec(name)?.[1]?.trim();
}
/** Read a model entry out of Loomy's `/v1/models` list. */
function fromApiEntry(entry) {
	const id = typeof entry.id === "string" ? entry.id.trim() : "";
	if (id === "") return void 0;
	const name = typeof entry.name === "string" && entry.name.trim() !== "" ? entry.name.trim() : id;
	const capabilities = typeof entry.capabilities === "object" && entry.capabilities !== null && !Array.isArray(entry.capabilities) ? entry.capabilities : {};
	const arrayOf = (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
	const input = arrayOf(capabilities.input_modalities);
	const output = arrayOf(capabilities.output_modalities);
	const image = entry.type === "image" || output.length > 0 && !output.includes("text");
	return {
		id,
		name,
		contextWindow: positiveOrUndefined(entry.context_length),
		maxTokens: positiveOrUndefined(entry.max_output_tokens),
		supportsImages: input.includes("image"),
		reasoning: capabilities.reasoning === true,
		...image ? { image: true } : {},
		...rateOf(name) === void 0 ? {} : { rate: rateOf(name) },
		...promoOf(name) === void 0 ? {} : { promo: promoOf(name) }
	};
}
/** Parse Loomy's `/v1/models` response; every entry that has an id survives. */
function parseLoomyApiModels(text) {
	try {
		const document = JSON.parse(text);
		if (typeof document !== "object" || document === null) return [];
		const data = document.data;
		if (!Array.isArray(data)) return [];
		const models = [];
		for (const entry of data) {
			if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
			const model = fromApiEntry(entry);
			if (model !== void 0) models.push(model);
		}
		return models;
	} catch {
		return [];
	}
}
/** Parse Loomy's generated OpenCode config, the source the macOS build writes. */
function parseLoomyModels(text) {
	try {
		const document = JSON.parse(text);
		if (typeof document !== "object" || document === null || Array.isArray(document)) return [];
		const provider = document.provider;
		if (typeof provider !== "object" || provider === null || Array.isArray(provider)) return [];
		const imodel = provider.imodel;
		if (typeof imodel !== "object" || imodel === null || Array.isArray(imodel)) return [];
		const models = imodel.models;
		if (typeof models !== "object" || models === null || Array.isArray(models)) return [];
		const result = [];
		for (const [id, value] of Object.entries(models)) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
			const model = value;
			const modalities = model.modalities;
			const input = Array.isArray(modalities?.input) ? modalities.input : [];
			const output = Array.isArray(modalities?.output) ? modalities.output : ["text"];
			const name = typeof model.name === "string" && model.name.trim() !== "" ? model.name : id;
			const limit = model.limit;
			result.push({
				id,
				name,
				contextWindow: positiveOrUndefined(limit?.context),
				maxTokens: positiveOrUndefined(limit?.output),
				supportsImages: input.includes("image"),
				reasoning: model.reasoning === true || typeof model.variants === "object",
				...!output.includes("text") ? { image: true } : {},
				...rateOf(name) === void 0 ? {} : { rate: rateOf(name) },
				...promoOf(name) === void 0 ? {} : { promo: promoOf(name) }
			});
		}
		return result;
	} catch {
		return [];
	}
}
/**
* The account's model list.
*
* Loomy's `/v1/models` is authoritative and carries the rates, so it is the
* preferred source; the generated OpenCode config is the fallback for builds
* or sessions where the API cannot be reached.
*/
var LoomyCatalog = class {
	served = FALLBACK;
	discovered = FALLBACK;
	blocked = [];
	/** Models DSH can actually call: text models the user has not disabled. */
	current() {
		return this.served;
	}
	/** Everything Loomy lists, image generators included, for the card to show. */
	all() {
		return this.discovered;
	}
	/** The ids the user switched off, as the profile stored them. */
	blockedIds() {
		return this.blocked;
	}
	/** Whether the user switched this model off in the plugin's own settings. */
	isBlocked(id) {
		return this.blocked.includes(id);
	}
	/**
	* Apply the user's disabled-model list.
	*
	* The filter runs over whatever the catalog holds, so it survives a refresh:
	* `accept()` recomputes the served list from the same set. Disabling every
	* model legitimately leaves nothing served — the provider then offers no
	* models, which is what the switch means.
	*/
	setBlocked(ids) {
		this.blocked = [...ids];
		this.recompute();
	}
	recompute() {
		this.served = this.discovered.filter((model) => model.image !== true && !this.blocked.includes(model.id));
	}
	accept(models) {
		if (models.length === 0) return;
		this.discovered = models;
		this.recompute();
	}
	async refreshFromApi(credential, signal) {
		this.accept(parseLoomyApiModels(await new LoomyUpstreamClient().models(credential, signal)));
	}
	async refreshFromFile(configFile) {
		const path = configFile ?? process.env["LOOMY_CONFIG_FILE"] ?? defaultLoomyConfigPath();
		this.accept(parseLoomyModels(await readFile(path, "utf8")));
	}
};
//#endregion
//#region src/entry-id.ts
/**
* Identity shared by the host and browser halves.
*
* `LOOMY_ENTRY_ID` is the cordis patch entry id in `cordis.patch.yml`, which
* also becomes the settings namespace in DSH 0.2.1. The browser half keys the
* provider card and the row configuration page by it, so changing the patch id
* without changing this constant silently unhooks both.
*/
/** Package name, used as the bundle key on the Plugins page. */
const LOOMY_PACKAGE = "dsh-loomy-connect";
/** Profile entry id declared by `cordis.patch.yml`. */
const LOOMY_ENTRY_ID = "llm-loomy";
/** LLM provider route registered with `ctx.llm`. */
const LOOMY_PROVIDER = "loomy";
//#endregion
//#region src/adapter.ts
const inertAuth = {
	credentials: {
		async read() {},
		async list() {
			return [];
		},
		async modify() {
			throw new Error("Loomy credentials are managed by the Loomy desktop app");
		},
		async delete() {}
	},
	authContext: {
		async env() {},
		async fileExists() {
			return false;
		}
	}
};
const noCost = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0
};
function modelFields(model, baseUrl) {
	return {
		id: model.id,
		name: model.name,
		provider: LOOMY_PROVIDER,
		api: "openai-completions",
		baseUrl,
		input: model.supportsImages ? ["text", "image"] : ["text"],
		reasoning: model.reasoning,
		...model.reasoning ? { thinkingLevelMap: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		} } : {},
		contextWindow: model.contextWindow ?? 128e3,
		maxTokens: model.maxTokens ?? 16384,
		cost: noCost
	};
}
function createLoomyAdapter(catalog, shim) {
	const models = () => catalog.current().map((model) => modelFields(model, `${shim.baseUrl()}/v1`));
	const provider = {
		...createProvider({
			id: LOOMY_PROVIDER,
			name: "Loomy",
			models: models(),
			api: openAICompletionsApi(),
			auth: { apiKey: {
				name: "Loomy desktop session (loopback gateway)",
				/**
				* pi-ai hands the request-level override the adapter supplies through
				* `resolveApiKey` back here as `credential.key`, and treats an
				* `undefined` return as "this provider is not configured" — the stream
				* then ends in a PI_AI_ERROR without ever reaching the gateway.
				*
				* The value consumed here is the gateway's per-process secret, never
				* the Loomy session token: the gateway resolves that from disk itself,
				* once per request.
				*/
				resolve({ credential }) {
					const apiKey = credential?.key ?? shim.token();
					return Promise.resolve({
						auth: { apiKey },
						source: "Loomy desktop session"
					});
				}
			} }
		}),
		getModels: models
	};
	const profile = {
		provider: LOOMY_PROVIDER,
		displayName: "Loomy",
		streamIdleTimeoutMs: 12e5,
		retryPolicy: resolveRetryPolicy(void 0, "dsh-loomy-connect retryPolicy"),
		configuredMaxTokens: /* @__PURE__ */ new Map(),
		modelErrors: /* @__PURE__ */ new Map(),
		maxRequestImageBytes: 20971520,
		requestImagePixelBudget: 4194304,
		requestImageMaxBytes: 1048576,
		piProvider: provider
	};
	let profiles = /* @__PURE__ */ new Map([[LOOMY_PROVIDER, profile]]);
	return {
		adapter: new PiAiAdapter({
			profiles: () => profiles,
			auth: inertAuth,
			resolveApiKey: async () => shim.token()
		}),
		invalidate() {
			profiles = /* @__PURE__ */ new Map([[LOOMY_PROVIDER, profile]]);
		}
	};
}
//#endregion
//#region src/loopback.ts
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
function loopbackHost(value) {
	if (value === void 0) return false;
	const bare = value.trim().toLowerCase().replace(/^\[|\]$/gu, "").replace(/:\d+$/u, "");
	return bare === "127.0.0.1" || bare === "localhost" || bare === "::1";
}
/**
* A browser-sent `Origin` must be loopback. Non-browser clients (the OpenAI
* client pi-ai drives) send no `Origin` at all and pass.
*/
function loopbackOrigin(value) {
	if (value === void 0 || value.trim() === "") return true;
	try {
		const url = new URL(value);
		return loopbackHost(url.host) && (url.protocol === "http:" || url.protocol === "https:");
	} catch {
		return false;
	}
}
//#endregion
//#region src/shim.ts
/** A credential-protected loopback gateway; DSH never receives Loomy's session token. */
/** Resolve a possibly-dynamic auth-file location at call time. */
function resolveAuthFile(value) {
	return typeof value === "function" ? value() : value;
}
const REQUEST_BODY_LIMIT = 64 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 1200 * 1e3;
function json$1(res, status, value) {
	const body = JSON.stringify(value);
	res.writeHead(status, {
		"Content-Type": "application/json",
		"Content-Length": Buffer.byteLength(body)
	});
	res.end(body);
}
function authorized(req, secret) {
	const bearer = /^Bearer\s+(.+)$/iu.exec(req.headers.authorization ?? "")?.[1];
	if (bearer === void 0) return false;
	const a = Buffer.from(bearer);
	const b = Buffer.from(secret);
	return a.length === b.length && timingSafeEqual(a, b);
}
function isJson(req) {
	const type = req.headers["content-type"];
	return typeof type === "string" && type.trim().toLowerCase().startsWith("application/json");
}
async function readBody(req) {
	const chunks = [];
	let length = 0;
	for await (const chunk of req) {
		const buffer = Buffer.from(chunk);
		length += buffer.length;
		if (length > REQUEST_BODY_LIMIT) throw new Error("request body too large");
		chunks.push(buffer);
	}
	return Buffer.concat(chunks).toString("utf8");
}
function createLoomyShim(options) {
	const secret = randomBytes(32).toString("base64url");
	const client = new LoomyUpstreamClient();
	const server = createServer((req, res) => {
		handle(req, res);
	});
	const ready = new Promise((resolve, reject) => {
		server.once("listening", resolve);
		server.once("error", reject);
	});
	server.listen(0, "127.0.0.1");
	const baseUrl = () => {
		const address = server.address();
		if (address === null || typeof address === "string") throw new Error("Loomy gateway is not listening");
		return `http://127.0.0.1:${address.port}`;
	};
	async function handle(req, res) {
		if (!loopbackHost(req.headers.host)) return json$1(res, 403, { error: { message: "loopback host required" } });
		if (!loopbackOrigin(req.headers.origin)) return json$1(res, 403, { error: { message: "loopback origin required" } });
		if (!authorized(req, secret)) return json$1(res, 401, { error: { message: "invalid gateway credential" } });
		const url = req.url ?? "/";
		if (req.method === "GET" && url.startsWith("/healthz")) return json$1(res, 200, { ok: true });
		if (req.method === "GET" && url.startsWith("/v1/models")) return json$1(res, 200, {
			object: "list",
			data: options.catalog.current().map((model) => ({
				id: model.id,
				object: "model",
				created: 0,
				owned_by: "loomy"
			}))
		});
		if (req.method !== "POST" || !url.startsWith("/v1/chat/completions")) return json$1(res, 404, { error: { message: "not found" } });
		if (!isJson(req)) return json$1(res, 415, { error: { message: "Content-Type must be application/json" } });
		const controller = new AbortController();
		res.on("close", () => {
			if (!res.writableEnded) controller.abort();
		});
		const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);
		try {
			const credential = await readLoomyCredential(resolveAuthFile(options.authFile));
			const response = await client.chatStream(credential, prepareLoomyBody(await readBody(req)), signal);
			res.writeHead(200, {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				"X-Accel-Buffering": "no"
			});
			if (response.body === null) {
				res.end("data: [DONE]\n\n");
				return;
			}
			const stream = Readable.fromWeb(response.body);
			let sawDone = false;
			stream.on("data", (chunk) => {
				if (chunk.includes("[DONE]")) sawDone = true;
			});
			stream.on("error", (error) => {
				options.logger?.warn("dsh-loomy-connect: upstream stream failed mid-flight", error);
				if (!sawDone && res.writable) res.end("data: [DONE]\n\n");
			});
			stream.pipe(res);
		} catch (error) {
			if (!res.headersSent) json$1(res, 502, { error: { message: String(error) } });
			else res.end();
		}
	}
	return {
		ready,
		baseUrl,
		token: () => secret,
		close: () => new Promise((resolve, reject) => {
			server.close((error) => error === void 0 ? resolve() : reject(error));
			server.closeAllConnections();
		})
	};
}
//#endregion
//#region src/status-paths.ts
/** Node-free constants and types shared by the Host and browser halves. */
/** Plugin-owned status endpoint consumed by its browser half. */
const LOOMY_STATUS_PATH = "/plugins/dsh-loomy-connect/status";
//#endregion
//#region src/web-status.ts
function json(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		"Content-Type": "application/json",
		"Content-Length": Buffer.byteLength(payload)
	});
	res.end(payload);
}
/** Strip anything session-shaped before a message crosses to the browser. */
function safeMessage(error) {
	return (error instanceof Error ? error.message : String(error)).replace(/[A-Za-z0-9_-]{24,}/gu, "[redacted]").slice(0, 500);
}
/**
* The request must be addressed to the loopback interface, and a
* browser-attached Origin must be loopback too. The Host check drops
* DNS-rebinding pages (their Host is the attacker's domain, not loopback);
* the card's same-origin fetches carry no Origin and pass on Host alone.
*/
function loopbackRequest(req) {
	return loopbackHost(req.headers.host) && loopbackOrigin(req.headers.origin);
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
async function loomyWebStatus(deps, force = false) {
	if (force) await deps.refresh?.();
	let credential;
	try {
		credential = await deps.credential();
	} catch {
		return { status: "signed-out" };
	}
	if (credential === void 0) return { status: "signed-out" };
	const blocked = deps.blockedModels?.() ?? [];
	const models = deps.models?.();
	const status = {
		status: "signed-in",
		modelCount: deps.modelCount(),
		...models === void 0 || models.length === 0 ? {} : { models: models.map((model) => model.image === true ? model : {
			...model,
			disabled: blocked.includes(model.id)
		}) },
		...blocked.length === 0 ? {} : { blockedModels: [...blocked] },
		...credential.maskedPhone === void 0 ? {} : { account: credential.maskedPhone }
	};
	try {
		const points = await deps.points();
		if (points === void 0) return status;
		return {
			...status,
			points: {
				permanent: points.permanent,
				daily: points.daily,
				...points.updatedAt === void 0 ? {} : { updatedAt: points.updatedAt }
			}
		};
	} catch (error) {
		return {
			...status,
			pointsError: safeMessage(error)
		};
	}
}
/** The status route's request handler, extracted so tests can mount it on a bare server. */
function loomyStatusHandler(deps) {
	return async (req, res) => {
		if (req.method !== "GET") {
			json(res, 405, { error: "method not allowed" });
			return;
		}
		if (!loopbackRequest(req)) {
			json(res, 403, { error: "request-not-trusted" });
			return;
		}
		const url = new URL(req.url ?? "/", "http://localhost");
		try {
			json(res, 200, await loomyWebStatus(deps, url.searchParams.get("refresh") === "1"));
		} catch (error) {
			json(res, 500, { error: safeMessage(error) });
		}
	};
}
/** Mount the GET status route on an optional webServer context. */
function registerLoomyStatusRoute(ctx, deps) {
	ctx.effect(() => {
		const dispose = ctx.webServer.register({
			kind: "exact",
			path: LOOMY_STATUS_PATH,
			handler: loomyStatusHandler(deps)
		});
		return () => {
			dispose();
		};
	}, "dsh-loomy-connect: Web status route");
}
//#endregion
//#region src/index.ts
const name = "llm-loomy";
const inject = ["llm"];
/**
* Runtime config schema. cordis resolves a loader entry's config through this
* schema before calling `apply`.
*
* DSH 0.2.x only exposes fields marked `.volatile()` to the settings forms,
* and commits a live edit into the running config reference instead of
* remounting the plugin. The two paths are therefore read through
* {@link readField} on every request rather than copied into a closure.
*/
const Config = Schema.object({
	authFile: Schema.string().description("Loomy desktop auth file (defaults to the app's own location)").volatile(),
	configFile: Schema.string().description("Loomy model configuration file (defaults to the app's own location)").volatile(),
	disabledModels: Schema.array(Schema.string()).description("Model ids to hide from DSH; toggled on the plugin page").default([]).volatile()
});
/**
* Read a config field whether the loader handed us the plain value or the
* volatile reference DSH 0.2.x commits edits into.
*/
function readField(value) {
	if (value === void 0) return void 0;
	return typeof value.get === "function" ? value.get() : value;
}
/** Minimum gap between two forced refreshes; each one costs an upstream call. */
const REFRESH_THROTTLE_MS = 5e3;
/**
* Whether every edited path belongs to the disabled-model switch.
*
* Such an edit changes only which of the already-discovered models the provider
* exposes, so it applies without re-reading Loomy. An empty path list is not
* considered here — the caller filters that out first.
*/
function touchesOnlyDisabled(paths) {
	return paths.every((path) => path[0] === "disabledModels");
}
function apply(ctx, config = {}) {
	const authFile = () => readField(config.authFile);
	const configFile = () => readField(config.configFile);
	const disabledModels = () => {
		const value = readField(config.disabledModels);
		if (!Array.isArray(value)) return [];
		return value.filter((id) => typeof id === "string" && id !== "");
	};
	const settingsNs = ctx.fiber?.entry?.options?.id ?? "llm-loomy";
	const catalog = new LoomyCatalog();
	catalog.setBlocked(disabledModels());
	const shim = createLoomyShim({
		catalog,
		authFile,
		logger: ctx.logger
	});
	ctx.inject(["webServer"], (webCtx) => registerLoomyStatusRoute(webCtx, {
		credential: async () => {
			try {
				return await readLoomyCredential(authFile());
			} catch {
				return;
			}
		},
		points: () => readLoomyPoints(),
		modelCount: () => catalog.current().length,
		blockedModels: () => [...disabledModels()],
		models: () => catalog.all().map((model) => ({
			id: model.id,
			name: model.name,
			...model.rate === void 0 ? {} : { rate: model.rate },
			...model.promo === void 0 ? {} : { promo: model.promo },
			...model.image === true ? { image: true } : {},
			...model.contextWindow === void 0 ? {} : { contextWindow: model.contextWindow }
		})),
		refresh: async () => {
			const now = Date.now();
			if (now - lastRefresh < REFRESH_THROTTLE_MS) return;
			lastRefresh = now;
			resetLoomyPointsCache();
			await reapply?.();
		}
	}));
	let reapply;
	let lastRefresh = 0;
	let closed = false;
	const ownerFiber = ctx.fiber;
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ownerFiber));
	});
	ctx.effect(() => ctx.on("loader/volatile-update", ((paths) => {
		if (paths.length === 0) return;
		catalog.setBlocked(disabledModels());
		reapply?.(!touchesOnlyDisabled(paths));
	})));
	ctx.effect(() => () => {
		closed = true;
		shim.close();
	});
	shim.ready.then(async () => {
		if (closed) return;
		const loomy = createLoomyAdapter(catalog, shim);
		const releaseAdapter = ctx.llm.registerAdapter([LOOMY_PROVIDER], loomy.adapter);
		const releaseDirectory = ctx.llm.registerConfigurableProviders([{
			provider: LOOMY_PROVIDER,
			displayName: "Loomy",
			settingsNs,
			settingsPath: [],
			declared: false
		}]);
		ctx.effect(() => () => {
			releaseAdapter();
			releaseDirectory();
		});
		reapply = async (refreshCatalog = true) => {
			if (closed) return;
			if (!refreshCatalog) {
				loomy.invalidate();
				return;
			}
			try {
				try {
					await catalog.refreshFromApi(await readLoomyCredential(authFile()));
				} catch {
					await catalog.refreshFromFile(configFile());
				}
				loomy.invalidate();
			} catch (error) {
				ctx.logger.warn("dsh-loomy-connect: using fallback catalog; unable to read Loomy model configuration", error);
			}
		};
		await reapply();
	}).catch((error) => ctx.logger.error("dsh-loomy-connect: failed to start loopback gateway", error));
}
//#endregion
export { Config, LOOMY_API_BASE, LOOMY_AUTH_SESSION_KEY, LOOMY_ENTRY_ID, LOOMY_PACKAGE, LOOMY_POINTS_KEY, LOOMY_PROVIDER, LOOMY_STATUS_PATH, LoomyCatalog, LoomyUpstreamClient, apply, createLoomyAdapter, createLoomyShim, defaultLoomyAuthPath, defaultLoomyConfigPath, defaultLoomyLocalStorageDir, extractLoomyAuthSessions, extractLoomyPoints, inject, loomyStatusHandler, loomyWebStatus, loopbackHost, loopbackOrigin, name, newestLoomyPoints, parseLoomyApiModels, parseLoomyAuth, parseLoomyModels, parseLoomyPointsRecord, prepareLoomyBody, readLoomyCredential, readLoomyPoints, readLoomySessionFromStorage, registerLoomyStatusRoute, resetLoomyPointsCache, resolveAuthFile };
