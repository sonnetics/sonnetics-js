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

- `transpilePackages: ["@sonnetics/js"]` — lets Next.js compile the ESM package
- `resolve.fallback` for Node built-ins — prevents webpack from choking on
  Node.js-only code paths in the library (never called in the browser)

WASM is fetched at runtime from jsDelivr by `@sonnetics/js`; no `syncWebAssembly`
or manual `public/` copy needed.

The component is wrapped in `dynamic(() => import(...), { ssr: false })` because
the Web Audio API is browser-only. The `Detector.create()` call happens inside
`useEffect` to avoid top-level await in a React component.
