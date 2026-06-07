# Sonnetics JS Demos

| Demo | Stack | Bundler config needed? | Key file to look at |
|---|---|---|---|
| [vanilla](./vanilla) | Plain HTML + JS (import map) | No | `index.html` |
| [vite](./vite) | Vite + TypeScript | Minimal — `vite.config.ts` | `vite.config.ts` |
| [next](./next) | Next.js + React | Minimal — `next.config.ts` | `next.config.ts` |
| [snippets](./snippets) | API reference patterns | — | Any `.ts` file |

## Why bundler config is needed

`@sonnetics/js` depends on `@sonnetics/core` which is a WebAssembly module built with
`wasm-pack --target web`. The `.wasm` binary is fetched at runtime from jsDelivr CDN
(the version is pinned at build time), so **bundlers never need to process the `.wasm`
file themselves**.

The only remaining config is:

- **Vite**: `optimizeDeps.exclude: ["@sonnetics/core"]` — prevents Vite's esbuild
  pre-bundler from mangling the WASM glue module.

- **Next.js**: `transpilePackages: ["@sonnetics/js"]` (needed because the package is
  pure ESM) + `resolve.fallback` stubs for Node built-ins that `@sonnetics/js` imports
  dynamically (guarded by an `isNode()` check, but webpack still resolves them
  statically in the client bundle).
