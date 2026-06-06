# Sonnetics Vanilla JS Demo

No install required. The demo loads `@sonnetics/js` directly from CDN via an
[import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap).

## Run

```bash
npx serve .
```

Then open the URL shown (usually http://localhost:3000).

Any static file server works:

```bash
python3 -m http.server
```

## How it works

See [`main.js`](./main.js) -- the entire Sonnetics integration is a few lines.
No bundler config needed because the import map handles everything.
