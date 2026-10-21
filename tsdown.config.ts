import { defineConfig, type UserConfig } from 'tsdown'

const PLUGIN_ID = 'dsh-loomy-connect'

/**
 * The DSH host resolves this bundle from `lib/`, so the output directory and
 * the file extensions have to match package.json's `main`/`types` exactly —
 * tsdown's defaults would otherwise land on `dist/index.mjs`.
 *
 * Every DSH/pi-ai package is provided by the host at runtime and must never be
 * inlined, or the plugin would ship a second copy of the LLM seam.
 */
const host: UserConfig = {
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  fixedExtension: false,
  dts: true,
  clean: true,
  deps: {
    neverBundle: [
      '@earendil-works/pi-ai',
      '@deepseek-ai/cordis',
      '@deepseek-ai/dsh-attachment',
      '@deepseek-ai/dsh-host-webserver',
      '@deepseek-ai/dsh-llm',
      '@deepseek-ai/dsh-llm-pi-ai',
      '@deepseek-ai/dsh-settings',
      '@deepseek-ai/schemastery',
    ],
  },
}

/**
 * The browser half. DSH's module loader hands the bundle a `require` shim and
 * reads `module.exports`, so the output is CJS wrapped in the loader call and
 * keeps React and every DSH client package external.
 */
const client: UserConfig = {
  entry: { client: 'src/client/index.tsx' },
  outDir: 'lib',
  format: ['cjs'],
  platform: 'browser',
  dts: false,
  clean: false,
  deps: {
    neverBundle: [
      'react',
      'react/jsx-runtime',
      '@deepseek-ai/cordis',
      '@deepseek-ai/dsh-client-locale',
      '@deepseek-ai/dsh-client-ui-primitives',
      '@deepseek-ai/dsh-client-ui-renderer',
      '@deepseek-ai/dsh-client-ui-plugin-manager',
      '@deepseek-ai/dsh-client-ui-settings',
      '@deepseek-ai/dsh-client-ui-settings-models',
      '@deepseek-ai/dsh-client-ui-slots',
    ],
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default defineConfig([host, client])
