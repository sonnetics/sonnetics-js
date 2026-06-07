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

The key config is in [`vite.config.ts`](./vite.config.ts):

- `build.target: "esnext"` — allows top-level `await` in `main.ts`
- `optimizeDeps.exclude: ["@sonnetics/core"]` — keeps Vite from pre-bundling the
  WASM glue module

WASM is fetched at runtime from jsDelivr by `@sonnetics/js`; no WASM plugins needed.
