# Sonnetics Vite Demo

## Setup

```sh
npm install
```

## Run

```sh
npm run dev
```

## How it works

The key config is in [`vite.config.ts`](./vite.config.ts) — Vite needs an alias
for `@sonnetics/core` so it resolves the JS shim instead of trying to bundle
the wasm-pack output path directly.
