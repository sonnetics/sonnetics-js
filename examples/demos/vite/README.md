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

- `vite-plugin-wasm` -- handles the `@sonnetics/core` WASM file with correct
  MIME types during dev and build
- `vite-plugin-top-level-await` -- allows the `await Detector.create()` at the
  module top level
- Alias for `@sonnetics/core` -- resolves the JS shim directly so Vite can
  serve the `.wasm` file alongside it
