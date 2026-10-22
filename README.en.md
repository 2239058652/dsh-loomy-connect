# DSH Loomy Connect

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[简体中文](README.md) | English

> **Derivative notice**: this project is a fork of [gdrpzym/dsh-loomy-connect](https://github.com/gdrpzym/dsh-loomy-connect), upstream baseline `0.2.0` (MIT, original copyright held by `gdrpzym`), adapted here to DSH 0.2.1. See [FORK.md](FORK.md) for the change list and licensing.

Exposes the text models bundled with the **Loomy** desktop app to [DeepSeek Harness](https://github.com/deepseek-ai) (DSH), without an API key.

The plugin reads Loomy's on-disk sign-in session and model manifest read-only. Nothing is copied, uploaded, or rewritten.

| Contribution | Surface | Description |
|---|---|---|
| Model provider | Host | Registers a `loomy` provider; the model list is discovered from Loomy at startup |
| Settings card | Browser | Two tabs — **Account** and **Models** — under **Settings → Plugin configuration**: Account shows sign-in state, masked phone, and credit balance; Models renders a table of each model's name, context window, and rate, with image models sorted last |

## Contents

- [Derivative notice (FORK.md)](FORK.md)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Security model](#security-model)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)
- [Further documentation](#further-documentation)
- [License](#license)
- [Disclaimer](#disclaimer)
- [Acknowledgments](#acknowledgments)

## Features

- **Zero configuration**: once installed and enabled, Loomy's models appear directly in DSH's model selector.
- **Model auto-discovery**: the account's model list is fetched at startup; only models with text output are served.
- **Rates and promos**: the plugin page's **Models** tab lists every model with its points multiplier (`x3.0`) and flags limited-time free ones, following Loomy's own numbers.
- **Account and credits**: the page's status row shows the signed-in account (masked phone); the **Points** tab shows long-lived and daily credits — read from the same data Loomy's own UI renders from.
- **Model details**: the **Models** tab renders a three-column table of each model's name, context window (when Loomy's list provides it), and points rate; image models are listed after the chat models.
- **Models-page status bar**: the Loomy card under Settings → Models shows sign-in state and the permanent balance inline.
- **Bilingual**: UI copy follows the DSH interface language.

## Where it appears (DSH 0.2.1)

| Location | Content |
|---|---|
| Settings → Plugins → **DSH Loomy Connect** | Account, points, model table, manual refresh |
| That plugin's **llm-loomy** row → configuration page | `authFile` / `configFile` overrides, saved and applied live |
| Settings → Models → **Loomy** card | Compact status line (sign-in, permanent points, refresh) |

## Installation

| | |
|---|---|
| **Loomy desktop app** | Installed and signed in at least once |
| **DeepSeek Harness** | `>= 0.2.1-rc.2 < 0.3.0` |
| **Node.js** | `>= 22.19` |
| **pnpm** | Required. `dsh plugin` manages profile dependencies through pnpm; having only npm is not enough |

### From GitHub (recommended)

```sh
dsh plugin --profile web add github:2239058652/dsh-loomy-connect
dsh web
```

This repository commits its build output in `lib/`, so installing does **not** run a build — no tsdown or TypeScript needed.

Without a global `dsh`, replace `dsh` with either of the following (both only fetch dsh itself; the plugin install still goes through pnpm):

```sh
npx @deepseek-ai/dsh plugin --profile web add github:2239058652/dsh-loomy-connect
pnpm dlx @deepseek-ai/dsh plugin --profile web add github:2239058652/dsh-loomy-connect
```

### From a local checkout (when editing code)

```sh
git clone https://github.com/2239058652/dsh-loomy-connect.git
cd dsh-loomy-connect
pnpm install
pnpm run build          # only needed after editing src/; output goes to lib/
dsh plugin --profile web add /absolute/path/to/dsh-loomy-connect
dsh web
```

Verifying:

```sh
dsh --profile web --dump-config     # expect an `llm-loomy` entry
```

`--dump-config` only composes the config tree; it does not instantiate the plugin. To confirm the plugin actually boots, run `dsh web` and check for **Loomy** in the model selector.

## Configuration

Paths are auto-detected per platform, so configuration is normally unnecessary. The overrides below target non-standard installs.

| Variable | Overrides |
|---|---|
| `LOOMY_AUTH_FILE` | Sign-in session `auth-session.json` path |
| `LOOMY_CONFIG_FILE` | Model manifest `opencode.json` path |
| `LOOMY_LOCAL_STORAGE_DIR` | Credits cache `Local Storage/leveldb` directory |

Resolution order per lookup: **plugin config (`authFile` / `configFile`) → environment variable → detected default**.

Default paths are probed across macOS and Windows; the first existing path wins:

| Platform | Sign-in session | Model manifest | Credits cache |
|---|---|---|---|
| Windows | `%APPDATA%/loomy/auth-session.json` | `%APPDATA%/loomy-opencode/opencode.json` | `%APPDATA%/loomy/Local Storage/leveldb` |

## Security model

| Boundary | Mechanism |
|---|---|
| Network exposure | Gateway binds `127.0.0.1` only |
| Client authentication | Per-process random secret, compared with `timingSafeEqual` |
| DNS rebinding | `Host` must be loopback |
| Cross-site simple requests | `Origin`, when sent, must be loopback; request body must be `application/json` |
| Token custody | The Loomy session token is read from disk inside the gateway per request; DSH never holds it |

Threat model: protects against other local processes and against web pages running in the user's browser. It does **not** protect against code running as the same user, which can read the same files the plugin reads.

## Known limitations

- Depends on Loomy's client interface (not an official public API); Loomy updates may require plugin changes.
- The model list and its rates come from Loomy's API; when it is unreachable the plugin falls back to Loomy's generated config, and only then to a built-in snapshot.
- Credits are read from Loomy's local cache — Loomy exposes no credits endpoint. When no cache exists the card omits credits rather than showing 0.
- The model manifest is read at startup; restart DSH after Loomy adds or removes models.
- If the sign-in path is not detected on Windows, set `LOOMY_AUTH_FILE` explicitly.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Card never appears under Plugin configuration | Host half did not register the namespace; see item 4 in [docs/internals.en.md](docs/internals.en.md#browser-half) |
| Plugin listed under Plugins but no card | Same as above — the Plugins tab reflects installed entries, not served namespaces |
| `Cannot read properties of undefined (reading 'authFile')` at boot | Missing runtime `Config` export; see [docs/internals.en.md](docs/internals.en.md#cordis-config-schema) |
| Card shows "not signed in" though Loomy is signed in | Session path not detected; set `LOOMY_AUTH_FILE` |
| `502` on every chat request | Gateway could not read a valid session, usually a path detection problem |
| Model list is stale | Restart DSH or trigger a settings change |
| Credits empty | Loomy has not cached a summary yet, or `LOOMY_LOCAL_STORAGE_DIR` is wrong |

## Further documentation

Architecture, gateway, and browser-card constraints are documented in [docs/internals.en.md](docs/internals.en.md) (中文版 [docs/internals.md](docs/internals.md)).

## License

[MIT](LICENSE)

## Disclaimer

- This project is for **personal learning and research only**. It drives your own Loomy account on your own machine. Do not use it commercially or beyond reasonable personal use.
- You must comply with the Loomy terms of service. Any consequence of using this project — including account restrictions, depleted credits, or service interruption — is yours to bear.
- The author is not liable for any direct or indirect loss arising from the use or misuse of this project.
- This project is not affiliated with, endorsed by, or sponsored by Loomy, iFlytek, or DeepSeek. Product names are used to describe compatibility only; trademarks belong to their respective owners.

## Acknowledgments

- [gdrpzym/dsh-loomy-connect](https://github.com/gdrpzym/dsh-loomy-connect) (MIT): the upstream baseline `0.2.0` this fork derives from, and the origin of the provider registration, loopback gateway, credential parsing, model catalog, and credits reading.
- The DSH provider architecture follows [dsh-workbuddy-connect](https://github.com/corrinehu/dsh-workbuddy-connect) (MIT).
