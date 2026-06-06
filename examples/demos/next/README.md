# Sonnetics Next.js Demo

## Setup

```sh
npm install
```

## Run

```sh
npm run dev
```

## How it works

The key config is in [`next.config.ts`](./next.config.ts):

- `transpilePackages: ["@sonnetics/js"]` -- lets Next.js compile the ESM package
- `syncWebAssembly: true` -- required for `@sonnetics/core` WASM module
- `resolve.fallback` for `fs/promises` -- prevents webpack from choking on
  Node.js-only code paths in the library

The component is wrapped in `dynamic(() => import(...), { ssr: false })` because
the Web Audio API is browser-only. The `Detector.create()` call happens inside
`useEffect` to avoid top-level await in a React component.
